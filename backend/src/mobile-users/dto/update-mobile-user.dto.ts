import { IsOptional, IsString, IsBoolean } from 'class-validator';

export class UpdateMobileUserDto {
  @IsString()
  @IsOptional()
  userId?: string;

  @IsBoolean()
  @IsOptional()
  status?: boolean;
}
