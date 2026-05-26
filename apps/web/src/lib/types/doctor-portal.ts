import type { Appointment, AppointmentType } from './appointment';

export interface DoctorMe {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  specialization: string | null;
  licenseNumber: string;
  whatsappNumber: string | null;
  isAvailableHouseCall: boolean;
  isAvailableTeleConsult: boolean;
  isAvailableMedicalVisit: boolean;
  user: {
    id: string;
    email: string;
    phone: string | null;
    isActive: boolean;
  };
}

export interface DoctorStats {
  todayCount: number;
  weeklyCount: number;
  completedToday: number;
  nextAppointment: Appointment | null;
}

export interface DoctorAvailabilitySlot {
  id: string;
  doctorId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  appointmentType: AppointmentType;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DoctorAvailabilitySlotInput {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  appointmentType: AppointmentType;
  isActive: boolean;
}
