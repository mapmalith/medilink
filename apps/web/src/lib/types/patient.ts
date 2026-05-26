export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  nationality: string | null;
  passportNumber: string | null;
  whatsappNumber: string | null;
  emailAddress: string | null;
  dateOfBirth: string | null;
  user: {
    email: string;
    phone: string | null;
    isActive: boolean;
  };
  hotel: {
    id: string;
    name: string;
  } | null;
  appointmentsCount: number;
  lastVisit: string | null;
  createdAt: string;
}

export interface PatientMedicalRecord {
  id: string;
  diagnosis: string | null;
  notes: string | null;
  followUpRequired: boolean;
  followUpDate: string | null;
  followUpNotes: string | null;
  createdAt: string;
  doctor: {
    firstName: string;
    lastName: string;
    specialization: string | null;
  };
  appointment: {
    id: string;
    appointmentType: string;
    scheduledDate: string;
  };
}

export interface PatientConsent {
  id: string;
  consentType: string;
  consentText: string;
  givenAt: string;
  isWithdrawn: boolean;
  withdrawnAt: string | null;
  ipAddress: string | null;
}

export interface PatientDetail {
  id: string;
  firstName: string;
  lastName: string;
  nationality: string | null;
  passportNumber: string | null;
  whatsappNumber: string | null;
  emailAddress: string | null;
  dateOfBirth: string | null;
  hotelId: string | null;
  createdAt: string;
  user: {
    email: string;
    phone: string | null;
    isActive: boolean;
  };
  hotel: {
    id: string;
    name: string;
  } | null;
  medicalRecords: PatientMedicalRecord[];
  consents: PatientConsent[];
}

export interface PatientAppointment {
  id: string;
  appointmentType: 'HOUSE_CALL' | 'TELE_CONSULTATION' | 'MEDICAL_VISIT';
  status: string;
  scheduledDate: string;
  scheduledTime: string;
  doctor: {
    firstName: string;
    lastName: string;
    specialization: string | null;
  } | null;
}
