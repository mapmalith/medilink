export interface Hotel {
  id: string;
  name: string;
  address: string | null;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  creditLimit: string;
  creditUsed: string;
  qrCodeCount: number;
  user: {
    email: string;
    phone: string | null;
    isActive: boolean;
  };
  createdAt: string;
}

export interface QRCode {
  id: string;
  code: string;
  location: string | null;
  isActive: boolean;
  scanCount: number;
  createdAt: string;
}

export interface CreditLedgerEntry {
  id: string;
  amount: string;
  type: string;
  description: string;
  balance: string;
  appointmentId: string | null;
  appointment: {
    id: string;
    appointmentType: string;
  } | null;
  createdAt: string;
}

export interface HotelAppointment {
  id: string;
  appointmentType: 'HOUSE_CALL' | 'TELE_CONSULTATION' | 'MEDICAL_VISIT';
  status: string;
  scheduledDate: string;
  scheduledTime: string;
  patient: {
    firstName: string;
    lastName: string;
  };
  doctor: {
    firstName: string;
    lastName: string;
  } | null;
}

export interface HotelDetail {
  id: string;
  name: string;
  address: string | null;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  creditLimit: string;
  creditUsed: string;
  user: {
    email: string;
    phone: string | null;
    isActive: boolean;
  };
  qrCodes: QRCode[];
  appointments: HotelAppointment[];
  createdAt: string;
}
