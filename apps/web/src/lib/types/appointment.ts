export type AppointmentType =
  | 'HOUSE_CALL'
  | 'TELE_CONSULTATION'
  | 'MEDICAL_VISIT';

export type AppointmentStatus =
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'RESCHEDULED';

export interface AppointmentPatient {
  id: string;
  firstName: string;
  lastName: string;
  whatsappNumber: string | null;
  nationality: string | null;
}

export interface AppointmentDoctor {
  id: string;
  firstName: string;
  lastName: string;
  specialization: string | null;
}

export interface AppointmentHotel {
  id: string;
  name: string;
}

export interface RescheduledRef {
  id: string;
  scheduledDate: string;
  scheduledTime: string;
}

export interface Appointment {
  id: string;
  appointmentType: AppointmentType;
  status: AppointmentStatus;
  scheduledDate: string;
  scheduledTime: string;
  duration: number;
  amountCharged: number | null;
  currency: string;
  notes: string | null;
  cancellationReason: string | null;
  isRescheduled: boolean;
  rescheduledFromId: string | null;
  rescheduleCount: number;
  visitAddress: string | null;
  visitLatitude: number | null;
  visitLongitude: number | null;
  paymentStatus: string;
  createdAt: string;
  patient: AppointmentPatient;
  doctor: AppointmentDoctor | null;
  hotel: AppointmentHotel | null;
  rescheduledFrom: RescheduledRef | null;
  rescheduledTo: RescheduledRef[];
  medicalRecord: { id: string } | null;
}

export interface RescheduleLogEntry {
  id: string;
  previousDate: string;
  previousTime: string;
  previousDoctorId: string | null;
  newDate: string;
  newTime: string;
  newDoctorId: string | null;
  reason: string;
  rescheduledByUserId: string;
  rescheduledByRole: string;
  createdAt: string;
}

/**
 * Returned by GET /appointments/:id/reschedule-history — includes resolved
 * references to the user who performed the reschedule and the doctors.
 */
export interface RescheduleHistoryEntry extends RescheduleLogEntry {
  rescheduledBy: { id: string; email: string } | null;
  previousDoctor: { id: string; firstName: string; lastName: string } | null;
  newDoctor: { id: string; firstName: string; lastName: string } | null;
}

export interface AvailableSlot {
  id: string;
  doctorId: string;
  date: string;
  startTime: string;
  endTime: string;
  appointmentType: AppointmentType;
  isBooked: boolean;
  doctor: {
    id: string;
    firstName: string;
    lastName: string;
    specialization: string | null;
  };
}

export interface AppointmentDetail extends Appointment {
  rescheduleLogs: RescheduleLogEntry[];
}

export interface AppointmentFilters {
  type?: AppointmentType;
  status?: AppointmentStatus;
  hotelId?: string;
  doctorId?: string;
  startDate?: string;
  endDate?: string;
}

export const APPOINTMENT_TYPE_LABEL: Record<AppointmentType, string> = {
  HOUSE_CALL: 'House Call',
  TELE_CONSULTATION: 'Tele-Consultation',
  MEDICAL_VISIT: 'Medical Visit',
};

export const APPOINTMENT_TYPE_COLOR: Record<AppointmentType, string> = {
  HOUSE_CALL: '#ff6b5a',
  TELE_CONSULTATION: '#3b82f6',
  MEDICAL_VISIT: '#10b981',
};

export const APPOINTMENT_STATUS_LABEL: Record<AppointmentStatus, string> = {
  PENDING_PAYMENT: 'Pending Payment',
  CONFIRMED: 'Confirmed',
  ASSIGNED: 'Doctor Assigned',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
  RESCHEDULED: 'Rescheduled',
};

/**
 * Columns displayed in the Kanban board (6 columns per requirements).
 */
export const KANBAN_COLUMNS: { id: AppointmentStatus; name: string }[] = [
  { id: 'PENDING_PAYMENT', name: 'Pending Payment' },
  { id: 'CONFIRMED', name: 'Confirmed' },
  { id: 'ASSIGNED', name: 'Doctor Assigned' },
  { id: 'IN_PROGRESS', name: 'In Progress' },
  { id: 'COMPLETED', name: 'Completed' },
  { id: 'RESCHEDULED', name: 'Rescheduled' },
];

export const KANBAN_STATUSES = KANBAN_COLUMNS.map((c) => c.id);
