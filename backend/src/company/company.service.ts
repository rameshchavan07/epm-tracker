import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateCompanyDto } from './dto/update-company.dto';

export interface CompanyConfig {
  id: string;
  name: string;
  subscriptionPlan: string;
  trackingInterval: number;
  status: boolean;
}

@Injectable()
export class CompanyService {
  constructor(private prisma: PrismaService) {}

  async getProfile(): Promise<CompanyConfig> {
    let company = await this.prisma.company.findFirst();
    if (!company) {
      company = await this.prisma.company.create({
        data: {
          name: 'EPM Tracker Enterprise',
          subscriptionPlan: 'PRO',
          trackingInterval: 2,
          status: true,
        },
      });
    }
    return company;
  }

  async updateProfile(dto: UpdateCompanyDto): Promise<CompanyConfig> {
    const existing = await this.prisma.company.findFirst();
    if (!existing) {
      return await this.prisma.company.create({
        data: {
          name: dto.name ?? 'EPM Tracker Enterprise',
          subscriptionPlan: dto.subscriptionPlan ?? 'PRO',
          trackingInterval: dto.trackingInterval ?? 2,
          status: true,
        },
      });
    }

    return await this.prisma.company.update({
      where: { id: existing.id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.subscriptionPlan && { subscriptionPlan: dto.subscriptionPlan }),
        ...(dto.trackingInterval !== undefined && {
          trackingInterval: dto.trackingInterval,
        }),
      },
    });
  }
}
