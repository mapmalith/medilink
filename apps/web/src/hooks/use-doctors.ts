import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Doctor, DoctorDetail, DoctorAvailability, AppointmentSummary } from '@/lib/types/doctor';

const DOCTORS_KEY = ['admin', 'doctors'];

export function useDoctorList() {
  return useQuery<Doctor[]>({
    queryKey: DOCTORS_KEY,
    queryFn: async () => {
      const { data } = await api.get('/admin/doctors');
      return data.data;
    },
  });
}

export function useDoctor(id: string) {
  return useQuery<DoctorDetail>({
    queryKey: [...DOCTORS_KEY, id],
    queryFn: async () => {
      const { data } = await api.get(`/admin/doctors/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useCreateDoctor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      email: string;
      password: string;
      phone?: string;
      firstName: string;
      lastName: string;
      specialization?: string;
      licenseNumber: string;
      whatsappNumber?: string;
      isAvailableHouseCall?: boolean;
      isAvailableTeleConsult?: boolean;
      isAvailableMedicalVisit?: boolean;
    }) => {
      const { data } = await api.post('/admin/doctors', dto);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DOCTORS_KEY });
    },
  });
}

export function useUpdateDoctor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...dto
    }: {
      id: string;
      email?: string;
      phone?: string;
      firstName?: string;
      lastName?: string;
      specialization?: string;
      licenseNumber?: string;
      whatsappNumber?: string;
      isAvailableHouseCall?: boolean;
      isAvailableTeleConsult?: boolean;
      isAvailableMedicalVisit?: boolean;
      isActive?: boolean;
    }) => {
      const { data } = await api.patch(`/admin/doctors/${id}`, dto);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DOCTORS_KEY });
    },
  });
}

export function useDeleteDoctor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/admin/doctors/${id}`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DOCTORS_KEY });
    },
  });
}

export function useDoctorAvailability(id: string) {
  return useQuery<DoctorAvailability[]>({
    queryKey: [...DOCTORS_KEY, id, 'availability'],
    queryFn: async () => {
      const { data } = await api.get(`/admin/doctors/${id}/availability`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useReplaceAvailability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      slots,
    }: {
      id: string;
      slots: {
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        appointmentType: string;
        isActive: boolean;
      }[];
    }) => {
      const { data } = await api.put(`/admin/doctors/${id}/availability`, {
        slots,
      });
      return data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...DOCTORS_KEY, variables.id],
      });
    },
  });
}

export function useDoctorAppointments(id: string, page: number) {
  return useQuery<{
    appointments: AppointmentSummary[];
    total: number;
    page: number;
    limit: number;
  }>({
    queryKey: [...DOCTORS_KEY, id, 'appointments', page],
    queryFn: async () => {
      const { data } = await api.get(
        `/admin/doctors/${id}/appointments?page=${page}&limit=10`,
      );
      return data.data;
    },
    enabled: !!id,
  });
}
