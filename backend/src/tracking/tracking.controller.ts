import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TrackingService } from './tracking.service';
import { CreateLocationLogDto } from './dto/create-location-log.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('tracking')
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @Post('location')
  @HttpCode(HttpStatus.OK)
  async syncSingle(@Body() location: CreateLocationLogDto) {
    return this.trackingService.processSingle(location);
  }

  @Post('offline')
  @HttpCode(HttpStatus.OK)
  async markOffline(@Body() body: { employeeCode?: string; deviceId?: string; userId?: string }) {
    const code = body.employeeCode || body.userId || body.deviceId || '';
    return this.trackingService.markOfflineExplicit(code);
  }

  @Post('location/batch')
  @HttpCode(HttpStatus.OK)
  async syncBatch(@Body() locations: CreateLocationLogDto[]) {
    return this.trackingService.processBatch(locations);
  }

  @Get('latest')
  @UseGuards(JwtAuthGuard)
  async getLatestLocations() {
    return this.trackingService.getLatestLocations();
  }

  @Get('history/:employeeCode')
  @UseGuards(JwtAuthGuard)
  async getLocationHistory(
    @Param('employeeCode') employeeCode: string,
    @Query('limit') limit?: string,
    @Query('date') date?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 100;
    return this.trackingService.getLocationHistory(employeeCode, limitNum, date);
  }

  @Get('config')
  async getTrackingConfig() {
    return this.trackingService.getTrackingConfig();
  }

  @Post('config')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async updateTrackingConfig(
    @Body()
    body: {
      trackingIntervalMinutes: number;
      faceVerificationIntervalMinutes?: number;
      faceVerificationGracePeriodMinutes?: number;
    },
  ) {
    return this.trackingService.updateTrackingConfig(
      body.trackingIntervalMinutes,
      body.faceVerificationIntervalMinutes,
      body.faceVerificationGracePeriodMinutes,
    );
  }

  @Get('analytics')
  @UseGuards(JwtAuthGuard)
  async getAnalytics() {
    return this.trackingService.getAnalytics();
  }
}
