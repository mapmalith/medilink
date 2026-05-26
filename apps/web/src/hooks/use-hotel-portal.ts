import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Appointment } from '@/lib/types/appointment';
import type {
  HotelCreditInfo,
  HotelCreditLedgerEntry,
  HotelDashboardStats,
  HotelInvoice,
  HotelMe,
} from '@/lib/types/hotel-portal';

const HOTEL_KEY = ['hotel'];

export interface HotelAppointmentFilters {
  startDate?: string;
  endDate?: string;
  status?: string;
  appointmentType?: string;
}

export function useHotelMe() {
  return useQuery<HotelMe>({
    queryKey: [...HOTEL_KEY, 'me'],
    queryFn: async () => {
      const { data } = await api.get('/hotel/me');
      return data.data;
    },
  });
}

export function useHotelDashboardStats() {
  return useQuery<HotelDashboardStats>({
    queryKey: [...HOTEL_KEY, 'dashboard', 'stats'],
    queryFn: async () => {
      const { data } = await api.get('/hotel/dashboard/stats');
      return data.data;
    },
    refetchInterval: 60_000,
  });
}

export function useHotelAppointments(filters: HotelAppointmentFilters = {}) {
  return useQuery<Appointment[]>({
    queryKey: [...HOTEL_KEY, 'appointments', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(filters)) {
        if (value) params.set(key, String(value));
      }
      const qs = params.toString();
      const { data } = await api.get(
        `/hotel/appointments${qs ? `?${qs}` : ''}`,
      );
      return data.data;
    },
  });
}

export function useHotelCredit() {
  return useQuery<HotelCreditInfo>({
    queryKey: [...HOTEL_KEY, 'credit'],
    queryFn: async () => {
      const { data } = await api.get('/hotel/credit');
      return data.data;
    },
  });
}

export interface LedgerFilters {
  startDate?: string;
  endDate?: string;
  type?: string;
}

export function useHotelCreditLedger(filters: LedgerFilters = {}) {
  return useQuery<HotelCreditLedgerEntry[]>({
    queryKey: [...HOTEL_KEY, 'credit', 'ledger', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(filters)) {
        if (value) params.set(key, String(value));
      }
      const qs = params.toString();
      const { data } = await api.get(
        `/hotel/credit/ledger${qs ? `?${qs}` : ''}`,
      );
      return data.data;
    },
  });
}

export interface InvoiceFilters {
  startDate?: string;
  endDate?: string;
}

export function useHotelInvoices(filters: InvoiceFilters = {}) {
  return useQuery<HotelInvoice[]>({
    queryKey: [...HOTEL_KEY, 'invoices', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(filters)) {
        if (value) params.set(key, String(value));
      }
      const qs = params.toString();
      const { data } = await api.get(`/hotel/invoices${qs ? `?${qs}` : ''}`);
      return data.data;
    },
  });
}
