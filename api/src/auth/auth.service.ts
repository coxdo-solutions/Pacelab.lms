import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { RedisService } from '../redis/redis.service'; // <-- add this

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private redisService: RedisService, // <-- inject redis
  ) {}

  async validateUser(email: string, password: string) {
    console.log('🔑 Validating user:', email);

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      console.log('❌ User not found');
      return null;
    }

    const passwordValid = await bcrypt.compare(password, user.password);
    console.log('🔒 Password valid:', passwordValid);

    if (!passwordValid) return null;

    // Remove sensitive field
    const { password: _pw, ...safe } = user;
    return safe;
  }

  async login(user: any) {
    console.log('✅ Login success for:', user.email);

    const payload = { sub: user.id, email: user.email, role: user.role };

    // Sign JWT with expiry
    const token = this.jwtService.sign(payload, {
      expiresIn: '1h',
    });

    // Save session in Redis with TTL = 1 hour
    await this.redisService.set(`session:${user.id}`, { token, user }, 3600);

    console.log('🎟️ JWT generated and session cached for:', user.email);

    return {
      access_token: token,
      user,
    };
  }

  async logout(userId: string) {
    await this.redisService.del(`session:${userId}`);
    console.log('🛑 Session cleared for user:', userId);
    return { message: 'Logged out successfully' };
  }
}
