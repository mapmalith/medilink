import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export interface AdminQRCode {
  id: string;
  code: string;
  location: string | null;
  isActive: boolean;
  scanCount: number;
  createdAt: string;
  hotelId: string;
  hotelName: string;
}

export function useAllQRCodes() {
  return useQuery<AdminQRCode[]>({
    queryKey: ['admin', 'qr-codes'],
    queryFn: async () => {
      const { data } = await api.get('/admin/qr-codes');
      return data.data;
    },
  });
}
