import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './jwt.strategy';
import { PrismaModule } from '../prisma/prisma.module';
import { FaceRecognitionService } from './face-recognition.service';
import { EmployeesModule } from '../employees/employees.module';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    PrismaModule,
    EmployeesModule,
    JwtModule.register({
      secret:
        process.env.JWT_SECRET ||
        'ab84b5c7e1263d9154a65b7c89d234a9b6c43d8a5f2e10a7b8e5c1d4a6f2b3e8',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  providers: [AuthService, JwtStrategy, FaceRecognitionService],
  controllers: [AuthController],
  exports: [AuthService, FaceRecognitionService],
})
export class AuthModule {}
