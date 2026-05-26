import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

const CALL_CENTER_KEY = ['call-center'];

export interface CallCenterStats {
  scope: 'today';
  todayBookings: number;
  pendingPayments: number;
  rescheduledToday: number;
}

/**
 * Stats shown on the call-center dashboard. Scope is currently fixed to
 * "today"; the backend supports adding other windows later.
 */
export function useCallCenterStats() {
  return useQuery<CallCenterStats>({
    queryKey: [...CALL_CENTER_KEY, 'stats', 'today'],
    queryFn: async () => {
      const { data } = await api.get('/appointments/stats', {
        params: { scope: 'today' },
      });
      return data.data;
    },
    refetchInterval: 60_000,
  });
}
