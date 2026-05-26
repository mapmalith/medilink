import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export interface HotelSearchResult {
  id: string;
  name: string;
  address: string | null;
  contactPerson: string | null;
  phone: string | null;
}

export function useHotelSearch(query: string) {
  return useQuery<HotelSearchResult[]>({
    queryKey: ['hotels', 'search', query],
    queryFn: async () => {
      const { data } = await api.get('/hotels/search', {
        params: { q: query },
      });
      return data.data;
    },
    enabled: query.trim().length >= 1,
    staleTime: 10_000,
  });
}
