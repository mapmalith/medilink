import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

const WA_KEY = ['admin', 'whatsapp'];

interface WhatsAppHealth {
  mode: 'mock' | 'live';
  sandboxNumber: string;
  ready: boolean;
}

interface WhatsAppLogEntry {
  id: string;
  direction: string;
  phone: string;
  body: string;
  state: string | null;
  messageSid: string | null;
  appointmentId: string | null;
  createdAt: string;
}

export function useWhatsAppHealth() {
  return useQuery<WhatsAppHealth>({
    queryKey: [...WA_KEY, 'health'],
    queryFn: async () => {
      const { data } = await api.get('/admin/whatsapp/health');
      return data.data;
    },
    refetchInterval: 30_000,
  });
}

export function useWhatsAppLogs() {
  return useQuery<WhatsAppLogEntry[]>({
    queryKey: [...WA_KEY, 'logs'],
    queryFn: async () => {
      const { data } = await api.get('/admin/whatsapp/logs?limit=50');
      return data.data;
    },
    refetchInterval: 10_000,
  });
}

export function useTestSend() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { phone: string; message: string }) => {
      const { data } = await api.post('/admin/whatsapp/test-send', input);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...WA_KEY, 'logs'] });
    },
  });
}

export function useSetWhatsAppMode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { mock: boolean }) => {
      const { data } = await api.post('/admin/whatsapp/mode', input);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...WA_KEY, 'health'] });
    },
  });
}
