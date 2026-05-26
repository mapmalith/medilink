import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Staff, StaffDepartment } from '@/lib/types/staff';

const STAFF_KEY = ['admin', 'staff'];

export function useStaffList() {
  return useQuery<Staff[]>({
    queryKey: STAFF_KEY,
    queryFn: async () => {
      const { data } = await api.get('/admin/staff');
      return data.data;
    },
  });
}

export function useCreateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      department: StaffDepartment;
      phone?: string;
    }) => {
      const { data } = await api.post('/admin/staff', dto);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STAFF_KEY });
    },
  });
}

export function useUpdateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...dto
    }: {
      id: string;
      email?: string;
      firstName?: string;
      lastName?: string;
      department?: StaffDepartment;
      phone?: string;
      isActive?: boolean;
    }) => {
      const { data } = await api.patch(`/admin/staff/${id}`, dto);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STAFF_KEY });
    },
  });
}

export function useToggleStaffActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/admin/staff/${id}/toggle-active`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STAFF_KEY });
    },
  });
}

export function useDeleteStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/admin/staff/${id}`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STAFF_KEY });
    },
  });
}
