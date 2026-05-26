import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AppointmentType } from '@prisma/client';

export class DoctorAvailabilitySlotDto {
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

export class BulkDoctorAvailabilityDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DoctorAvailabilitySlotDto)
  slots!: DoctorAvailabilitySlotDto[];
}
