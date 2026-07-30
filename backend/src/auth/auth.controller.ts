import {
  Controller,
  Get,
  Post,
  UseGuards,
  Body,
  Request,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { AuthService, UserWithoutPassword } from './auth.service';
import {
  FaceRecognitionService,
  FaceEnrollResult,
  FaceVerifyResult,
} from './face-recognition.service';
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
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private authService: AuthService,
    private faceRecognitionService: FaceRecognitionService,
  ) {}

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

  @Post('enroll-face')
  async enrollFace(
    @Body()
    body: {
      userId: string;
      deviceId?: string;
      faceImage?: string;
      faceData?: string;
    },
  ): Promise<FaceEnrollResult> {
    const image = body.faceImage || body.faceData;
    const deviceId = body.deviceId || 'unknown';

    // If face recognition models are loaded and an image is provided, do real enrollment
    if (this.faceRecognitionService.isReady() && image) {
      this.logger.log(
        `Processing face enrollment for user ${body.userId} on device ${deviceId}`,
      );
      return this.faceRecognitionService.enrollFace(
        body.userId,
        deviceId,
        image,
      );
    }

    // Fallback: accept enrollment without face matching (models not loaded)
    this.logger.warn(
      `Face models not ready or no image provided. Accepting enrollment for user ${body.userId} without face matching.`,
    );
    return {
      success: true,
      message: 'Face profile enrolled (without server-side matching)',
      userId: body.userId,
      enrolledAt: new Date().toISOString(),
    };
  }

  @Post('verify-face')
  async verifyFace(
    @Body()
    body: {
      userId: string;
      deviceId: string;
      faceImage: string;
    },
  ): Promise<FaceVerifyResult> {
    if (!body.faceImage || !body.userId) {
      return {
        match: false,
        confidence: 0,
        distance: 1,
        threshold: 0.6,
        message: 'userId and faceImage are required',
      };
    }

    // If face recognition models are loaded, do real verification
    if (this.faceRecognitionService.isReady()) {
      this.logger.log(
        `Processing face verification for user ${body.userId} on device ${body.deviceId}`,
      );
      return this.faceRecognitionService.verifyFace(
        body.userId,
        body.deviceId,
        body.faceImage,
      );
    }

    // Fallback: accept verification without face matching (models not loaded)
    this.logger.warn(
      `Face models not ready. Accepting verification for user ${body.userId} without face matching.`,
    );
    return {
      match: true,
      confidence: 100,
      distance: 0,
      threshold: 0.6,
      message: 'Face verified (without server-side matching — models not loaded)',
    };
  }
}

