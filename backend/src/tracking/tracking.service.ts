import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLocationLogDto } from './dto/create-location-log.dto';
import { TrackingGateway } from './tracking.gateway';
import { LocationLog } from '@prisma/client';

export interface LocationHistoryItem {
  id: string;
  deviceId: string;
  lat: number;
  lng: number;
  accuracy: number | null;
  address?: string | null;
  intervalMinutes?: number | null;
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
  address?: string | null;
  intervalMinutes?: number | null;
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
    const intervalMinutes = 2;
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

  private async reverseGeocodeOSM(lat: number, lng: number): Promise<string | null> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        { headers: { 'User-Agent': 'EPM-Tracker/1.0' } }
      );
      if (response.ok) {
        const data: any = await response.json();
        return data.display_name || null;
      }
    } catch {
      // Ignore network errors or rate limits for OSM fallback
    }
    return null;
  }

  async processBatch(locations: CreateLocationLogDto[]) {
    if (!locations || locations.length === 0) {
      return { success: true, count: 0 };
    }

    let processedCount = 0;

    for (const loc of locations) {
      try {
        const recordedAt = new Date(loc.timestamp);
        let address = loc.address || null;

        if (!address) {
          address = await this.reverseGeocodeOSM(loc.latitude, loc.longitude);
        }

        // 1. Find or create MobileUser with sequential User ID (USR-1001, USR-1002...)
        let mobileUser = await this.prisma.mobileUser.findUnique({
          where: { deviceId: loc.deviceId },
        });

        if (mobileUser) {
          mobileUser = await this.prisma.mobileUser.update({
            where: { deviceId: loc.deviceId },
            data: {
              status: true,
            },
          });
        } else {
          const generatedUserId = await this.generateSequentialUserId();
          mobileUser = await this.prisma.mobileUser.create({
            data: {
              deviceId: loc.deviceId,
              userId: loc.mobileUserId || generatedUserId,
              status: true,
            },
          });
        }

        // 2. Insert LocationLog
        const intervalMinutes = loc.intervalMinutes ?? 2;
        await this.prisma.locationLog.create({
          data: {
            deviceId: loc.deviceId,
            latitude: loc.latitude,
            longitude: loc.longitude,
            accuracy: loc.accuracy ?? null,
            ...(address ? { address } : {}),
            intervalMinutes,
            recordedAt,
          } as any,
        });

        processedCount++;

        // 3. Broadcast WebSocket update to web dashboard
        this.trackingGateway.broadcastLocationUpdate({
          id: mobileUser.deviceId,
          deviceId: mobileUser.deviceId,
          name: mobileUser.userId,
          status: 'Active',
          lat: loc.latitude,
          lng: loc.longitude,
          address,
          intervalMinutes,
          battery: 100,
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

    const mobileUser = await this.prisma.mobileUser.findFirst({
      where: {
        OR: [{ deviceId: identifier }, { userId: identifier }],
      },
    });

    const targetDeviceId = mobileUser ? mobileUser.deviceId : identifier;

    const logs: LocationLog[] = await this.prisma.locationLog.findMany({
      where: {
        deviceId: targetDeviceId,
        ...(dateFilter ? { recordedAt: dateFilter } : {}),
      },
      orderBy: { recordedAt: 'desc' },
      take: limit,
    });

    return logs.map((log: any) => ({
      id: log.id,
      deviceId: log.deviceId,
      lat: log.latitude,
      lng: log.longitude,
      accuracy: log.accuracy,
      address: log.address ?? null,
      intervalMinutes: log.intervalMinutes ?? 2,
      recordedAt: log.recordedAt,
    }));
  }

  async getLatestLocations(): Promise<LatestLocationItem[]> {
    const mobileUsers = await this.prisma.mobileUser.findMany({
      include: {
        locationLogs: {
          orderBy: { recordedAt: 'desc' },
          take: 1,
        },
      },
    });

    return mobileUsers
      .filter((user) => user.locationLogs.length > 0)
      .map((user) => {
        const latestLog: any = user.locationLogs[0];
        return {
          id: user.deviceId,
          deviceId: user.deviceId,
          userId: user.userId,
          name: user.userId,
          status: user.status ? 'Active' : 'Offline',
          lat: latestLog.latitude,
          lng: latestLog.longitude,
          address: latestLog.address ?? null,
          intervalMinutes: latestLog.intervalMinutes ?? 2,
          battery: 90,
          recordedAt: latestLog.recordedAt,
        };
      });
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
      },
      include: {
        locationLogs: {
          orderBy: { recordedAt: 'desc' },
          take: 1,
        },
      },
    });

    const devicesToMarkOffline = staleDevices.filter((device) => {
      if (device.locationLogs.length === 0) return true;
      return device.locationLogs[0].recordedAt < fiveMinutesAgo;
    });

    if (devicesToMarkOffline.length === 0) return;

    const staleDeviceIds = devicesToMarkOffline.map((d) => d.deviceId);
    await this.prisma.mobileUser.updateMany({
      where: { deviceId: { in: staleDeviceIds } },
      data: { status: false },
    });

    const deviceNames = devicesToMarkOffline
      .map((d) => d.userId || d.deviceId)
      .join(', ');
    this.logger.log(
      `Marked ${devicesToMarkOffline.length} device(s) offline: ${deviceNames}`,
    );

    for (const device of devicesToMarkOffline) {
      const displayName = device.userId || device.deviceId;
      this.trackingGateway.broadcastLocationUpdate({
        id: device.deviceId,
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
      select: { deviceId: true, userId: true },
    });

    if (!device) return;

    await this.prisma.mobileUser.update({
      where: { deviceId: device.deviceId },
      data: { status: false },
    });

    this.trackingGateway.broadcastLocationUpdate({
      id: device.deviceId,
      deviceId: device.deviceId,
      name: device.userId || device.deviceId,
      status: 'Offline',
      lat: null,
      lng: null,
    });
  }
}
