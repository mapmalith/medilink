'use client';

import { useState } from 'react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppointmentList } from '@/hooks/use-appointments';
import { AppointmentFiltersBar } from '@/components/appointments/appointment-filters';
import { KanbanView } from '@/components/appointments/kanban-view';
import { GanttView } from '@/components/appointments/gantt-view';
import { CalendarView } from '@/components/appointments/calendar-view';
import { ListView } from '@/components/appointments/list-view';
import type { AppointmentFilters } from '@/lib/types/appointment';

export default function AppointmentsPage() {
  const [filters, setFilters] = useState<AppointmentFilters>({});
  const { data: appointments, isLoading } = useAppointmentList(filters);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Appointments</h1>
        <p className="text-sm text-muted-foreground">
          Manage all appointments across house calls, tele-consultations, and
          medical visits.
        </p>
      </div>

      <AppointmentFiltersBar filters={filters} onChange={setFilters} />

      <Tabs defaultValue="kanban" className="flex flex-col gap-4">
        <TabsList variant="line">
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
          <TabsTrigger value="gantt">Gantt</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="list">List</TabsTrigger>
        </TabsList>

        {isLoading ? (
          <Skeleton className="h-96 w-full" />
        ) : (
          <>
            <TabsContent value="kanban">
              <KanbanView appointments={appointments ?? []} />
            </TabsContent>
            <TabsContent value="gantt">
              <GanttView appointments={appointments ?? []} />
            </TabsContent>
            <TabsContent value="calendar">
              <CalendarView appointments={appointments ?? []} />
            </TabsContent>
            <TabsContent value="list">
              <ListView appointments={appointments ?? []} />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
