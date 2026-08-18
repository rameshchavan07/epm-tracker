import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { TrackingModule } from './tracking/tracking.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { EmployeesModule } from './employees/employees.module';

@Module({
  imports: [
    // Environment configuration with validation
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // Rate limiting: 60 requests per minute per IP by default
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 60,
        },
      ],
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    TrackingModule,
    AuthModule,
    UsersModule,
    EmployeesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Apply rate limiting globally
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
