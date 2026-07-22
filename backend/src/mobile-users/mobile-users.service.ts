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
          ...(latitude !== undefined ? { latitude } : {}),
          ...(longitude !== undefined ? { longitude } : {}),
          ...(latitude !== undefined || longitude !== undefined
            ? { lastLocationAt: now }
            : {}),
          ...(userId ? { userId } : {}),
        },
      });
    }

    const generatedUserId = await this.generateSequentialUserId();
    return await this.prisma.mobileUser.create({
      data: {
        deviceId,
        userId: userId || generatedUserId,
        latitude: latitude || null,
        longitude: longitude || null,
        lastLocationAt: latitude !== undefined ? now : null,
        status: true,
      },
    });
  }

  async findAll(): Promise<MobileUser[]> {
    return await this.prisma.mobileUser.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { locationLogs: true },
        },
      },
    });
  }

  async findByDeviceId(deviceId: string): Promise<MobileUser | null> {
    return await this.prisma.mobileUser.findUnique({
      where: { deviceId },
    });
  }

  async findById(id: string): Promise<MobileUser | null> {
    return await this.prisma.mobileUser.findUnique({
      where: { id },
    });
  }

  async update(id: string, dto: UpdateMobileUserDto): Promise<MobileUser> {
    return await this.prisma.mobileUser.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: string): Promise<MobileUser> {
    return await this.prisma.mobileUser.delete({
      where: { id },
    });
  }
}
