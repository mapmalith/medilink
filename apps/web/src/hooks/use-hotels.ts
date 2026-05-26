import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  Hotel,
  HotelDetail,
  QRCode,
  CreditLedgerEntry,
  HotelAppointment,
} from '@/lib/types/hotel';

const HOTELS_KEY = ['admin', 'hotels'];

export function useHotelList() {
  return useQuery<Hotel[]>({
    queryKey: HOTELS_KEY,
    queryFn: async () => {
      const { data } = await api.get('/admin/hotels');
      return data.data;
    },
  });
}

export function useHotel(id: string) {
  return useQuery<HotelDetail>({
    queryKey: [...HOTELS_KEY, id],
    queryFn: async () => {
      const { data } = await api.get(`/admin/hotels/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useCreateHotel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      email: string;
      password: string;
      name: string;
      address?: string;
      contactPerson?: string;
      phone?: string;
      creditLimit?: number;
    }) => {
      const { data } = await api.post('/admin/hotels', dto);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HOTELS_KEY });
    },
  });
}

export function useUpdateHotel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...dto
    }: {
      id: string;
      email?: string;
      phone?: string;
      name?: string;
      address?: string;
      contactPerson?: string;
      creditLimit?: number;
      isActive?: boolean;
    }) => {
      const { data } = await api.patch(`/admin/hotels/${id}`, dto);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HOTELS_KEY });
    },
  });
}

export function useDeleteHotel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/admin/hotels/${id}`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HOTELS_KEY });
    },
  });
}

export function useHotelQRCodes(id: string) {
  return useQuery<QRCode[]>({
    queryKey: [...HOTELS_KEY, id, 'qr-codes'],
    queryFn: async () => {
      const { data } = await api.get(`/admin/hotels/${id}/qr-codes`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useGenerateQRCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, location }: { id: string; location: string }) => {
      const { data } = await api.post(`/admin/hotels/${id}/qr-codes`, {
        location,
      });
      return data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...HOTELS_KEY, variables.id],
      });
    },
  });
}

export function useTopUpCredit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      amount,
      description,
    }: {
      id: string;
      amount: number;
      description?: string;
    }) => {
      const { data } = await api.post(`/admin/hotels/${id}/credit/top-up`, {
        amount,
        description,
      });
      return data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...HOTELS_KEY, variables.id],
      });
    },
  });
}

export function useCreditLedger(id: string, page: number) {
  return useQuery<{
    entries: CreditLedgerEntry[];
    total: number;
    page: number;
    limit: number;
  }>({
    queryKey: [...HOTELS_KEY, id, 'credit-ledger', page],
    queryFn: async () => {
      const { data } = await api.get(
        `/admin/hotels/${id}/credit/ledger?page=${page}&limit=20`,
      );
      return data.data;
    },
    enabled: !!id,
  });
}

export function useHotelAppointments(id: string, page: number) {
  return useQuery<{
    appointments: HotelAppointment[];
    total: number;
    page: number;
    limit: number;
  }>({
    queryKey: [...HOTELS_KEY, id, 'appointments', page],
    queryFn: async () => {
      const { data } = await api.get(
        `/admin/hotels/${id}/appointments?page=${page}&limit=10`,
      );
      return data.data;
    },
    enabled: !!id,
  });
}
