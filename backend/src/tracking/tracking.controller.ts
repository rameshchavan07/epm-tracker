import { Controller, Post, Body, HttpCode, HttpStatus, Get } from '@nestjs/common';
import { TrackingService } from './tracking.service';
import { CreateLocationLogDto } from './dto/create-location-log.dto';

@Controller('tracking')
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @Post('location/batch')
  @HttpCode(HttpStatus.OK)
  async syncBatch(@Body() locations: CreateLocationLogDto[]) {
    return this.trackingService.processBatch(locations);
  }

  @Get('latest')
  async getLatestLocations() {
    return this.trackingService.getLatestLocations();
  }

  @Get('analytics')
  async getAnalytics() {
    return this.trackingService.getAnalytics();
  }
}
