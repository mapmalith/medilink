'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import {
  PlayCircle,
  MapPin,
  Stethoscope,
  Building2,
  Phone,
  CheckCircle2,
  Video,
} from 'lucide-react';
import {
  KanbanBoard,
  KanbanCard,
  KanbanCards,
  KanbanHeader,
  KanbanProvider,
  type DragEndEvent,
} from '@/components/kibo-ui/kanban';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  useDoctorTodayAppointments,
  useStartConsultation,
} from '@/hooks/use-doctor-portal';
import {
  APPOINTMENT_TYPE_COLOR,
  APPOINTMENT_TYPE_LABEL,
  type Appointment,
  type AppointmentStatus,
} from '@/lib/types/appointment';

type ColumnId = 'UPCOMING' | 'IN_PROGRESS' | 'COMPLETED';

const COLUMNS: { id: ColumnId; name: string }[] = [
  { id: 'UPCOMING', name: 'Upcoming' },
  { id: 'IN_PROGRESS', name: 'In Progress' },
  { id: 'COMPLETED', name: 'Completed' },
];

function statusToColumn(status: AppointmentStatus): ColumnId | null {
  switch (status) {
    case 'CONFIRMED':
    case 'ASSIGNED':
    case 'PENDING_PAYMENT':
      return 'UPCOMING';
    case 'IN_PROGRESS':
      return 'IN_PROGRESS';
    case 'COMPLETED':
      return 'COMPLETED';
    default:
      return null;
  }
}

type KanbanItem = {
  id: string;
  name: string;
  column: string;
  appointment: Appointment;
};

export default function DoctorTodayPage() {
  const { data: appointments, isLoading } = useDoctorTodayAppointments();
  const startConsultation = useStartConsultation();

  const data = useMemo<KanbanItem[]>(() => {
    if (!appointments) return [];
    return appointments.flatMap((a) => {
      const col = statusToColumn(a.status);
      if (!col) return [];
      return [
        {
          id: a.id,
          name: `${a.patient.firstName} ${a.patient.lastName}`,
          column: col,
          appointment: a,
        },
      ];
    });
  }, [appointments]);

  // Drag-end is a no-op for the doctor portal — status changes happen via the
  // explicit "Start Consultation" button. Keep the handler so the Kanban stays
  // happy and we can give a friendly toast.
  function handleDragEnd(_event: DragEndEvent) {
    toast.info('Use the Start Consultation button to advance an appointment.');
  }

  async function handleStart(appointment: Appointment) {
    try {
      await startConsultation.mutateAsync(appointment.id);
      toast.success('Consultation started');
    } catch (err) {
      const apiError = err as { response?: { data?: { message?: string } } };
      toast.error(
        apiError?.response?.data?.message ?? 'Failed to start consultation',
      );
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">
          Today&apos;s Appointments
        </h1>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Today&apos;s Appointments
        </h1>
        <p className="text-sm text-muted-foreground">
          {data.length} appointment{data.length === 1 ? '' : 's'} scheduled
          today.
        </p>
      </div>

      {data.length === 0 ? (
        <div className="rounded-md border border-dashed p-12 text-center text-sm text-muted-foreground">
          No appointments today.
        </div>
      ) : (
        <div className="h-[calc(100vh-14rem)] min-h-[500px]">
          <KanbanProvider
            columns={COLUMNS}
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
                      <DoctorAppointmentCard
                        appointment={item.appointment}
                        column={item.column as ColumnId}
                        onStart={handleStart}
                        starting={startConsultation.isPending}
                      />
                    </KanbanCard>
                  )}
                </KanbanCards>
              </KanbanBoard>
            )}
          </KanbanProvider>
        </div>
      )}
    </div>
  );
}

function DoctorAppointmentCard({
  appointment,
  column,
  onStart,
  starting,
}: {
  appointment: Appointment;
  column: ColumnId;
  onStart: (a: Appointment) => void;
  starting: boolean;
}) {
  const stopDrag = (e: React.PointerEvent) => e.stopPropagation();
  const color = APPOINTMENT_TYPE_COLOR[appointment.appointmentType];

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold leading-tight">
            {appointment.patient.firstName} {appointment.patient.lastName}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {format(parseISO(appointment.scheduledTime), 'HH:mm')} ·{' '}
            {appointment.duration} min
          </p>
        </div>
        <Badge
          variant="outline"
          className="h-5 gap-1 text-[10px]"
          style={{ borderColor: color, color }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: color }}
          />
          {APPOINTMENT_TYPE_LABEL[appointment.appointmentType]}
        </Badge>
      </div>

      {appointment.hotel && (
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Building2 className="h-3 w-3" />
          <span className="truncate">{appointment.hotel.name}</span>
        </div>
      )}

      {appointment.visitAddress && (
        <div className="flex items-start gap-1 text-[11px] text-muted-foreground">
          <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
          <span className="line-clamp-2">{appointment.visitAddress}</span>
        </div>
      )}

      {appointment.patient.whatsappNumber && (
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Phone className="h-3 w-3" />
          {appointment.patient.whatsappNumber}
        </div>
      )}

      {appointment.appointmentType === 'TELE_CONSULTATION' &&
        (column === 'UPCOMING' || column === 'IN_PROGRESS') && (
          <div onPointerDown={stopDrag} className="pt-1">
            <Link
              href={`/video/${appointment.id}`}
              className="inline-flex h-7 w-full items-center justify-center gap-1 rounded-md border border-primary/40 bg-primary/5 px-2 text-[11px] font-medium text-primary hover:bg-primary/10"
            >
              <Video className="h-3 w-3" />
              Join Video
            </Link>
          </div>
        )}

      {column === 'UPCOMING' && (
        <div onPointerDown={stopDrag} className="pt-1">
          <Button
            size="sm"
            className="h-7 w-full gap-1 text-[11px]"
            onClick={() => onStart(appointment)}
            disabled={starting}
          >
            <PlayCircle className="h-3 w-3" />
            Start Consultation
          </Button>
        </div>
      )}

      {column === 'IN_PROGRESS' && (
        <div className="space-y-2">
          <div className="flex items-center gap-1 text-[11px] font-medium text-amber-600">
            <Stethoscope className="h-3 w-3" />
            In progress
          </div>
          <div onPointerDown={stopDrag}>
            <Link
              href={`/doctor/appointments/${appointment.id}/complete`}
              className="inline-flex h-7 w-full items-center justify-center gap-1 rounded-md bg-emerald-600 px-2 text-[11px] font-medium text-white hover:bg-emerald-700"
            >
              <CheckCircle2 className="h-3 w-3" />
              Complete
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
