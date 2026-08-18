import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class EnrollFaceDto {
  @IsString()
  @IsNotEmpty()
  employeeCode: string;

  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @IsString()
  @IsNotEmpty()
  faceImage: string;

  @IsString()
  @IsOptional()
  registeredBy?: string;

  @IsNumber()
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @IsOptional()
  longitude?: number;
}
