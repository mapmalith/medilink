import { Role, AppointmentType, AppointmentStatus, PaymentStatus, PaymentMethod } from './enums.js';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface User {
  id: string;
  email: string;
  phone?: string;
  role: Role;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Appointment {
  id: string;
  appointmentType: AppointmentType;
  status: AppointmentStatus;
  patientId: string;
  doctorId?: string;
  hotelId?: string;
  bookedBy: Role;
  scheduledDate: Date;
  scheduledTime: Date;
  duration: number;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  amountCharged?: number;
  currency: string;
  isRescheduled: boolean;
  rescheduleCount: number;
  createdAt: Date;
  updatedAt: Date;
}
