import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { SystemConfig } from '@/lib/types/config';

const CONFIG_KEY = ['admin', 'config'];

export function useConfigList() {
  return useQuery<SystemConfig[]>({
    queryKey: CONFIG_KEY,
    queryFn: async () => {
      const { data } = await api.get('/admin/config');
      return data.data;
    },
  });
}

export function useConfigMap() {
  const query = useConfigList();
  const map = new Map<string, SystemConfig>();
  for (const entry of query.data ?? []) {
    map.set(entry.key, entry);
  }
  return { ...query, map };
}

export function useUpdateConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { data } = await api.patch(`/admin/config/${key}`, { value });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONFIG_KEY });
    },
  });
}
