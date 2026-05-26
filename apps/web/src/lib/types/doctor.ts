export interface Doctor {
  id: string;
  firstName: string;
  lastName: string;
  specialization: string | null;
  licenseNumber: string;
  whatsappNumber: string | null;
  isAvailableHouseCall: boolean;
  isAvailableTeleConsult: boolean;
  isAvailableMedicalVisit: boolean;
  user: {
    email: string;
    phone: string | null;
    isActive: boolean;
  };
  createdAt: string;
}

export interface DoctorAvailability {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  appointmentType: 'HOUSE_CALL' | 'TELE_CONSULTATION' | 'MEDICAL_VISIT';
  isActive: boolean;
}

export interface AppointmentSummary {
  id: string;
  appointmentType: 'HOUSE_CALL' | 'TELE_CONSULTATION' | 'MEDICAL_VISIT';
  status: string;
  scheduledDate: string;
  scheduledTime: string;
  patient: {
    firstName: string;
    lastName: string;
  };
}

export interface DoctorDetail extends Doctor {
  availability: DoctorAvailability[];
  appointments: AppointmentSummary[];
}
