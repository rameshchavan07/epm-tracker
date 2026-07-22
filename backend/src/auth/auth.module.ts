import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { AuthController } from './auth.controller';

import { TrackingModule } from '../tracking/tracking.module';

@Module({
  imports: [
    UsersModule,
    TrackingModule,
    PassportModule,
    JwtModule.register({
      secret:
        process.env.JWT_SECRET || 'fallback-secret-key-do-not-use-in-prod',
      signOptions: { expiresIn: '60m' },
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
