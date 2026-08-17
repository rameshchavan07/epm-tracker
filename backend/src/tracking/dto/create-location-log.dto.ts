import { IsNumber, IsOptional, IsString, IsNotEmpty } from 'class-validator';

export class CreateLocationLogDto {
  @IsString()
  @IsOptional()
  employeeCode?: string;

  @IsString()
  @IsOptional()
  employee_code?: string;

  @IsString()
  @IsOptional()
  mobileUserId?: string;

  @IsString()
  @IsOptional()
  deviceId?: string;

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
  timestamp: number;
}
