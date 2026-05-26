import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

interface VideoJoinResponse {
  roomUrl: string | null;
  notYetOpen: boolean;
  appointment: {
    id: string;
    status: string;
    appointmentType: string;
    scheduledDate: string;
    scheduledTime: string;
    patient: { id: string; firstName: string; lastName: string };
    doctor: { id: string; firstName: string; lastName: string } | null;
  };
}

export function useVideoJoin(appointmentId: string | null) {
  return useQuery<VideoJoinResponse>({
    queryKey: ['video', 'join', appointmentId],
    queryFn: async () => {
      const { data } = await api.get(`/video/join/${appointmentId}`);
      return data.data;
    },
    enabled: !!appointmentId,
    refetchInterval: (query) => {
      // If the room isn't open yet, retry every 30s so the page transitions
      // into the active state automatically when we hit T-10min.
      const last = query.state.data;
      return last?.notYetOpen ? 30_000 : false;
    },
  });
}
