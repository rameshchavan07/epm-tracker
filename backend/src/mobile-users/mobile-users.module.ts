import { Module } from '@nestjs/common';
import { MobileUsersService } from './mobile-users.service';
import { MobileUsersController } from './mobile-users.controller';

@Module({
  controllers: [MobileUsersController],
  providers: [MobileUsersService],
  exports: [MobileUsersService],
})
export class MobileUsersModule {}
