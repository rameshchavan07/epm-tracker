import { IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateCompanyDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  subscriptionPlan?: string;

  @IsNumber()
  @IsOptional()
  trackingInterval?: number;
}
