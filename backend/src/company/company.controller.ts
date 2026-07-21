import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { CompanyService } from './company.service';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('company')
@UseGuards(JwtAuthGuard)
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Get('profile')
  async getProfile() {
    return this.companyService.getProfile();
  }

  @Patch('profile')
  async updateProfile(@Body() dto: UpdateCompanyDto) {
    return this.companyService.updateProfile(dto);
  }
}
