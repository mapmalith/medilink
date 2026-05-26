import { z } from 'zod';

export const createAppointmentSchema = z.object({
  type: z.enum(['HOUSE_CALL', 'TELE_CONSULTATION', 'MEDICAL_VISIT']),
  scheduledAt: z.string().datetime('Invalid date format'),
  notes: z.string().max(1000).optional(),
});

export const rescheduleAppointmentSchema = z.object({
  appointmentId: z.string().uuid('Invalid appointment ID'),
  newScheduledAt: z.string().datetime('Invalid date format'),
  reason: z.string().min(1, 'Reason is required').max(500),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type RescheduleAppointmentInput = z.infer<
  typeof rescheduleAppointmentSchema
>;
