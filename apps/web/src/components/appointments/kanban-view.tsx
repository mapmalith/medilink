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
  KANBAN_COLUMNS,
  KANBAN_STATUSES,
  type Appointment,
  type AppointmentStatus,
} from '@/lib/types/appointment';
import { AppointmentCard } from './appointment-card';
import { AssignDoctorModal } from './assign-doctor-modal';
import { RescheduleModal } from './reschedule-modal';
import { useUpdateAppointmentStatus } from '@/hooks/use-appointments';

interface KanbanViewProps {
  appointments: Appointment[];
  /**
   * When true, dropping a card into the "Doctor Assigned" column is blocked
   * (call-center staff cannot assign doctors — only admins can). Defaults to
   * false, preserving the admin behaviour of opening the assign-doctor modal.
   */
  readOnlyAssign?: boolean;
}

type KanbanItem = {
  id: string;
  name: string;
  column: string;
  appointment: Appointment;
};

export function KanbanView({
  appointments,
  readOnlyAssign = false,
}: KanbanViewProps) {
  const updateStatus = useUpdateAppointmentStatus();
  const [assignId, setAssignId] = useState<string | null>(null);
  const [rescheduleTarget, setRescheduleTarget] =
    useState<Appointment | null>(null);

  const data = useMemo<KanbanItem[]>(
    () =>
      appointments
        .filter((a) =>
          KANBAN_STATUSES.includes(a.status as AppointmentStatus),
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
      KANBAN_COLUMNS.find((c) => c.id === over.id)?.id;

    if (!targetColumn || targetColumn === activeItem.column) return;

    const nextStatus = targetColumn as AppointmentStatus;

    // "Doctor Assigned" column requires a doctor — open the modal instead.
    if (nextStatus === 'ASSIGNED' && !activeItem.appointment.doctor) {
      if (readOnlyAssign) {
        toast.error('Only admins can assign doctors.');
        return;
      }
      setAssignId(activeItem.id);
      return;
    }

    // RESCHEDULED is a terminal status set by the reschedule flow; don't allow
    // manually dropping into it.
    if (nextStatus === 'RESCHEDULED') {
      toast.error('Use the reschedule action to move appointments here.');
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

  return (
    <>
      <div className="h-[calc(100vh-18rem)] min-h-[500px]">
        <KanbanProvider
          columns={KANBAN_COLUMNS}
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
                    <AppointmentCard
                      appointment={item.appointment}
                      onReschedule={setRescheduleTarget}
                    />
                  </KanbanCard>
                )}
              </KanbanCards>
            </KanbanBoard>
          )}
        </KanbanProvider>
      </div>

      {!readOnlyAssign && (
        <AssignDoctorModal
          appointmentId={assignId}
          onClose={() => setAssignId(null)}
        />
      )}
      <RescheduleModal
        appointment={rescheduleTarget}
        onClose={() => setRescheduleTarget(null)}
      />
    </>
  );
}
