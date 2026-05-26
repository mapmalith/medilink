import {
  IsEnum,
  IsNumber,
  IsString,
  IsOptional,
  IsDateString,
  IsBoolean,
  Min,
} from 'class-validator';
import { AppointmentType } from '@prisma/client';

export class CreatePricingDto {
  @IsEnum(AppointmentType)
  appointmentType!: AppointmentType;

  @IsNumber()
  @Min(0.01, { message: 'Price must be greater than 0' })
  price!: number;

  @IsString()
  currency!: string;

  @IsDateString()
  effectiveFrom!: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string;
}

export class UpdatePricingDto {
  @IsOptional()
  @IsEnum(AppointmentType)
  appointmentType?: AppointmentType;

  @IsOptional()
  @IsNumber()
  @Min(0.01, { message: 'Price must be greater than 0' })
  price?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
