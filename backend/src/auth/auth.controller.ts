import { Controller, Request, Post, UseGuards, Body, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() req: Record<string, any>) {
    const user = await this.authService.validateUser(req.email, req.password);
    if (!user) {
      throw new UnauthorizedException();
    }
    return this.authService.login(user);
  }

  @Post('register')
  async register(@Body() req: Record<string, any>) {
    return this.authService.registerAdmin(req);
  }
}
