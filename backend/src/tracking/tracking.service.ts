import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLocationLogDto } from './dto/create-location-log.dto';
import { TrackingGateway } from './tracking.gateway';
import { LocationLog } from '@prisma/client';

export interface LocationHistoryItem {
  id: string;
  mobileUserId: string;
  deviceId: string;
  lat: number;
  lng: number;
  accuracy: number | null;
  speed: number | null;
  batteryLevel: number | null;
  recordedAt: Date;
}

export interface LatestLocationItem {
  id: string;
  deviceId: string;
  userId: string;
  name: string;
  status: string;
  lat: number | null;
  lng: number | null;
  battery: number;
  recordedAt: Date | null;
}

export interface AnalyticsResult {
  activeUsers: number;
  offlineUsers: number;
  totalUsers: number;
  totalLogsToday: number;
  avgBattery: number;
}

@Injectable()
export class TrackingService {
  private readonly logger = new Logger(TrackingService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => TrackingGateway))
    private trackingGateway: TrackingGateway,
  ) {}

  async getTrackingConfig() {
    const company = await this.prisma.company.findFirst();
    const intervalMinutes = company?.trackingInterval ?? 2;
    return {
      trackingIntervalMinutes: intervalMinutes,
      trackingIntervalMs: intervalMinutes * 60 * 1000,
    };
  }

  private async generateSequentialUserId(): Promise<string> {
    const count = await this.prisma.mobileUser.count();
    let nextNum = 1001 + count;
    let candidate = `USR-${nextNum}`;

    while (
      await this.prisma.mobileUser.findUnique({ where: { userId: candidate } })
    ) {
      nextNum++;
      candidate = `USR-${nextNum}`;
    }

    return candidate;
  }

  async processBatch(locations: CreateLocationLogDto[]) {
    if (!locations || locations.length === 0) {
      return { success: true, count: 0 };
    }

    let processedCount = 0;

    for (const loc of locations) {
      try {
        const recordedAt = new Date(loc.timestamp);

        // 1. Find or create MobileUser with sequential User ID (USR-1001, USR-1002...)
        let mobileUser = await this.prisma.mobileUser.findUnique({
          where: { deviceId: loc.deviceId },
        });

        if (mobileUser) {
          mobileUser = await this.prisma.mobileUser.update({
            where: { deviceId: loc.deviceId },
            data: {
              latitude: loc.latitude,
              longitude: loc.longitude,
              lastLocationAt: new Date(),
              status: true,
            },
          });
        } else {
          const generatedUserId = await this.generateSequentialUserId();
          mobileUser = await this.prisma.mobileUser.create({
            data: {
              deviceId: loc.deviceId,
              userId: loc.mobileUserId || generatedUserId,
              latitude: loc.latitude,
              longitude: loc.longitude,
              lastLocationAt: new Date(),
              status: true,
            },
          });
        }

        // 2. Insert LocationLog
        await this.prisma.locationLog.create({
          data: {
            mobileUserId: mobileUser.id,
            deviceId: loc.deviceId,
            latitude: loc.latitude,
            longitude: loc.longitude,
            accuracy: loc.accuracy ?? null,
            speed: loc.speed ?? null,
            batteryLevel: loc.batteryLevel ?? null,
            recordedAt,
          },
        });

        processedCount++;

        // 3. Broadcast WebSocket update to web dashboard
        this.trackingGateway.broadcastLocationUpdate({
          id: mobileUser.id,
          deviceId: mobileUser.deviceId,
          name: mobileUser.userId,
          status: 'Active',
          lat: loc.latitude,
          lng: loc.longitude,
          battery: loc.batteryLevel ?? 90,
          recordedAt,
        });
      } catch (error) {
        this.logger.error(
          `Error processing location for ${loc.deviceId}:`,
          error,
        );
      }
    }

    return { 
      success: processedCount > 0 || locations.length === 0, 
      count: processedCount 
    };
  }

  async processSingle(location: CreateLocationLogDto) {
    return await this.processBatch([location]);
  }

  async getLocationHistory(
    identifier: string,
    limit = 100,
    date?: string,
  ): Promise<LocationHistoryItem[]> {
    const dateFilter = date
      ? {
          gte: new Date(`${date}T00:00:00.000Z`),
          lte: new Date(`${date}T23:59:59.999Z`),
        }
      : undefined;

    const logs: LocationLog[] = await this.prisma.locationLog.findMany({
      where: {
        OR: [{ mobileUserId: identifier }, { deviceId: identifier }],
        ...(dateFilter ? { recordedAt: dateFilter } : {}),
      },
      orderBy: { recordedAt: 'desc' },
      take: limit,
    });

    return logs.map((log: LocationLog) => ({
      id: log.id,
      mobileUserId: log.mobileUserId,
      deviceId: log.deviceId,
      lat: log.latitude,
      lng: log.longitude,
      accuracy: log.accuracy,
      speed: log.speed,
      batteryLevel: log.batteryLevel,
      recordedAt: log.recordedAt,
    }));
  }

  async getLatestLocations(): Promise<LatestLocationItem[]> {
    const mobileUsers = await this.prisma.mobileUser.findMany({
      where: {
        latitude: { not: null },
        longitude: { not: null },
      },
      orderBy: { lastLocationAt: 'desc' },
    });

    return mobileUsers.map((user) => ({
      id: user.id,
      deviceId: user.deviceId,
      userId: user.userId,
      name: user.userId,
      status: user.status ? 'Active' : 'Offline',
      lat: user.latitude,
      lng: user.longitude,
      battery: 90,
      recordedAt: user.lastLocationAt,
    }));
  }

  async getAnalytics(): Promise<AnalyticsResult> {
    const activeDevices = await this.prisma.mobileUser.count({
      where: { status: true },
    });
    const offlineDevices = await this.prisma.mobileUser.count({
      where: { status: false },
    });
    const totalDevices = await this.prisma.mobileUser.count();
    const totalLogsToday = await this.prisma.locationLog.count({
      where: {
        recordedAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    });

    return {
      activeUsers: activeDevices,
      offlineUsers: offlineDevices,
      totalUsers: totalDevices,
      totalLogsToday,
      avgBattery: 90,
    };
  }

  // Runs every 2 minutes — marks mobile devices offline if no location received in 5+ minutes
  @Cron('0 */2 * * * *')
  async markOfflineUsers(): Promise<void> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const staleDevices = await this.prisma.mobileUser.findMany({
      where: {
        status: true,
        OR: [
          { lastLocationAt: { lt: fiveMinutesAgo } },
          { lastLocationAt: null },
        ],
      },
      select: { id: true, deviceId: true, userId: true },
    });

    if (staleDevices.length === 0) return;

    const staleIds = staleDevices.map((d) => d.id);
    await this.prisma.mobileUser.updateMany({
      where: { id: { in: staleIds } },
      data: { status: false },
    });

    const deviceNames = staleDevices
      .map((d) => d.userId || d.deviceId)
      .join(', ');
    this.logger.log(
      `Marked ${staleDevices.length} device(s) offline: ${deviceNames}`,
    );

    for (const device of staleDevices) {
      const displayName = device.userId || device.deviceId;
      this.trackingGateway.broadcastLocationUpdate({
        id: device.id,
        deviceId: device.deviceId,
        name: displayName,
        status: 'Offline',
        lat: null,
        lng: null,
      });
    }
  }

  async markOfflineExplicit(deviceId: string) {
    if (!deviceId) return;
    const device = await this.prisma.mobileUser.findUnique({
      where: { deviceId },
      select: { id: true, deviceId: true, userId: true },
    });

    if (!device) return;

    await this.prisma.mobileUser.update({
      where: { id: device.id },
      data: { status: false },
    });

    this.trackingGateway.broadcastLocationUpdate({
      id: device.id,
      deviceId: device.deviceId,
      name: device.userId || device.deviceId,
      status: 'Offline',
      lat: null,
      lng: null,
    });
  }
}
