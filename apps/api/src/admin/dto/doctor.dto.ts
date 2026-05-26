import {
  IsString,
  IsEmail,
  IsOptional,
  IsBoolean,
  IsInt,
  IsEnum,
  IsArray,
  MinLength,
  Min,
  Max,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AppointmentType } from '@prisma/client';

export class CreateDoctorDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsOptional()
  @IsString()
  specialization?: string;

  @IsString()
  licenseNumber!: string;

  @IsOptional()
  @IsString()
  whatsappNumber?: string;

  @IsOptional()
  @IsBoolean()
  isAvailableHouseCall?: boolean;

  @IsOptional()
  @IsBoolean()
  isAvailableTeleConsult?: boolean;

  @IsOptional()
  @IsBoolean()
  isAvailableMedicalVisit?: boolean;
}

export class UpdateDoctorDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  specialization?: string;

  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @IsOptional()
  @IsString()
  whatsappNumber?: string;

  @IsOptional()
  @IsBoolean()
  isAvailableHouseCall?: boolean;

  @IsOptional()
  @IsBoolean()
  isAvailableTeleConsult?: boolean;

  @IsOptional()
  @IsBoolean()
  isAvailableMedicalVisit?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AvailabilitySlotDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'startTime must be in HH:mm format' })
  startTime!: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'endTime must be in HH:mm format' })
  endTime!: string;

  @IsEnum(AppointmentType)
  appointmentType!: AppointmentType;

  @IsBoolean()
  isActive!: boolean;
}

export class BulkAvailabilityDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilitySlotDto)
  slots!: AvailabilitySlotDto[];
}
