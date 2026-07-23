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
  async markOffline(@Body() body: { deviceId: string }) {
    return this.trackingService.markOfflineExplicit(body.deviceId);
  }

  @Post('location/batch')
  @HttpCode(HttpStatus.OK)
  async syncBatch(@Body() locations: CreateLocationLogDto[]) {
    return this.trackingService.processBatch(locations);
  }

  @Get('latest')
  async getLatestLocations() {
    return this.trackingService.getLatestLocations();
  }

  @Get('history/:userId')
  @UseGuards(JwtAuthGuard)
  async getLocationHistory(
    @Param('userId') userId: string,
    @Query('limit') limit?: string,
    @Query('date') date?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 100;
    return this.trackingService.getLocationHistory(userId, limitNum, date);
  }

  @Get('config')
  async getTrackingConfig() {
    return this.trackingService.getTrackingConfig();
  }

  @Get('analytics')
  async getAnalytics() {
    return this.trackingService.getAnalytics();
  }
}
