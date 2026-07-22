import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { WebUser } from '@prisma/client';

export type UserWithoutPassword = Omit<WebUser, 'passwordHash'>;

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
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
      role: user.role,
    };
    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }

  async registerAdmin(data: RegisterDto) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const user = await this.usersService.createUser({
      email: data.email,
      name: data.name,
      passwordHash,
      role: 'ADMIN',
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
