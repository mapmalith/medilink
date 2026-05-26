import { AppointmentType, Role } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateAppointmentDto {
  @IsString()
  patientId!: string;

  @IsEnum(AppointmentType)
  appointmentType!: AppointmentType;

  /**
   * Preferred date (yyyy-mm-dd). Required for HOUSE_CALL / MEDICAL_VISIT.
   * For TELE_CONSULTATION it is inferred from the time slot but the client
   * can also pass it for consistency.
   */
  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  /**
   * Preferred time (full ISO datetime). Required for HOUSE_CALL / MEDICAL_VISIT.
   */
  @IsOptional()
  @IsDateString()
  scheduledTime?: string;

  /**
   * For TELE_CONSULTATION only — the TimeSlot to book. Doctor is inferred.
   */
  @IsOptional()
  @IsString()
  timeSlotId?: string;

  /**
   * Optional doctor pre-assignment for HOUSE_CALL / MEDICAL_VISIT.
   */
  @IsOptional()
  @IsString()
  doctorId?: string;

  @IsOptional()
  @IsString()
  visitAddress?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  duration?: number;

  /**
   * Hotel id (only used by ADMIN/CALL_CENTER booking on behalf of a hotel).
   * For HOTEL role this is ignored — the caller's hotel is used.
   */
  @IsOptional()
  @IsString()
  hotelId?: string;

  /**
   * Caller-type override for `bookedBy`. Only honoured for CALL_CENTER role:
   * when call-center staff book on behalf of a hotel, pass `HOTEL`; when
   * booking direct for a patient, pass `PATIENT`. The actual staff user id is
   * always recorded in `createdByStaffId` server-side.
   */
  @IsOptional()
  @IsEnum(Role)
  bookedBy?: Role;
}

export class AvailableSlotsListQueryDto {
  @IsDateString()
  date!: string;

  @IsEnum(AppointmentType)
  appointmentType!: AppointmentType;

  @IsOptional()
  @IsString()
  doctorId?: string;
}
