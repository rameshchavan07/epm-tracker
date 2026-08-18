import {
  Controller,
  Post,
  Body,
  Get,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AuthService, UserWithoutPassword } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { EnrollFaceDto } from './dto/enroll-face.dto';
import { VerifyFaceDto } from './dto/verify-face.dto';
import { EmployeesService } from '../employees/employees.service';
import { FaceRecognitionService, FaceEnrollResult, FaceVerifyResult } from './face-recognition.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private employeesService: EmployeesService,
    private faceRecognitionService: FaceRecognitionService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() req: LoginDto) {
    let user: UserWithoutPassword | null = null;
    if (req.email && req.password) {
      user = await this.authService.validateUser(req.email, req.password);
    }

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.authService.login(user);
  }

  @Post('register')
  @UseGuards(JwtAuthGuard)
  async register(
    @Body()
    body: {
      name: string;
      email: string;
      password: string;
      role?: string;
    },
  ) {
    return this.authService.registerAdmin({
      name: body.name,
      email: body.email,
      password: body.password,
    });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me() {
    return { status: 'ok' };
  }

  @Post('validate-employee')
  @HttpCode(HttpStatus.OK)
  async validateEmployee(@Body() body: { employeeCode: string }) {
    return this.employeesService.validateEmployeeCode(body.employeeCode);
  }

  @Post('enroll-face')
  @HttpCode(HttpStatus.OK)
  async enrollFace(@Body() body: EnrollFaceDto): Promise<FaceEnrollResult> {
    return this.faceRecognitionService.enrollFace(
      body.employeeCode,
      body.deviceId,
      body.faceImage,
      body.latitude,
      body.longitude,
    );
  }

  @Post('verify-face')
  @HttpCode(HttpStatus.OK)
  async verifyFace(@Body() body: VerifyFaceDto): Promise<FaceVerifyResult> {
    const employeeCode = body.employeeCode || body.userId || '';
    const deviceId = body.deviceId || 'unknown';

    if (!body.faceImage) {
      return {
        match: false,
        confidence: 0,
        distance: 1,
        threshold: 0.6,
        message: 'faceImage is required',
      };
    }

    const isLogout = body.isLogout === true || body.event === 'LOGOUT';

    return this.faceRecognitionService.verifyFace(
      employeeCode,
      deviceId,
      body.faceImage,
      isLogout,
      body.latitude,
      body.longitude,
    );
  }
}
