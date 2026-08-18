import { IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';

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
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  accuracy?: number;

  @IsString()
  @IsOptional()
  address?: string;

  @IsNumber()
  @IsOptional()
  timestamp?: number;
}
