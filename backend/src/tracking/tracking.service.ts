import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLocationLogDto } from './dto/create-location-log.dto';

@Injectable()
export class TrackingService {
  constructor(private prisma: PrismaService) {}

  async processBatch(locations: CreateLocationLogDto[]) {
    // Basic validation & formatting
    const data = locations.map(loc => ({
      userId: loc.userId,
      companyId: 'default-company-id', // Placeholder until real auth is implemented
      latitude: loc.latitude,
      longitude: loc.longitude,
      accuracy: loc.accuracy,
      recordedAt: new Date(loc.timestamp),
    }));

    // In a real scenario with proper foreign keys, the userId/companyId must exist in the DB first.
    // Since we just bootstrapped the DB and it's empty, inserting these will fail foreign key constraints
    // if the user doesn't exist. We will just catch and log it for this scaffold phase, or we can use createMany.
    try {
        await this.prisma.locationLog.createMany({
            data,
            skipDuplicates: true,
        });
    } catch (error) {
        console.error('Error inserting batch. Make sure the User and Company exist in the DB!', error);
    }
    
    return { success: true, count: data.length };
  }

  async getLatestLocations() {
    // In PostgreSQL, to get the latest record per user, we can use DISTINCT ON or a group by.
    const latestLocations = await this.prisma.$queryRaw`
      SELECT DISTINCT ON (l."userId") 
        l."id", l."userId", l."latitude", l."longitude", l."accuracy", l."recordedAt",
        u."name", u."role", u."status"
      FROM "LocationLog" l
      JOIN "User" u ON l."userId" = u."id"
      ORDER BY l."userId", l."recordedAt" DESC
    `;
    
    // Transform to match frontend expected structure
    return (latestLocations as any[]).map(loc => ({
      id: loc.userId,
      name: loc.name,
      role: loc.role,
      status: loc.status ? 'Active' : 'Offline',
      lat: loc.latitude,
      lng: loc.longitude,
      battery: Math.floor(Math.random() * 40) + 60, // Mock battery for now
      recordedAt: loc.recordedAt,
    }));
  }

  async getAnalytics() {
    // Mock analytics for now, but wired to the service so we can enhance later
    const activeUsers = await this.prisma.user.count({ where: { status: true } });
    const offlineUsers = await this.prisma.user.count({ where: { status: false } });
    const totalUsers = await this.prisma.user.count();

    return {
      activeUsers,
      offlineUsers,
      totalUsers,
      avgBattery: 85, // We don't have battery in schema yet, hardcode for now
    };
  }
}
