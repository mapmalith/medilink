import {
  IsOptional,
  IsString,
  IsIn,
  IsDateString,
} from 'class-validator';

export const APPOINTMENT_STATUSES = [
  'PENDING_PAYMENT',
  'CONFIRMED',
  'ASSIGNED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'EXPIRED',
  'RESCHEDULED',
] as const;
export type AppointmentStatusValue = (typeof APPOINTMENT_STATUSES)[number];

export const APPOINTMENT_TYPES = [
  'HOUSE_CALL',
  'TELE_CONSULTATION',
  'MEDICAL_VISIT',
] as const;
export type AppointmentTypeValue = (typeof APPOINTMENT_TYPES)[number];

export class ListAppointmentsQueryDto {
  @IsOptional()
  @IsIn(APPOINTMENT_TYPES)
  type?: AppointmentTypeValue;

  @IsOptional()
  @IsIn(APPOINTMENT_STATUSES)
  status?: AppointmentStatusValue;

  @IsOptional()
  @IsString()
  hotelId?: string;

  @IsOptional()
  @IsString()
  doctorId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class UpdateAppointmentStatusDto {
  @IsIn(APPOINTMENT_STATUSES)
  status!: AppointmentStatusValue;

  @IsOptional()
  @IsString()
  cancellationReason?: string;
}

export class AssignDoctorDto {
  @IsString()
  doctorId!: string;
}
