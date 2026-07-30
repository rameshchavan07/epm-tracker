import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { AuthController } from './auth.controller';
import { FaceRecognitionService } from './face-recognition.service';
import { PrismaModule } from '../prisma/prisma.module';

import { TrackingModule } from '../tracking/tracking.module';

@Module({
  imports: [
    UsersModule,
    TrackingModule,
    PassportModule,
    PrismaModule,
    JwtModule.register({
      secret:
        process.env.JWT_SECRET || 'fallback-secret-key-do-not-use-in-prod',
      signOptions: { expiresIn: '60m' },
    }),
  ],
  providers: [AuthService, JwtStrategy, FaceRecognitionService],
  controllers: [AuthController],
  exports: [AuthService, FaceRecognitionService],
})
export class AuthModule {}

