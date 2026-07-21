import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && await bcrypt.compare(pass, user.passwordHash)) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id, companyId: user.companyId, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }

  async registerAdmin(data: any) {
    // Only for bootstrapping - creates a company and an admin user
    let company = await this.prisma.company.findFirst();
    if (!company) {
      company = await this.prisma.company.create({
        data: { name: 'Demo Company' }
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const user = await this.usersService.createUser({
      email: data.email,
      name: data.name,
      passwordHash,
      role: 'ADMIN',
      company: { connect: { id: company.id } }
    });

    const { passwordHash: _, ...result } = user;
    return result;
  }
}
