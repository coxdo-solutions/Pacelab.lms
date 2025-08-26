import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { Redis } from '@upstash/redis';

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client!: Redis;
  private readonly logger = new Logger(RedisService.name);
  private readonly prefix = process.env.REDIS_PREFIX || 'lms'; // key namespace

  async onModuleInit() {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      throw new Error(
        'Upstash Redis envs missing: set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN',
      );
    }

    this.client = new Redis({ url, token });
    this.logger.log('✅ Connected to Upstash Redis (REST)');
  }

  async onModuleDestroy() {
    // Upstash REST client is stateless; nothing to close explicitly.
    this.logger.log('🔌 Upstash Redis client cleanup complete');
  }

  // ---------- Internal helpers ----------

  private k(key: string) {
    return `${this.prefix}:${key}`;
  }

  private serialize(value: unknown): string {
    try {
      return JSON.stringify(value);
    } catch (e) {
      this.logger.warn(`Failed to serialize value for key: ${value}`);
      return String(value);
    }
  }

  private deserialize<T = JsonValue>(raw: string | null): T | null {
    if (raw == null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      // Not JSON; return as-is
      return raw as unknown as T;
    }
  }

  // ---------- Public API ----------

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const val = this.serialize(value);
    if (ttlSeconds && ttlSeconds > 0) {
      await this.client.set(this.k(key), val, { ex: ttlSeconds });
    } else {
      await this.client.set(this.k(key), val);
    }
  }

  async get<T = JsonValue>(key: string): Promise<T | null> {
    const raw = await this.client.get<string>(this.k(key));
    return this.deserialize<T>(raw);
  }

  async del(key: string): Promise<void> {
    await this.client.del(this.k(key));
  }

  async exists(key: string): Promise<boolean> {
    const res = await this.client.exists(this.k(key));
    return res > 0;
  }

  async incr(key: string, by = 1): Promise<number> {
    // Upstash supports incrby
    return this.client.incrby(this.k(key), by);
  }

  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    const res = await this.client.expire(this.k(key), ttlSeconds);
    return res === 1;
  }

  async ttl(key: string): Promise<number> {
    return this.client.ttl(this.k(key));
  }

  /**
   * Cache-aside helper. If key is missing, runs `loader()`,
   * stores the result (JSON), and returns it.
   */
  async getOrSet<T = JsonValue>(
    key: string,
    ttlSeconds: number,
    loader: () => Promise<T>,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const data = await loader();
    await this.set(key, data, ttlSeconds);
    return data;
  }

  /**
   * Health check. Uses ping() if available on the client,
   * otherwise falls back to a set/get/del roundtrip.
   */
  async ping(): Promise<boolean> {
    try {
      const clientAny = this.client as any;

      if (typeof clientAny.ping === 'function') {
        const pong = await clientAny.ping();
        return pong === 'PONG' || pong === 'pong' || pong === 'OK';
      }

      const key = `__healthcheck__${Date.now()}`;
      await this.set(key, '1', 5);
      const val = await this.get<string>(key);
      await this.del(key);
      return val === '1';
    } catch (e) {
      this.logger.error(`Redis ping failed: ${(e as Error).message}`);
      return false;
    }
  }

  /**
   * Upstash REST doesn’t support Pub/Sub. We expose the method
   * but warn so it’s not silently used.
   */
  async publish(_channel: string, _message: unknown): Promise<void> {
    this.logger.warn(
      'Publish/Subscribe is not supported over Upstash REST. Consider Upstash Kafka, WebSockets, or a different Redis transport.',
    );
  }
}

