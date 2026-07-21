import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLocationLogDto } from './dto/create-location-log.dto';

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
  constructor(private prisma: PrismaService) {}

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

      const userIds = Array.from(new Set(locations.map((l) => l.userId)));
      await this.prisma.user.updateMany({
        where: { id: { in: userIds } },
        data: { status: true },
      });
    } catch (error) {
      console.error('Error inserting batch:', error);
    }

    return { success: true, count: data.length };
  }

  async processSingle(location: CreateLocationLogDto) {
    return this.processBatch([location]);
  }

  async getLocationHistory(userId: string, limit = 100) {
    const logs = await this.prisma.locationLog.findMany({
      where: { userId },
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
}
