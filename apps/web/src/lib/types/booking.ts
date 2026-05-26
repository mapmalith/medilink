import type { AppointmentType, AvailableSlot } from './appointment';

export interface PatientSummary {
  id: string;
  firstName: string;
  lastName: string;
  emailAddress: string | null;
  whatsappNumber: string | null;
  passportNumber: string | null;
  nationality: string | null;
  dateOfBirth: string | null;
  hotelId: string | null;
}

export interface CreatePatientInput {
  email: string;
  password: string;
  phone?: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  nationality?: string;
  passportNumber?: string;
  whatsappNumber?: string;
}

export interface CreateAppointmentInput {
  patientId: string;
  appointmentType: AppointmentType;
  scheduledDate?: string;
  scheduledTime?: string;
  timeSlotId?: string;
  doctorId?: string;
  visitAddress?: string;
  notes?: string;
  duration?: number;
  /** Only used by ADMIN/CALL_CENTER booking on behalf of a hotel. */
  hotelId?: string;
  /**
   * Caller-type override, only honoured server-side for CALL_CENTER role.
   * Pass HOTEL when calling on behalf of a hotel, PATIENT when booking
   * directly for a patient (walk-in / direct call).
   */
  bookedBy?: 'HOTEL' | 'PATIENT';
}

export interface CreatedAppointment {
  id: string;
  appointmentType: AppointmentType;
  status: string;
  scheduledDate: string;
  scheduledTime: string;
  duration: number;
  amountCharged: number | null;
  currency: string;
  visitAddress: string | null;
  notes: string | null;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    whatsappNumber: string | null;
    nationality: string | null;
  };
  doctor: {
    id: string;
    firstName: string;
    lastName: string;
    specialization: string | null;
  } | null;
  hotel: { id: string; name: string } | null;
}

export interface PaymentLinkResult {
  appointmentId: string;
  url: string;
  expiry: string;
}

export interface CreditPaymentResult {
  appointmentId: string;
  status: string;
  paymentStatus: string;
  creditUsed: number;
  creditRemaining: number;
}

export type { AvailableSlot };
