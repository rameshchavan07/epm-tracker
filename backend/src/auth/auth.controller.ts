import {
  Controller,
  Get,
  Post,
  UseGuards,
  Body,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService, UserWithoutPassword } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
    role: string;
  };
}

export interface LoginResponse {
  access_token: string;
  user: UserWithoutPassword;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() req: LoginDto): Promise<LoginResponse> {
    let user: UserWithoutPassword | null = null;

    if (req.email && req.password) {
      user = await this.authService.validateUser(req.email, req.password);
    } else if (req.userId) {
      user = await this.authService.loginById(req.userId);
    }

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.authService.login(user);
  }

  @Post('register')
  async register(@Body() req: RegisterDto): Promise<UserWithoutPassword> {
    return await this.authService.registerAdmin(req);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(
    @Request() req: AuthenticatedRequest,
  ): Promise<UserWithoutPassword | null> {
    return await this.authService.getProfile(req.user.userId);
  }
}
