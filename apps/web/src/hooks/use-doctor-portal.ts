import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import api from '@/lib/api';
import type { Appointment } from '@/lib/types/appointment';
import type {
  DoctorAvailabilitySlot,
  DoctorAvailabilitySlotInput,
  DoctorMe,
  DoctorStats,
} from '@/lib/types/doctor-portal';

const DOCTOR_KEY = ['doctor'];

export interface DoctorAppointmentFilters {
  startDate?: string;
  endDate?: string;
  status?: string;
}

export function useDoctorMe() {
  return useQuery<DoctorMe>({
    queryKey: [...DOCTOR_KEY, 'me'],
    queryFn: async () => {
      const { data } = await api.get('/doctor/me');
      return data.data;
    },
  });
}

export function useDoctorStats() {
  return useQuery<DoctorStats>({
    queryKey: [...DOCTOR_KEY, 'stats'],
    queryFn: async () => {
      const { data } = await api.get('/doctor/stats');
      return data.data;
    },
    refetchInterval: 60_000, // refresh stats every minute (countdown)
  });
}

export function useDoctorAppointments(filters: DoctorAppointmentFilters = {}) {
  return useQuery<Appointment[]>({
    queryKey: [...DOCTOR_KEY, 'appointments', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(filters)) {
        if (value) params.set(key, String(value));
      }
      const qs = params.toString();
      const { data } = await api.get(
        `/doctor/appointments${qs ? `?${qs}` : ''}`,
      );
      return data.data;
    },
  });
}

export function useDoctorAppointment(id: string | null) {
  return useQuery<Appointment>({
    queryKey: [...DOCTOR_KEY, 'appointments', 'one', id],
    queryFn: async () => {
      const { data } = await api.get(`/doctor/appointments/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useDoctorTodayAppointments() {
  return useQuery<Appointment[]>({
    queryKey: [...DOCTOR_KEY, 'appointments', 'today'],
    queryFn: async () => {
      const { data } = await api.get('/doctor/appointments/today');
      return data.data;
    },
  });
}

export function useStartConsultation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/doctor/appointments/${id}/start`);
      return data.data as Appointment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DOCTOR_KEY });
    },
  });
}

export interface CompleteConsultationPayload {
  diagnosis?: string;
  notes?: string;
  followUpRequired: boolean;
  followUpDate?: string;
  followUpNotes?: string;
  prescriptions: {
    drugId: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
  }[];
}

export function useCompleteConsultation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      payload: CompleteConsultationPayload;
    }) => {
      const { data } = await api.post(
        `/doctor/appointments/${input.id}/complete`,
        input.payload,
      );
      return data.data as {
        appointment: Appointment;
        medicalRecordId: string;
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DOCTOR_KEY });
    },
  });
}

export function useDoctorAvailability() {
  return useQuery<DoctorAvailabilitySlot[]>({
    queryKey: [...DOCTOR_KEY, 'availability'],
    queryFn: async () => {
      const { data } = await api.get('/doctor/availability');
      return data.data;
    },
  });
}

export function useReplaceDoctorAvailability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (slots: DoctorAvailabilitySlotInput[]) => {
      const { data } = await api.put('/doctor/availability', { slots });
      return data.data as DoctorAvailabilitySlot[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...DOCTOR_KEY, 'availability'],
      });
    },
  });
}

export function useDeleteDoctorAvailabilitySlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/doctor/availability/${id}`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...DOCTOR_KEY, 'availability'],
      });
    },
  });
}
