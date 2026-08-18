import { Module, Logger } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
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
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret) {
          const logger = new Logger('AuthModule');
          logger.error('JWT_SECRET environment variable is not set!');
          throw new Error(
            'JWT_SECRET must be defined in environment variables. Cannot start without it.',
          );
        }
        return {
          secret,
          signOptions: {
            expiresIn: (configService.get<string>('JWT_EXPIRATION') || '24h') as any,
          },
        };
      },
    }),
  ],
  providers: [AuthService, JwtStrategy, FaceRecognitionService],
  controllers: [AuthController],
  exports: [AuthService, FaceRecognitionService],
})
export class AuthModule {}
