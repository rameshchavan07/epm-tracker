import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { TrackingModule } from './tracking/tracking.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MobileUsersModule } from './mobile-users/mobile-users.module';
import { CompanyModule } from './company/company.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    TrackingModule,
    AuthModule,
    UsersModule,
    MobileUsersModule,
    CompanyModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
