import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompanyService {
  constructor(private prisma: PrismaService) {}

  async getProfile() {
    const company = await this.prisma.company.findFirst();
    if (!company) {
      throw new NotFoundException('Company not found');
    }
    return company;
  }

  async updateProfile(dto: UpdateCompanyDto) {
    const company = await this.getProfile();
    return this.prisma.company.update({
      where: { id: company.id },
      data: dto,
    });
  }
}
