'use client';

import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { CheckCircle2, Search, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useAppointmentSearch } from '@/hooks/use-appointments';
import { RescheduleModal } from '@/components/appointments/reschedule-modal';
import {
  APPOINTMENT_STATUS_LABEL,
  APPOINTMENT_TYPE_LABEL,
  type Appointment,
} from '@/lib/types/appointment';

export default function CallCenterReschedulePage() {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [confirmation, setConfirmation] = useState<Appointment | null>(null);

  const trimmed = query.trim();
  const { data: results, isFetching } = useAppointmentSearch(trimmed);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Reschedule Appointment
        </h1>
        <p className="text-sm text-muted-foreground">
          Look up an appointment by reference number, patient name, WhatsApp
          number, or hotel name. Select a match to open the reschedule modal.
        </p>
      </div>

      <div className="relative max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Reference, patient name, WhatsApp, or hotel…"
          className="pl-9"
          autoFocus
        />
      </div>

      {confirmation && (
        <ConfirmationPanel
          appointment={confirmation}
          onDismiss={() => setConfirmation(null)}
        />
      )}

      {trimmed.length < 2 ? (
        <p className="text-sm text-muted-foreground">
          Type at least 2 characters to search.
        </p>
      ) : isFetching ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : !results || results.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No appointments match &ldquo;{trimmed}&rdquo;.
        </p>
      ) : (
        <div className="space-y-2">
          {results.map((a) => (
            <ResultRow
              key={a.id}
              appointment={a}
              onSelect={() => setSelected(a)}
            />
          ))}
        </div>
      )}

      <RescheduleModal
        appointment={selected}
        onClose={() => setSelected(null)}
        onRescheduled={(updated) => setConfirmation(updated)}
      />
    </div>
  );
}

function ResultRow({
  appointment,
  onSelect,
}: {
  appointment: Appointment;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center justify-between gap-4 rounded-md border bg-card p-3 text-left transition-colors hover:bg-muted"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">
            {appointment.patient.firstName} {appointment.patient.lastName}
          </span>
          <Badge variant="outline" className="text-[10px]">
            {APPOINTMENT_TYPE_LABEL[appointment.appointmentType]}
          </Badge>
          <Badge variant="secondary" className="text-[10px]">
            {APPOINTMENT_STATUS_LABEL[appointment.status]}
          </Badge>
        </div>
        <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
          <span>Ref #{appointment.id.slice(0, 8).toUpperCase()}</span>
          <span>
            {format(parseISO(appointment.scheduledDate), 'MMM d, yyyy')} ·{' '}
            {format(parseISO(appointment.scheduledTime), 'HH:mm')}
          </span>
          {appointment.hotel && <span>{appointment.hotel.name}</span>}
          {appointment.patient.whatsappNumber && (
            <span>{appointment.patient.whatsappNumber}</span>
          )}
        </div>
      </div>
      <Button size="sm" variant="outline">
        Reschedule
      </Button>
    </button>
  );
}

function ConfirmationPanel({
  appointment,
  onDismiss,
}: {
  appointment: Appointment;
  onDismiss: () => void;
}) {
  return (
    <Card className="border-green-500/40 bg-green-50/50 dark:bg-green-950/20">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-green-900 dark:text-green-200">
          <CheckCircle2 className="h-5 w-5" />
          Rescheduled — read these details back to the caller
        </CardTitle>
        <Button
          size="sm"
          variant="ghost"
          onClick={onDismiss}
          className="h-7 gap-1"
        >
          <X className="h-3.5 w-3.5" />
          Dismiss
        </Button>
      </CardHeader>
      <CardContent className="space-y-1 text-sm">
        <DetailRow
          label="Patient"
          value={`${appointment.patient.firstName} ${appointment.patient.lastName}`}
        />
        <DetailRow
          label="Reference"
          value={`#${appointment.id.slice(0, 8).toUpperCase()}`}
        />
        <DetailRow
          label="Type"
          value={APPOINTMENT_TYPE_LABEL[appointment.appointmentType]}
        />
        <DetailRow
          label="New date"
          value={format(parseISO(appointment.scheduledDate), 'EEEE, MMMM d, yyyy')}
        />
        <DetailRow
          label="New time"
          value={format(parseISO(appointment.scheduledTime), 'HH:mm')}
        />
        {appointment.doctor && (
          <DetailRow
            label="Doctor"
            value={`Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}`}
          />
        )}
        {appointment.hotel && (
          <DetailRow label="Hotel" value={appointment.hotel.name} />
        )}
        <DetailRow
          label="Reschedules used"
          value={String(appointment.rescheduleCount)}
        />
      </CardContent>
    </Card>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-36 shrink-0 text-muted-foreground">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
