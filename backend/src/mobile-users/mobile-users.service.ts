import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterMobileUserDto } from './dto/register-mobile-user.dto';
import { UpdateMobileUserDto } from './dto/update-mobile-user.dto';
import { MobileUser } from '@prisma/client';

@Injectable()
export class MobileUsersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Registers or updates a mobile device without login using ANDROID_ID (deviceId).
   * Ensures zero duplicate records on app uninstall/reinstall.
   */
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

  async upsertDevice(dto: RegisterMobileUserDto): Promise<MobileUser> {
    const { deviceId, userId, latitude, longitude } = dto;
    const now = new Date();

    const existing = await this.prisma.mobileUser.findUnique({
      where: { deviceId },
    });

    if (existing) {
      return await this.prisma.mobileUser.update({
        where: { deviceId },
        data: {
          status: true,
          ...(userId ? { userId } : {}),
        },
      });
    }

    const generatedUserId = await this.generateSequentialUserId();
    return await this.prisma.mobileUser.create({
      data: {
        deviceId,
        userId: userId || generatedUserId,
        status: true,
      },
    });
  }

  async findAll(): Promise<any[]> {
    const devices = await this.prisma.mobileUser.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        locationLogs: {
          orderBy: { recordedAt: 'desc' },
          take: 1,
        },
        _count: {
          select: { locationLogs: true },
        },
      },
    });

    const faceProfiles = await this.prisma.faceProfile.findMany();

    return devices.map((dev) => {
      const lastLog = dev.locationLogs[0];
      const profile = faceProfiles.find(
        (p) => p.userId === dev.userId && p.deviceId === dev.deviceId,
      );
      return {
        deviceId: dev.deviceId,
        userId: dev.userId,
        status: dev.status,
        createdAt: dev.createdAt,
        updatedAt: dev.updatedAt,
        lastLocationAt: lastLog ? lastLog.recordedAt : null,
        _count: dev._count,
        faceProfile: profile ? {
          referenceImage: profile.referenceImage,
          lastLoginImage: profile.lastLoginImage,
          lastVerifiedAt: profile.lastVerifiedAt,
        } : null,
      };
    });
  }

  async findByDeviceId(deviceId: string): Promise<MobileUser | null> {
    return await this.prisma.mobileUser.findUnique({
      where: { deviceId },
    });
  }

  async findById(deviceId: string): Promise<MobileUser | null> {
    return await this.prisma.mobileUser.findUnique({
      where: { deviceId },
    });
  }

  async update(deviceId: string, dto: UpdateMobileUserDto): Promise<MobileUser> {
    return await this.prisma.mobileUser.update({
      where: { deviceId },
      data: dto,
    });
  }

  async delete(deviceId: string): Promise<MobileUser> {
    return await this.prisma.mobileUser.delete({
      where: { deviceId },
    });
  }
}
