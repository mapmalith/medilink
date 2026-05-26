import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export type JobsQueueName =
  | 'payment-timeout'
  | 'appointment-reminder'
  | 'video-room-creation'
  | 'slot-generation'
  | 'invoice-generation';

export interface QueueStats {
  name: JobsQueueName;
  available: boolean;
  counts: {
    active: number;
    waiting: number;
    delayed: number;
    completed: number;
    failed: number;
  };
}

export interface FailedJob {
  queue: JobsQueueName;
  id: string;
  name: string;
  data: unknown;
  failedReason: string;
  attemptsMade: number;
  failedAt: number | null;
}

const STATS_KEY = ['admin', 'jobs', 'stats'];
const FAILED_KEY = ['admin', 'jobs', 'failed'];

export function useJobStats() {
  return useQuery<QueueStats[]>({
    queryKey: STATS_KEY,
    queryFn: async () => {
      const { data } = await api.get('/admin/jobs/stats');
      return data.data;
    },
    refetchInterval: 30_000,
  });
}

export function useFailedJobs() {
  return useQuery<FailedJob[]>({
    queryKey: FAILED_KEY,
    queryFn: async () => {
      const { data } = await api.get('/admin/jobs/failed');
      return data.data;
    },
    refetchInterval: 30_000,
  });
}

export function useRetryJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ queue, id }: { queue: JobsQueueName; id: string }) => {
      const { data } = await api.post(`/admin/jobs/${queue}/${id}/retry`);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: STATS_KEY });
      qc.invalidateQueries({ queryKey: FAILED_KEY });
    },
  });
}
