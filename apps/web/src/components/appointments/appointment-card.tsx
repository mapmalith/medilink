'use client';

import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  APPOINTMENT_TYPE_LABEL,
  APPOINTMENT_TYPE_COLOR,
  type Appointment,
} from '@/lib/types/appointment';
import { useUpdateAppointmentStatus } from '@/hooks/use-appointments';
import { Building2, Stethoscope, RefreshCw, X } from 'lucide-react';

interface AppointmentCardProps {
  appointment: Appointment;
  onReschedule?: (appointment: Appointment) => void;
}

export function AppointmentCard({
  appointment,
  onReschedule,
}: AppointmentCardProps) {
  const updateStatus = useUpdateAppointmentStatus();
  const color = APPOINTMENT_TYPE_COLOR[appointment.appointmentType];

  async function handleCancel() {
    try {
      await updateStatus.mutateAsync({
        id: appointment.id,
        status: 'CANCELLED',
        cancellationReason: 'Cancelled by admin',
      });
      toast.success('Appointment cancelled');
    } catch {
      toast.error('Failed to cancel');
    }
  }

  const isRescheduledColumn = appointment.status === 'RESCHEDULED';
  const latestRescheduledTo = appointment.rescheduledTo?.[0] ?? null;

  const stopDrag = (e: React.PointerEvent) => e.stopPropagation();

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold leading-tight">
          {appointment.patient.firstName} {appointment.patient.lastName}
        </p>
        {appointment.rescheduleCount > 0 && (
          <Badge variant="outline" className="gap-1 h-5 shrink-0">
            <RefreshCw className="h-2.5 w-2.5" />
            {appointment.rescheduleCount}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span
          className="text-[11px] font-medium"
          style={{ color }}
        >
          {APPOINTMENT_TYPE_LABEL[appointment.appointmentType]}
        </span>
      </div>

      <div
        className={
          isRescheduledColumn
            ? 'text-xs text-muted-foreground line-through'
            : 'text-xs text-muted-foreground'
        }
      >
        {format(parseISO(appointment.scheduledDate), 'MMM d, yyyy')} ·{' '}
        {format(parseISO(appointment.scheduledTime), 'HH:mm')}
      </div>

      {isRescheduledColumn && latestRescheduledTo && (
        <div className="rounded-sm border border-primary/40 bg-primary/5 p-1.5 text-[11px]">
          <div className="font-medium text-primary">Rescheduled to:</div>
          <a
            href={`/dashboard/appointments/${latestRescheduledTo.id}`}
            className="text-primary underline"
          >
            {format(parseISO(latestRescheduledTo.scheduledDate), 'MMM d')} ·{' '}
            {format(parseISO(latestRescheduledTo.scheduledTime), 'HH:mm')}
          </a>
        </div>
      )}

      {appointment.hotel && (
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Building2 className="h-3 w-3" />
          <span className="truncate">{appointment.hotel.name}</span>
        </div>
      )}

      {appointment.doctor && (
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Stethoscope className="h-3 w-3" />
          <span className="truncate">
            Dr. {appointment.doctor.firstName} {appointment.doctor.lastName}
          </span>
        </div>
      )}

      {!['COMPLETED', 'CANCELLED', 'EXPIRED'].includes(
        appointment.status,
      ) && (
        <div className="flex gap-1 pt-1" onPointerDown={stopDrag}>
          <Button
            variant="outline"
            size="sm"
            className="h-6 flex-1 text-[10px]"
            onClick={() => onReschedule?.(appointment)}
            disabled={!onReschedule}
          >
            Reschedule
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-6 w-6"
            onClick={handleCancel}
            disabled={updateStatus.isPending}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
