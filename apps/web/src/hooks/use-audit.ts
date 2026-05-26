import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export interface AuditUser {
  id: string;
  email: string;
  role: string;
  displayName: string;
}

export interface AuditRow {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: unknown;
  ipAddress: string | null;
  createdAt: string;
  user: AuditUser | null;
}

export interface AuditPage {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  rows: AuditRow[];
}

export interface AuditFilters {
  userId?: string;
  entity?: string;
  action?: string;
  entityId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export function useAuditLogs(filters: AuditFilters) {
  return useQuery<AuditPage>({
    queryKey: ['admin', 'audit', filters],
    queryFn: async () => {
      const { data } = await api.get('/admin/audit', { params: filters });
      return data.data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useAuditEntities() {
  return useQuery<string[]>({
    queryKey: ['admin', 'audit', 'entities'],
    queryFn: async () => {
      const { data } = await api.get('/admin/audit/entities');
      return data.data;
    },
  });
}

export function useAuditActions() {
  return useQuery<string[]>({
    queryKey: ['admin', 'audit', 'actions'],
    queryFn: async () => {
      const { data } = await api.get('/admin/audit/actions');
      return data.data;
    },
  });
}
