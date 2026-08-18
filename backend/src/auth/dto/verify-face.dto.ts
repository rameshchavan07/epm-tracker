import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsNumber } from 'class-validator';

export class VerifyFaceDto {
  @IsString()
  @IsOptional()
  employeeCode?: string;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @IsString()
  @IsNotEmpty()
  faceImage: string;

  @IsBoolean()
  @IsOptional()
  isLogout?: boolean;

  @IsString()
  @IsOptional()
  event?: string;

  @IsNumber()
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @IsOptional()
  longitude?: number;
}
