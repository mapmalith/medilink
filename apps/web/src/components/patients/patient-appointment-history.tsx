'use client';

import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  ListProvider,
  ListGroup,
  ListHeader,
  ListItems,
  ListItem,
  type DragEndEvent,
} from '@/components/kibo-ui/list';
import { usePatientAppointments } from '@/hooks/use-patients';

const typeConfig: Record<string, { label: string; color: string }> = {
  HOUSE_CALL: { label: 'House Call', color: '#3b82f6' },
  TELE_CONSULTATION: { label: 'Tele-Consultation', color: '#8b5cf6' },
  MEDICAL_VISIT: { label: 'Medical Visit', color: '#10b981' },
};

const statusVariant: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  CONFIRMED: 'default',
  ASSIGNED: 'default',
  IN_PROGRESS: 'default',
  COMPLETED: 'default',
  PENDING_PAYMENT: 'outline',
  CANCELLED: 'destructive',
  EXPIRED: 'secondary',
  RESCHEDULED: 'secondary',
};

export function PatientAppointmentHistory({
  patientId,
}: {
  patientId: string;
}) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = usePatientAppointments(patientId, page);

  // No-op drag handler — history is read-only
  function handleDragEnd(_event: DragEndEvent) {
    // intentionally empty
  }

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        Loading appointments...
      </p>
    );
  }

  if (!data?.appointments.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Appointment History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No appointments yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalPages = Math.ceil(data.total / data.limit);

  // Group by appointment type
  const grouped = data.appointments.reduce<
    Record<string, typeof data.appointments>
  >((acc, appt) => {
    const key = appt.appointmentType;
    if (!acc[key]) acc[key] = [];
    acc[key].push(appt);
    return acc;
  }, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appointment History</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ListProvider onDragEnd={handleDragEnd}>
          {Object.entries(grouped).map(([type, appointments]) => {
            const config = typeConfig[type] || {
              label: type.replace(/_/g, ' '),
              color: '#6b7280',
            };
            return (
              <ListGroup key={type} id={type} className="rounded-lg mb-3">
                <ListHeader name={config.label} color={config.color} />
                <ListItems>
                  {appointments.map((appt, index) => (
                    <ListItem
                      key={appt.id}
                      id={appt.id}
                      name={appt.id}
                      index={index}
                      parent={type}
                    >
                      <div className="flex w-full items-center justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">
                            {format(parseISO(appt.scheduledDate), 'MMM d, yyyy')}{' '}
                            at {format(parseISO(appt.scheduledTime), 'HH:mm')}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {appt.doctor
                              ? `Dr. ${appt.doctor.firstName} ${appt.doctor.lastName}${appt.doctor.specialization ? ` · ${appt.doctor.specialization}` : ''}`
                              : 'No doctor assigned'}
                          </p>
                        </div>
                        <Badge
                          variant={statusVariant[appt.status] ?? 'secondary'}
                        >
                          {appt.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                    </ListItem>
                  ))}
                </ListItems>
              </ListGroup>
            );
          })}
        </ListProvider>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} ({data.total} total)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
