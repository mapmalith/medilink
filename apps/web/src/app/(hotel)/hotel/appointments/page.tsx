'use client';

import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { MapPin, Phone, Stethoscope, Building2, X } from 'lucide-react';
import {
  KanbanBoard,
  KanbanCard,
  KanbanCards,
  KanbanHeader,
  KanbanProvider,
  type DragEndEvent,
} from '@/components/kibo-ui/kanban';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useHotelAppointments,
  type HotelAppointmentFilters,
} from '@/hooks/use-hotel-portal';
import {
  APPOINTMENT_TYPE_COLOR,
  APPOINTMENT_TYPE_LABEL,
  type Appointment,
  type AppointmentStatus,
  type AppointmentType,
} from '@/lib/types/appointment';

type ColumnId =
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED';

const COLUMNS: { id: ColumnId; name: string }[] = [
  { id: 'PENDING_PAYMENT', name: 'Pending Payment' },
  { id: 'CONFIRMED', name: 'Confirmed' },
  { id: 'IN_PROGRESS', name: 'In Progress' },
  { id: 'COMPLETED', name: 'Completed' },
];

function statusToColumn(status: AppointmentStatus): ColumnId | null {
  switch (status) {
    case 'PENDING_PAYMENT':
      return 'PENDING_PAYMENT';
    case 'CONFIRMED':
    case 'ASSIGNED':
      return 'CONFIRMED';
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

const selectClassName =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

export default function HotelAppointmentsPage() {
  const [filters, setFilters] = useState<HotelAppointmentFilters>({});
  const { data: appointments, isLoading } = useHotelAppointments(filters);

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

  // Drag-end is read-only here — hotels can't transition appointment status.
  function handleDragEnd(_event: DragEndEvent) {
    toast.info('Hotels cannot change appointment status.');
  }

  const hasFilters = Object.values(filters).some((v) => v);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Appointments</h1>
        <p className="text-sm text-muted-foreground">
          Track all appointments booked through your hotel.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 rounded-md border bg-card p-3">
        <div className="space-y-1">
          <Label className="text-xs">Type</Label>
          <select
            className={selectClassName}
            value={filters.appointmentType ?? ''}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                appointmentType: (e.target.value || undefined) as
                  | AppointmentType
                  | undefined,
              }))
            }
          >
            <option value="">All types</option>
            <option value="HOUSE_CALL">House Call</option>
            <option value="TELE_CONSULTATION">Tele-Consultation</option>
            <option value="MEDICAL_VISIT">Medical Visit</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">From</Label>
          <Input
            type="date"
            className="h-9"
            value={filters.startDate ?? ''}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                startDate: e.target.value || undefined,
              }))
            }
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">To</Label>
          <Input
            type="date"
            className="h-9"
            value={filters.endDate ?? ''}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                endDate: e.target.value || undefined,
              }))
            }
          />
        </div>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1"
            onClick={() => setFilters({})}
          >
            <X className="h-3 w-3" />
            Clear
          </Button>
        )}
      </div>

      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : data.length === 0 ? (
        <div className="rounded-md border border-dashed p-12 text-center text-sm text-muted-foreground">
          No appointments match your filters.
        </div>
      ) : (
        <div className="h-[calc(100vh-22rem)] min-h-[500px]">
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
                      <HotelAppointmentCard appointment={item.appointment} />
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

function HotelAppointmentCard({ appointment }: { appointment: Appointment }) {
  const color = APPOINTMENT_TYPE_COLOR[appointment.appointmentType];

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold leading-tight">
            {appointment.patient.firstName} {appointment.patient.lastName}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {format(parseISO(appointment.scheduledDate), 'MMM d')} ·{' '}
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

      {appointment.doctor && (
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Stethoscope className="h-3 w-3" />
          <span className="truncate">
            Dr. {appointment.doctor.firstName} {appointment.doctor.lastName}
          </span>
        </div>
      )}

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

      {appointment.amountCharged !== null && (
        <div className="flex items-center justify-between border-t pt-1.5 text-[11px]">
          <span className="text-muted-foreground">Amount</span>
          <span className="font-medium tabular-nums">
            {appointment.currency} {appointment.amountCharged.toFixed(2)}
          </span>
        </div>
      )}
    </div>
  );
}
