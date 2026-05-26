import { useMutation, useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { AppointmentType, AvailableSlot } from '@/lib/types/appointment';
import type {
  CreateAppointmentInput,
  CreatedAppointment,
  CreatePatientInput,
  CreditPaymentResult,
  PatientSummary,
  PaymentLinkResult,
} from '@/lib/types/booking';

export function usePatientSearch(query: string) {
  return useQuery<PatientSummary[]>({
    queryKey: ['patients', 'search', query],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      const { data } = await api.get(`/patients/search?${params.toString()}`);
      return data.data;
    },
    // Debounce lightly by only firing on non-empty queries; show recent patients when empty
    staleTime: 10_000,
  });
}

export function useCreatePatient() {
  return useMutation({
    mutationFn: async (input: CreatePatientInput) => {
      const { data } = await api.post('/patients', input);
      return data.data as PatientSummary;
    },
  });
}

export function useBookingAvailableSlots(
  date: string | null,
  appointmentType: AppointmentType | null,
  doctorId?: string,
) {
  return useQuery<AvailableSlot[]>({
    queryKey: ['booking', 'available-slots', date, appointmentType, doctorId],
    queryFn: async () => {
      const params = new URLSearchParams({
        date: date!,
        appointmentType: appointmentType!,
      });
      if (doctorId) params.set('doctorId', doctorId);
      const { data } = await api.get(
        `/appointments/available-slots?${params.toString()}`,
      );
      return data.data;
    },
    enabled: !!date && appointmentType === 'TELE_CONSULTATION',
  });
}

export function useCreateAppointment() {
  return useMutation({
    mutationFn: async (input: CreateAppointmentInput) => {
      const { data } = await api.post('/appointments', input);
      return data.data as CreatedAppointment;
    },
  });
}

export function useCreatePaymentLink() {
  return useMutation({
    mutationFn: async (appointmentId: string) => {
      const { data } = await api.post('/payments/create-link', {
        appointmentId,
      });
      return data.data as PaymentLinkResult;
    },
  });
}

export function usePayWithCredit() {
  return useMutation({
    mutationFn: async (appointmentId: string) => {
      const { data } = await api.post('/payments/credit', { appointmentId });
      return data.data as CreditPaymentResult;
    },
  });
}
