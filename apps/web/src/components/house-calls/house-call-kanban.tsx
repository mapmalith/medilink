'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  KanbanBoard,
  KanbanCard,
  KanbanCards,
  KanbanHeader,
  KanbanProvider,
  type DragEndEvent,
} from '@/components/kibo-ui/kanban';
import {
  useAppointmentList,
  useUpdateAppointmentStatus,
} from '@/hooks/use-appointments';
import type { Appointment, AppointmentStatus } from '@/lib/types/appointment';
import { Skeleton } from '@/components/ui/skeleton';
import { HouseCallCard } from './house-call-card';
import { AssignDoctorModal } from '@/components/appointments/assign-doctor-modal';
import { RescheduleModal } from '@/components/appointments/reschedule-modal';

const HOUSE_CALL_COLUMNS: { id: AppointmentStatus; name: string }[] = [
  { id: 'PENDING_PAYMENT', name: 'Pending Payment' },
  { id: 'CONFIRMED', name: 'Payment Received' },
  { id: 'ASSIGNED', name: 'Assign Doctor' },
  { id: 'IN_PROGRESS', name: 'Doctor En Route' },
  { id: 'COMPLETED', name: 'Completed' },
];

const HOUSE_CALL_STATUSES = HOUSE_CALL_COLUMNS.map((c) => c.id);

type KanbanItem = {
  id: string;
  name: string;
  column: string;
  appointment: Appointment;
};

export function HouseCallKanban() {
  const { data: appointments, isLoading } = useAppointmentList({
    type: 'HOUSE_CALL',
  });
  const updateStatus = useUpdateAppointmentStatus();
  const [assignId, setAssignId] = useState<string | null>(null);
  const [rescheduleTarget, setRescheduleTarget] =
    useState<Appointment | null>(null);

  const data = useMemo<KanbanItem[]>(
    () =>
      (appointments ?? [])
        .filter((a) =>
          HOUSE_CALL_STATUSES.includes(a.status as AppointmentStatus),
        )
        .map((a) => ({
          id: a.id,
          name: `${a.patient.firstName} ${a.patient.lastName}`,
          column: a.status,
          appointment: a,
        })),
    [appointments],
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeItem = data.find((d) => d.id === active.id);
    if (!activeItem) return;

    const targetColumn =
      data.find((d) => d.id === over.id)?.column ??
      HOUSE_CALL_COLUMNS.find((c) => c.id === over.id)?.id;

    if (!targetColumn || targetColumn === activeItem.column) return;

    const nextStatus = targetColumn as AppointmentStatus;

    // "Assign Doctor" column requires a doctor — open the modal first.
    if (nextStatus === 'ASSIGNED' && !activeItem.appointment.doctor) {
      setAssignId(activeItem.id);
      return;
    }

    try {
      await updateStatus.mutateAsync({
        id: activeItem.id,
        status: nextStatus,
      });
      toast.success('Status updated');
    } catch {
      toast.error('Failed to update status');
    }
  }

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (!data.length) {
    return (
      <p className="text-sm text-muted-foreground text-center py-12">
        No house call appointments in the queue.
      </p>
    );
  }

  return (
    <>
      <div className="h-[calc(100vh-14rem)] min-h-[500px]">
        <KanbanProvider
          columns={HOUSE_CALL_COLUMNS}
          data={data}
          onDragEnd={handleDragEnd}
        >
          {(column) => (
            <KanbanBoard key={column.id} id={column.id}>
              <KanbanHeader className="flex items-center justify-between">
                <span>{column.name}</span>
                <span className="rounded-full bg-background px-2 py-0.5 text-[10px] font-normal text-muted-foreground">
                  {data.filter((d) => d.column === column.id).length}
                </span>
              </KanbanHeader>
              <KanbanCards<KanbanItem> id={column.id}>
                {(item) => (
                  <KanbanCard<KanbanItem>
                    key={item.id}
                    id={item.id}
                    name={item.name}
                    column={item.column}
                    appointment={item.appointment}
                  >
                    <HouseCallCard
                      appointment={item.appointment}
                      onAssignDoctor={setAssignId}
                      onReschedule={setRescheduleTarget}
                    />
                  </KanbanCard>
                )}
              </KanbanCards>
            </KanbanBoard>
          )}
        </KanbanProvider>
      </div>

      <AssignDoctorModal
        appointmentId={assignId}
        onClose={() => setAssignId(null)}
      />
      <RescheduleModal
        appointment={rescheduleTarget}
        onClose={() => setRescheduleTarget(null)}
      />
    </>
  );
}
