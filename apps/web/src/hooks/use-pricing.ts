import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Pricing } from '@/lib/types/pricing';

const PRICING_KEY = ['admin', 'pricing'];

export function usePricingList() {
  return useQuery<Pricing[]>({
    queryKey: PRICING_KEY,
    queryFn: async () => {
      const { data } = await api.get('/admin/pricing');
      return data.data;
    },
  });
}

export function useCreatePricing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      appointmentType: string;
      price: number;
      currency: string;
      effectiveFrom: string;
      effectiveTo?: string;
    }) => {
      const { data } = await api.post('/admin/pricing', dto);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRICING_KEY });
    },
  });
}

export function useUpdatePricing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...dto
    }: {
      id: string;
      appointmentType?: string;
      price?: number;
      currency?: string;
      isActive?: boolean;
      effectiveFrom?: string;
      effectiveTo?: string | null;
    }) => {
      const { data } = await api.patch(`/admin/pricing/${id}`, dto);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRICING_KEY });
    },
  });
}

export function useDeletePricing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/admin/pricing/${id}`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRICING_KEY });
    },
  });
}
