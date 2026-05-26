import type { Appointment } from './appointment';

export interface HotelMe {
  id: string;
  userId: string;
  name: string;
  address: string | null;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  latitude: number | null;
  longitude: number | null;
  creditLimit: number;
  creditUsed: number;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    phone: string | null;
    isActive: boolean;
  };
}

export interface HotelDashboardStats {
  activeAppointments: number;
  completedToday: number;
  creditLimit: number;
  creditUsed: number;
  creditBalance: number;
  todayList: Appointment[];
}

export interface HotelCreditLedgerEntry {
  id: string;
  hotelId: string;
  amount: number;
  type: string;
  description: string;
  appointmentId: string | null;
  balance: number;
  createdAt: string;
  appointment: {
    id: string;
    appointmentType: string;
  } | null;
}

export interface HotelCreditInfo {
  creditLimit: number;
  creditUsed: number;
  creditBalance: number;
}

export interface HotelInvoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  pdfS3Key: string | null;
  pdfUrl: string | null;
  createdAt: string;
  sentViaWhatsApp: boolean;
  sentViaEmail: boolean;
  appointment: {
    id: string;
    appointmentType: string;
    scheduledDate: string;
    patient: {
      firstName: string;
      lastName: string;
    };
  };
}
