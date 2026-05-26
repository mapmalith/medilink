'use client';

import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useHotelAppointments } from '@/hooks/use-hotels';

const typeLabel: Record<string, string> = {
  HOUSE_CALL: 'House Call',
  TELE_CONSULTATION: 'Tele-Consultation',
  MEDICAL_VISIT: 'Medical Visit',
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

export function HotelAppointmentHistory({
  hotelId,
}: {
  hotelId: string;
}) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useHotelAppointments(hotelId, page);

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        Loading appointments...
      </p>
    );
  }

  if (!data?.appointments.length) {
    return (
      <p className="text-sm text-muted-foreground text-center py-12">
        No appointments found.
      </p>
    );
  }

  const totalPages = Math.ceil(data.total / data.limit);

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Doctor</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.appointments.map((appt) => (
              <TableRow key={appt.id}>
                <TableCell>
                  {format(parseISO(appt.scheduledDate), 'MMM d, yyyy')}
                </TableCell>
                <TableCell>
                  {format(parseISO(appt.scheduledTime), 'HH:mm')}
                </TableCell>
                <TableCell>
                  {typeLabel[appt.appointmentType] ?? appt.appointmentType}
                </TableCell>
                <TableCell>
                  {appt.patient.firstName} {appt.patient.lastName}
                </TableCell>
                <TableCell>
                  {appt.doctor
                    ? `Dr. ${appt.doctor.firstName} ${appt.doctor.lastName}`
                    : '—'}
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant[appt.status] ?? 'secondary'}>
                    {appt.status.replace(/_/g, ' ')}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

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
    </div>
  );
}
