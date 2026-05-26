import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  Patient,
  PatientDetail,
  PatientAppointment,
} from '@/lib/types/patient';

const PATIENTS_KEY = ['admin', 'patients'];

export function usePatientList() {
  return useQuery<Patient[]>({
    queryKey: PATIENTS_KEY,
    queryFn: async () => {
      const { data } = await api.get('/admin/patients');
      return data.data;
    },
  });
}

export function usePatient(id: string) {
  return useQuery<PatientDetail>({
    queryKey: [...PATIENTS_KEY, id],
    queryFn: async () => {
      const { data } = await api.get(`/admin/patients/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useCreatePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      email: string;
      password: string;
      phone?: string;
      firstName: string;
      lastName: string;
      dateOfBirth?: string;
      nationality?: string;
      passportNumber?: string;
      whatsappNumber?: string;
      hotelId?: string;
    }) => {
      const { data } = await api.post('/admin/patients', dto);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PATIENTS_KEY });
    },
  });
}

export function useUpdatePatient() {
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
      dateOfBirth?: string;
      nationality?: string;
      passportNumber?: string;
      whatsappNumber?: string;
      hotelId?: string;
      isActive?: boolean;
    }) => {
      const { data } = await api.patch(`/admin/patients/${id}`, dto);
      return data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: PATIENTS_KEY });
      queryClient.invalidateQueries({
        queryKey: [...PATIENTS_KEY, variables.id],
      });
    },
  });
}

export function useDeletePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/admin/patients/${id}`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PATIENTS_KEY });
    },
  });
}

export function usePatientAppointments(id: string, page: number) {
  return useQuery<{
    appointments: PatientAppointment[];
    total: number;
    page: number;
    limit: number;
  }>({
    queryKey: [...PATIENTS_KEY, id, 'appointments', page],
    queryFn: async () => {
      const { data } = await api.get(
        `/admin/patients/${id}/appointments?page=${page}&limit=10`,
      );
      return data.data;
    },
    enabled: !!id,
  });
}
