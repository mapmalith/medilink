import {
  IsDateString,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class RescheduleAppointmentDto {
  /**
   * New scheduled date (ISO 8601 date, e.g. "2026-04-12").
   */
  @IsDateString()
  newDate!: string;

  /**
   * New scheduled time as a full ISO datetime (e.g. "2026-04-12T14:30:00.000Z").
   */
  @IsDateString()
  newTime!: string;

  /**
   * For tele-consultation only — the TimeSlot being booked. Releases the old
   * slot and binds the appointment to the new one. The doctor is inferred from
   * the slot, so the slot's doctor overrides any previous assignment.
   */
  @IsOptional()
  @IsString()
  newTimeSlotId?: string;

  /**
   * For house-call / medical-visit only — optionally change the assigned doctor.
   */
  @IsOptional()
  @IsString()
  newDoctorId?: string;

  @IsString()
  @MinLength(3)
  reason!: string;
}

export class AvailableSlotsQueryDto {
  /**
   * Date to look up available slots for (ISO date, e.g. "2026-04-12").
   */
  @IsDateString()
  date!: string;

  /**
   * Optional — restrict to a specific doctor.
   */
  @IsOptional()
  @IsString()
  doctorId?: string;
}
