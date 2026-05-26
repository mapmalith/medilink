import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  DashboardStats,
  TodaysAppointment,
  RecentActivityItem,
} from '@/lib/types/admin-dashboard';

export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ['admin', 'dashboard', 'stats'],
    queryFn: async () => {
      const { data } = await api.get('/admin/dashboard/stats');
      return data.data;
    },
    refetchInterval: 30_000,
  });
}

export function useTodaysAppointments() {
  return useQuery<TodaysAppointment[]>({
    queryKey: ['admin', 'dashboard', 'todays-appointments'],
    queryFn: async () => {
      const { data } = await api.get('/admin/dashboard/todays-appointments');
      return data.data;
    },
    refetchInterval: 30_000,
  });
}

export function useRecentActivity() {
  return useQuery<RecentActivityItem[]>({
    queryKey: ['admin', 'dashboard', 'recent-activity'],
    queryFn: async () => {
      const { data } = await api.get('/admin/dashboard/recent-activity');
      return data.data;
    },
    refetchInterval: 30_000,
  });
}
