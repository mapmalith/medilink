export interface DashboardStats {
  appointmentsToday: number;
  appointmentsWeek: number;
  appointmentsMonth: number;
  pendingPayments: number;
  activeDoctors: number;
  activeHotels: number;
  revenueToday: number;
  revenueMonth: number;
}

export interface TodaysAppointment {
  id: string;
  appointmentType: string;
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

export interface RecentActivityItem {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  createdAt: string;
  user: {
    email: string;
  } | null;
}
