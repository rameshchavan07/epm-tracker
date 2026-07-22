import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WebUser, Prisma } from '@prisma/client';

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  createdAt: Date;
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string): Promise<WebUser | null> {
    return await this.prisma.webUser.findUnique({
      where: { email },
    });
  }

  async findById(id: string): Promise<WebUser | null> {
    return await this.prisma.webUser.findUnique({
      where: { id },
    });
  }

  async createUser(data: Prisma.WebUserCreateInput): Promise<WebUser> {
    return await this.prisma.webUser.create({
      data,
    });
  }

  async findAll(): Promise<UserResponse[]> {
    const users = await this.prisma.webUser.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    return users.map((user) => ({
      ...user,
      status: user.status ? 'Active' : 'Inactive',
    }));
  }

  async updateUser(
    id: string,
    data: Prisma.WebUserUpdateInput,
  ): Promise<WebUser> {
    return await this.prisma.webUser.update({
      where: { id },
      data,
    });
  }

  async deleteUser(id: string): Promise<WebUser> {
    return await this.prisma.webUser.delete({
      where: { id },
    });
  }
}
