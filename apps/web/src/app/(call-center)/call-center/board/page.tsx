'use client';

import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppointmentList } from '@/hooks/use-appointments';
import { AppointmentFiltersBar } from '@/components/appointments/appointment-filters';
import { KanbanView } from '@/components/appointments/kanban-view';
import type { AppointmentFilters } from '@/lib/types/appointment';

export default function CallCenterBoardPage() {
  const [filters, setFilters] = useState<AppointmentFilters>({});
  const { data: appointments, isLoading } = useAppointmentList(filters);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Live Board</h1>
        <p className="text-sm text-muted-foreground">
          All appointments across every hotel. Drag cards to update status, or
          use the reschedule action on a card to move an appointment. Only
          admins can assign doctors.
        </p>
      </div>

      <AppointmentFiltersBar filters={filters} onChange={setFilters} />

      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <KanbanView appointments={appointments ?? []} readOnlyAssign />
      )}
    </div>
  );
}
