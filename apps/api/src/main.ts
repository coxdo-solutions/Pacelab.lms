// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import compression from 'compression';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json, urlencoded } from 'express';

function parseAllowedOrigins(): string[] {
  // Support comma-separated CORS origins via CORS_ORIGIN or single FRONTEND_URL
  const raw = process.env.CORS_ORIGIN ?? process.env.FRONTEND_URL ?? '';
  return raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const isProd = process.env.NODE_ENV === 'production';

  const app = await NestFactory.create(AppModule, {
    // logger: ['error', 'warn', 'log'],
  });

  // Trust proxy for X-Forwarded-* headers (Render/DO/Cloudflare, etc.)
  // @ts-ignore
  app.set('trust proxy', 1);

  // Security headers (relax CSP in dev)
  app.use(
    helmet({
      contentSecurityPolicy: isProd ? undefined : false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      referrerPolicy: { policy: 'no-referrer' },
      frameguard: { action: 'sameorigin' },
    }),
  );

  // Configurable body limits
  const bodyLimit = process.env.UPLOAD_LIMIT ?? '5mb';
  app.use(json({ limit: bodyLimit }));
  app.use(urlencoded({ extended: true, limit: bodyLimit }));

  // Gzip
  app.use(compression());

  // Cookies
  app.use(cookieParser());

  // ---- CORS ----
  const allowlist = parseAllowedOrigins();
  if (allowlist.length) {
    logger.log(`CORS allowlist: ${allowlist.join(', ')}`);
  } else {
    logger.warn('CORS allowlist is empty; allowing no-origin requests only.');
  }

  app.enableCors({
    origin: (origin, callback) => {
      // Allow server-to-server/mobile/curl/SSR (no Origin header)
      if (!origin) return callback(null, true);
      if (!allowlist.length) return callback(null, false);
      if (allowlist.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS: Origin ${origin} not allowed`), false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Content-Disposition'],
  });

  // Global input validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      stopAtFirstError: true,
    }),
  );

  // Optional: mount API under /api
  // app.setGlobalPrefix('api', { exclude: [''] });

  // Swagger (always on; flip to isProd check if you want to hide in prod)
  const swaggerConfig = new DocumentBuilder()
    .setTitle('PaceLab LMS API')
    .setDescription('API documentation for the LMS backend')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
      'bearer',
    )
    .addCookieAuth('token', { type: 'apiKey', in: 'cookie' })
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  // Graceful shutdowns (for containers)
  app.enableShutdownHooks();

  const port = Number(process.env.PORT) || 3001;
  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 LMS Backend running on http://localhost:${port}`);
  logger.log(`📚 Swagger Docs at http://localhost:${port}/api/docs`);
}

bootstrap();

