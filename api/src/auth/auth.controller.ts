import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Login with local strategy (email/password)
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req: any) {
    // req.user is attached by LocalStrategy.validate()
    return this.authService.login(req.user);
  }

  // Who am I (needs Bearer token)
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Request() req: any) {
    // if you want more fields, load from DB here by req.user.id
    return req.user;
  }

  // Stateless logout (client deletes token). If you use cookies, clear here.
  @Post('logout')
  async logout() {
    return { ok: true };
  }
}


