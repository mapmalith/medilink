'use client';

import { format, parseISO } from 'date-fns';
import { MapPin, Stethoscope, RefreshCw, FileText, UserPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Appointment } from '@/lib/types/appointment';

interface HouseCallCardProps {
  appointment: Appointment;
  onAssignDoctor: (id: string) => void;
  onReschedule?: (appointment: Appointment) => void;
}

function buildMapHref(appt: Appointment): string | null {
  if (appt.visitLatitude != null && appt.visitLongitude != null) {
    return `https://www.google.com/maps?q=${appt.visitLatitude},${appt.visitLongitude}`;
  }
  if (appt.visitAddress) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(appt.visitAddress)}`;
  }
  return null;
}

export function HouseCallCard({
  appointment,
  onAssignDoctor,
  onReschedule,
}: HouseCallCardProps) {
  const stopDrag = (e: React.PointerEvent) => e.stopPropagation();
  const mapHref = buildMapHref(appointment);
  const isCompleted = appointment.status === 'COMPLETED';

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold leading-tight">
            {appointment.patient.firstName} {appointment.patient.lastName}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {format(parseISO(appointment.scheduledDate), 'MMM d, yyyy')} ·{' '}
            {format(parseISO(appointment.scheduledTime), 'HH:mm')}
          </p>
        </div>
        {appointment.rescheduleCount > 0 && (
          <Badge variant="outline" className="gap-1 h-5 shrink-0">
            <RefreshCw className="h-2.5 w-2.5" />
            {appointment.rescheduleCount}
          </Badge>
        )}
      </div>

      {appointment.visitAddress && (
        <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
          <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
          <span className="line-clamp-2">{appointment.visitAddress}</span>
        </div>
      )}

      {mapHref && (
        <div onPointerDown={stopDrag}>
          <a
            href={mapHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline"
          >
            <MapPin className="h-3 w-3" />
            Open in Maps
          </a>
        </div>
      )}

      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
        <Stethoscope className="h-3 w-3" />
        {appointment.doctor ? (
          <span className="truncate">
            Dr. {appointment.doctor.firstName} {appointment.doctor.lastName}
          </span>
        ) : (
          <span className="italic">No doctor assigned</span>
        )}
      </div>

      {appointment.hotel && (
        <p className="text-[11px] text-muted-foreground truncate">
          {appointment.hotel.name}
        </p>
      )}

      <div className="flex flex-wrap gap-1 pt-1" onPointerDown={stopDrag}>
        {!appointment.doctor && !isCompleted && (
          <Button
            variant="outline"
            size="sm"
            className="h-6 flex-1 gap-1 text-[10px]"
            onClick={() => onAssignDoctor(appointment.id)}
          >
            <UserPlus className="h-3 w-3" />
            Assign Doctor
          </Button>
        )}

        {!isCompleted && (
          <Button
            variant="outline"
            size="sm"
            className="h-6 flex-1 text-[10px]"
            onClick={() => onReschedule?.(appointment)}
            disabled={!onReschedule}
          >
            Reschedule
          </Button>
        )}

        {isCompleted && appointment.medicalRecord && (
          <a
            href={`/dashboard/medical-records/${appointment.medicalRecord.id}`}
            className="inline-flex h-6 flex-1 items-center justify-center gap-1 rounded-md border border-input bg-background px-2 text-[10px] font-medium hover:bg-muted"
          >
            <FileText className="h-3 w-3" />
            View Report
          </a>
        )}

        {isCompleted && !appointment.medicalRecord && (
          <span className="text-[10px] text-muted-foreground italic">
            No report on file
          </span>
        )}
      </div>
    </div>
  );
}
