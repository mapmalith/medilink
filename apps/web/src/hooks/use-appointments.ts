import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  Appointment,
  AppointmentDetail,
  AppointmentFilters,
  AppointmentStatus,
  AvailableSlot,
  RescheduleHistoryEntry,
} from '@/lib/types/appointment';

const APPOINTMENTS_KEY = ['admin', 'appointments'];

function buildQueryString(filters: AppointmentFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function useAppointmentSearch(query: string) {
  return useQuery<Appointment[]>({
    queryKey: [...APPOINTMENTS_KEY, 'search', query],
    queryFn: async () => {
      const { data } = await api.get('/appointments/search', {
        params: { q: query },
      });
      return data.data;
    },
    enabled: query.trim().length >= 2,
  });
}

export function useAppointmentList(filters: AppointmentFilters = {}) {
  return useQuery<Appointment[]>({
    queryKey: [...APPOINTMENTS_KEY, filters],
    queryFn: async () => {
      const { data } = await api.get(
        `/admin/appointments${buildQueryString(filters)}`,
      );
      return data.data;
    },
  });
}

export function useAppointment(id: string) {
  return useQuery<AppointmentDetail>({
    queryKey: [...APPOINTMENTS_KEY, id],
    queryFn: async () => {
      const { data } = await api.get(`/admin/appointments/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useUpdateAppointmentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      cancellationReason,
    }: {
      id: string;
      status: AppointmentStatus;
      cancellationReason?: string;
    }) => {
      const { data } = await api.patch(`/admin/appointments/${id}/status`, {
        status,
        cancellationReason,
      });
      return data.data as Appointment;
    },
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: APPOINTMENTS_KEY });
      const previous = queryClient.getQueriesData<Appointment[]>({
        queryKey: APPOINTMENTS_KEY,
      });
      queryClient.setQueriesData<Appointment[]>(
        { queryKey: APPOINTMENTS_KEY },
        (old) => {
          if (!Array.isArray(old)) return old;
          return old.map((a) => (a.id === id ? { ...a, status } : a));
        },
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        for (const [key, data] of ctx.previous) {
          queryClient.setQueryData(key, data);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: APPOINTMENTS_KEY });
    },
  });
}

export function useAssignDoctor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      doctorId,
    }: {
      id: string;
      doctorId: string;
    }) => {
      const { data } = await api.patch(
        `/admin/appointments/${id}/assign-doctor`,
        { doctorId },
      );
      return data.data as Appointment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: APPOINTMENTS_KEY });
    },
  });
}

export interface RescheduleInput {
  id: string;
  newDate: string; // yyyy-MM-dd
  newTime: string; // full ISO datetime
  newTimeSlotId?: string;
  newDoctorId?: string;
  reason: string;
}

export function useRescheduleAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: RescheduleInput) => {
      const { data } = await api.post(
        `/appointments/${id}/reschedule`,
        body,
      );
      return data.data as Appointment;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: APPOINTMENTS_KEY });
      queryClient.invalidateQueries({
        queryKey: ['appointments', variables.id, 'reschedule-history'],
      });
    },
  });
}

export function useRescheduleHistory(id: string | null | undefined) {
  return useQuery<RescheduleHistoryEntry[]>({
    queryKey: ['appointments', id, 'reschedule-history'],
    queryFn: async () => {
      const { data } = await api.get(
        `/appointments/${id}/reschedule-history`,
      );
      return data.data;
    },
    enabled: !!id,
  });
}

export function useAvailableSlots(
  appointmentId: string | null | undefined,
  date: string | null | undefined,
  doctorId?: string,
) {
  return useQuery<AvailableSlot[]>({
    queryKey: ['appointments', appointmentId, 'available-slots', date, doctorId],
    queryFn: async () => {
      const params = new URLSearchParams({ date: date! });
      if (doctorId) params.set('doctorId', doctorId);
      const { data } = await api.get(
        `/appointments/${appointmentId}/available-slots?${params.toString()}`,
      );
      return data.data;
    },
    enabled: !!appointmentId && !!date,
  });
}
