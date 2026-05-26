import { AppointmentStatus, AppointmentType } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';

export class ListHotelAppointmentsQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @IsOptional()
  @IsEnum(AppointmentType)
  appointmentType?: AppointmentType;
}
