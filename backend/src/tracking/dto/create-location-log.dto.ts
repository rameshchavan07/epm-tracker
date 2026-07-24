import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateLocationLogDto {
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @IsString()
  @IsOptional()
  mobileUserId?: string;

  @IsNumber()
  @IsNotEmpty()
  latitude: number;

  @IsNumber()
  @IsNotEmpty()
  longitude: number;

  @IsNumber()
  @IsOptional()
  accuracy?: number;

  @IsString()
  @IsOptional()
  address?: string;

  @IsNumber()
  @IsOptional()
  intervalMinutes?: number;

  @IsNumber()
  @IsNotEmpty()
  timestamp: number;
}
