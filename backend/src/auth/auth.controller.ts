import {
  Controller,
  Get,
  Post,
  UseGuards,
  Body,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { TrackingService } from '../tracking/tracking.service';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
    companyId: string;
    role: string;
  };
}

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private trackingService: TrackingService,
  ) {}

  @Post('login')
  async login(@Body() req: LoginDto) {
    let user;

    if (req.email && req.password) {
      user = await this.authService.validateUser(req.email, req.password);
    } else if (req.userId) {
      if (req.userId.length === 4) {
        user = await this.authService.loginByShortId(req.userId);
      } else {
        user = await this.authService.loginById(req.userId);
      }
    }

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (req.latitude && req.longitude) {
      await this.trackingService.processSingle({
        userId: user.id,
        latitude: req.latitude,
        longitude: req.longitude,
        deviceId: req.deviceId || 'unknown',
        accuracy: 10,
        timestamp: Date.now(),
      });
    }

    return this.authService.login(user);
  }

  @Post('register')
  async register(@Body() req: RegisterDto) {
    return this.authService.registerAdmin(req);
  }

  @Post('device-register')
  async registerDevice() {
    return this.authService.registerDeviceUser();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req: AuthenticatedRequest) {
    return this.authService.getProfile(req.user.userId);
  }
}
