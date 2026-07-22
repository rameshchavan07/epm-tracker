import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { MobileUsersService } from './mobile-users.service';
import { RegisterMobileUserDto } from './dto/register-mobile-user.dto';
import { UpdateMobileUserDto } from './dto/update-mobile-user.dto';
import { MobileUser } from '@prisma/client';

@Controller('mobile-users')
export class MobileUsersController {
  constructor(private readonly mobileUsersService: MobileUsersService) {}

  @Post('register')
  async register(@Body() dto: RegisterMobileUserDto): Promise<MobileUser> {
    return await this.mobileUsersService.upsertDevice(dto);
  }

  @Get()
  async findAll(): Promise<MobileUser[]> {
    return await this.mobileUsersService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<MobileUser | null> {
    return await this.mobileUsersService.findById(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateMobileUserDto,
  ): Promise<MobileUser> {
    return await this.mobileUsersService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<MobileUser> {
    return await this.mobileUsersService.delete(id);
  }
}
