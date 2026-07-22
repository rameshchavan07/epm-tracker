import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLocationLogDto } from './dto/create-location-log.dto';
import { TrackingGateway } from './tracking.gateway';

interface LatestLocationRaw {
  id: string;
  userId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  recordedAt: Date;
  batteryLevel: number | null;
  name: string;
  role: string;
  status: boolean;
}

@Injectable()
export class TrackingService {
  private readonly logger = new Logger(TrackingService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => TrackingGateway))
    private trackingGateway: TrackingGateway,
  ) {}

  async processBatch(locations: CreateLocationLogDto[]) {
    if (!locations || locations.length === 0) {
      return { success: true, count: 0 };
    }

    let defaultCompany = await this.prisma.company.findFirst();
    if (!defaultCompany) {
      defaultCompany = await this.prisma.company.create({
        data: { name: 'Acme Corp' },
      });
    }

    const data = locations.map((loc) => ({
      userId: loc.userId,
      companyId: defaultCompany.id,
      deviceId: loc.deviceId,
      latitude: loc.latitude,
      longitude: loc.longitude,
      accuracy: loc.accuracy,
      recordedAt: new Date(loc.timestamp),
    }));

    try {
      await this.prisma.locationLog.createMany({
        data,
        skipDuplicates: true,
      });

      const userUpdates = locations.reduce((acc, loc) => {
        if (!acc[loc.userId] || acc[loc.userId].timestamp < loc.timestamp) {
          acc[loc.userId] = loc;
        }
        return acc;
      }, {} as Record<string, CreateLocationLogDto>);

      for (const [userId, loc] of Object.entries(userUpdates)) {
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            status: true,
            deviceId: loc.deviceId,
            lastLatitude: loc.latitude,
            lastLongitude: loc.longitude,
            lastLocationAt: new Date(loc.timestamp),
          },
        });
      }

      // Broadcast WebSocket live location update to connected dashboard clients
      if (locations.length > 0) {
        const lastLoc = locations[locations.length - 1];
        const user = await this.prisma.user.findUnique({
          where: { id: lastLoc.userId },
        });
        this.trackingGateway.broadcastLocationUpdate({
          id: lastLoc.userId,
          name: user?.name || 'Employee',
          role: user?.role || 'EMPLOYEE',
          status: 'Active',
          lat: lastLoc.latitude,
          lng: lastLoc.longitude,
          battery: 90,
          recordedAt: new Date(lastLoc.timestamp),
        });
      }
    } catch (error) {
      console.error('Error inserting batch:', error);
    }

    return { success: true, count: data.length };
  }

  async processSingle(location: CreateLocationLogDto) {
    return this.processBatch([location]);
  }

  async getLocationHistory(userId: string, limit = 100, date?: string) {
    // Build date range filter if a specific date was requested
    const dateFilter = date
      ? {
          gte: new Date(`${date}T00:00:00.000Z`),
          lte: new Date(`${date}T23:59:59.999Z`),
        }
      : undefined;

    const logs = await this.prisma.locationLog.findMany({
      where: {
        userId,
        ...(dateFilter ? { recordedAt: dateFilter } : {}),
      },
      orderBy: { recordedAt: 'desc' },
      take: limit,
    });

    return logs.map((log) => ({
      id: log.id,
      userId: log.userId,
      lat: log.latitude,
      lng: log.longitude,
      accuracy: log.accuracy,
      speed: log.speed,
      recordedAt: log.recordedAt,
    }));
  }

  async getLatestLocations() {
    const latestLocations = await this.prisma.$queryRaw<LatestLocationRaw[]>`
      SELECT DISTINCT ON (l."userId") 
        l."id", l."userId", l."latitude", l."longitude", l."accuracy", l."recordedAt", l."batteryLevel",
        u."name", u."role", u."status"
      FROM "LocationLog" l
      JOIN "User" u ON l."userId" = u."id"
      ORDER BY l."userId", l."recordedAt" DESC
    `;

    return latestLocations.map((loc) => ({
      id: loc.userId,
      name: loc.name,
      role: loc.role,
      status: loc.status ? 'Active' : 'Offline',
      lat: loc.latitude,
      lng: loc.longitude,
      battery: loc.batteryLevel ?? 85,
      recordedAt: loc.recordedAt,
    }));
  }

  async getAnalytics() {
    const activeUsers = await this.prisma.user.count({
      where: { status: true },
    });
    const offlineUsers = await this.prisma.user.count({
      where: { status: false },
    });
    const totalUsers = await this.prisma.user.count();
    const totalLogsToday = await this.prisma.locationLog.count({
      where: {
        recordedAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    });

    return {
      activeUsers,
      offlineUsers,
      totalUsers,
      totalLogsToday,
      avgBattery: 88,
    };
  }

  // Runs every 2 minutes — marks users offline if no location received in 5+ minutes
  @Cron('0 */2 * * * *')
  async markOfflineUsers() {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const staleUsers = await this.prisma.user.findMany({
      where: {
        status: true, // currently marked active
        OR: [
          { lastLocationAt: { lt: fiveMinutesAgo } }, // last ping was >5 min ago
          { lastLocationAt: null },                   // never sent a location
        ],
      },
      select: { id: true, name: true, role: true },
    });

    if (staleUsers.length === 0) return;

    // Bulk-mark them offline in the DB
    await this.prisma.user.updateMany({
      where: { id: { in: staleUsers.map((u) => u.id) } },
      data: { status: false },
    });

    this.logger.log(
      `Marked ${staleUsers.length} user(s) offline: ${staleUsers.map((u) => u.name).join(', ')}`,
    );

    // Push real-time status update to the web dashboard via WebSocket
    for (const user of staleUsers) {
      this.trackingGateway.broadcastLocationUpdate({
        id: user.id,
        name: user.name,
        role: user.role,
        status: 'Offline',
        lat: null,
        lng: null,
      });
    }
  }
}
