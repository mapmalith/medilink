import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Drug } from '@/lib/types/drug';

const DRUGS_KEY = ['admin', 'drugs'];

export function useDrugList() {
  return useQuery<Drug[]>({
    queryKey: DRUGS_KEY,
    queryFn: async () => {
      const { data } = await api.get('/admin/drugs');
      return data.data;
    },
  });
}

export function useCreateDrug() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      name: string;
      genericName?: string;
      category?: string;
      manufacturer?: string;
      dosageForm?: string;
      strength?: string;
    }) => {
      const { data } = await api.post('/admin/drugs', dto);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DRUGS_KEY });
    },
  });
}

export function useUpdateDrug() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...dto
    }: {
      id: string;
      name?: string;
      genericName?: string;
      category?: string;
      manufacturer?: string;
      dosageForm?: string;
      strength?: string;
      isActive?: boolean;
    }) => {
      const { data } = await api.patch(`/admin/drugs/${id}`, dto);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DRUGS_KEY });
    },
  });
}

export function useDeleteDrug() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/admin/drugs/${id}`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DRUGS_KEY });
    },
  });
}

export interface DrugSearchResult {
  id: string;
  name: string;
  genericName: string | null;
  strength: string | null;
  dosageForm: string | null;
}

export function useDrugSearch(query: string, enabled = true) {
  return useQuery<DrugSearchResult[]>({
    queryKey: ['drugs', 'search', query],
    queryFn: async () => {
      const { data } = await api.get('/drugs/search', {
        params: { q: query },
      });
      return data.data;
    },
    enabled,
    staleTime: 30_000,
  });
}
