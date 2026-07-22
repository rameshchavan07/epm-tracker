import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { UsersService, UserResponse } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Prisma, WebUser } from '@prisma/client';

export type WebUserWithoutPassword = Omit<WebUser, 'passwordHash'>;

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll(): Promise<UserResponse[]> {
    return await this.usersService.findAll();
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
  ): Promise<WebUserWithoutPassword | null> {
    const user = await this.usersService.findById(id);
    if (!user) return null;
    const { passwordHash, ...result } = user;
    void passwordHash;
    return result;
  }

  @Post()
  async create(@Body() body: CreateUserDto): Promise<WebUserWithoutPassword> {
    const salt = await bcrypt.genSalt(10);
    const rawPassword = body.password ?? 'password123';
    const passwordHash = await bcrypt.hash(rawPassword, salt);

    const user = await this.usersService.createUser({
      email: body.email,
      name: body.name,
      passwordHash,
      role: body.role ?? 'ADMIN',
    });

    const { passwordHash: unusedHash, ...result } = user;
    void unusedHash;
    return result;
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: UpdateUserDto,
  ): Promise<WebUserWithoutPassword> {
    const updateData: Prisma.WebUserUpdateInput = {};
    if (body.email) updateData.email = body.email;
    if (body.name) updateData.name = body.name;
    if (body.role) updateData.role = body.role;
    if (body.status !== undefined) updateData.status = body.status;

    if (body.password) {
      const salt = await bcrypt.genSalt(10);
      updateData.passwordHash = await bcrypt.hash(body.password, salt);
    }

    const user = await this.usersService.updateUser(id, updateData);
    const { passwordHash: unusedHash, ...result } = user;
    void unusedHash;
    return result;
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<WebUser> {
    return await this.usersService.deleteUser(id);
  }
}
