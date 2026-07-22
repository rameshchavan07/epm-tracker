import { IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';

export class RegisterMobileUserDto {
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsNumber()
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @IsOptional()
  longitude?: number;
}
