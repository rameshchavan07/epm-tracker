import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { User } from '@prisma/client';

export type UserWithoutPassword = Omit<User, 'passwordHash'>;

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async validateUser(
    email: string,
    pass: string,
  ): Promise<UserWithoutPassword | null> {
    const user = await this.usersService.findByEmail(email);
    if (user && (await bcrypt.compare(pass, user.passwordHash))) {
      const { passwordHash, ...result } = user;
      void passwordHash;
      return result;
    }
    return null;
  }

  async loginById(userId: string): Promise<UserWithoutPassword | null> {
    const user = await this.usersService.findById(userId);
    if (user) {
      const { passwordHash, ...result } = user;
      void passwordHash;
      return result;
    }
    return null;
  }

  login(user: UserWithoutPassword) {
    const payload = {
      email: user.email,
      sub: user.id,
      companyId: user.companyId,
      role: user.role,
    };
    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }

  async registerAdmin(data: RegisterDto) {
    let company = await this.prisma.company.findFirst();
    if (!company) {
      company = await this.prisma.company.create({
        data: { name: 'Demo Company' },
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const user = await this.usersService.createUser({
      email: data.email,
      name: data.name,
      passwordHash,
      role: 'ADMIN',
      company: { connect: { id: company.id } },
    });

    const { passwordHash: unusedHash, ...result } = user;
    void unusedHash;
    return result;
  }

  async loginByShortId(shortId: string): Promise<UserWithoutPassword | null> {
    const user = await this.prisma.user.findUnique({
      where: { shortId },
    });
    if (user) {
      const { passwordHash, ...result } = user;
      void passwordHash;
      return result;
    }
    return null;
  }

  async registerDeviceUser() {
    let company = await this.prisma.company.findFirst();
    if (!company) {
      company = await this.prisma.company.create({
        data: { name: 'Demo Company' },
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('device_worker', salt);
    const randomEmail = `worker-${Date.now()}-${Math.floor(Math.random() * 10000)}@epm.com`;

    let shortId = '';
    let isUnique = false;
    while (!isUnique) {
      shortId = Math.floor(1000 + Math.random() * 9000).toString();
      const existing = await this.prisma.user.findUnique({ where: { shortId } });
      if (!existing) isUnique = true;
    }

    const user = await this.usersService.createUser({
      email: randomEmail,
      name: `Field Worker #${shortId}`,
      passwordHash,
      role: 'EMPLOYEE',
      shortId,
      company: { connect: { id: company.id } },
    });

    const { passwordHash: unusedHash, ...result } = user;
    void unusedHash;
    return result;
  }

  async getProfile(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) return null;
    const { passwordHash, ...result } = user;
    void passwordHash;
    return result;
  }
}
