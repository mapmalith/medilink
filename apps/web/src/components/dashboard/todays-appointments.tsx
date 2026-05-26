'use client';

import { format, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useTodaysAppointments } from '@/hooks/use-admin-dashboard';

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  CONFIRMED: 'default',
  ASSIGNED: 'default',
  IN_PROGRESS: 'secondary',
  COMPLETED: 'outline',
  PENDING_PAYMENT: 'secondary',
  CANCELLED: 'destructive',
  EXPIRED: 'destructive',
};

const typeLabel: Record<string, string> = {
  HOUSE_CALL: 'House Call',
  TELE_CONSULTATION: 'Tele-Consult',
  MEDICAL_VISIT: 'Medical Visit',
};

export function TodaysAppointments() {
  const { data: appointments, isLoading } = useTodaysAppointments();

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>Today&apos;s Appointments</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </div>
        ) : !appointments?.length ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No appointments scheduled for today.
          </p>
        ) : (
          <ScrollArea className="h-[360px]">
            <div className="space-y-4">
              {appointments.map((appt) => (
                <div
                  key={appt.id}
                  className="flex items-center justify-between border-b pb-3 last:border-0"
                >
                  <div className="space-y-1 min-w-0">
                    <p className="text-sm font-medium leading-none truncate">
                      {appt.patient.firstName} {appt.patient.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(appt.scheduledTime), 'h:mm a')} &middot;{' '}
                      {typeLabel[appt.appointmentType] ?? appt.appointmentType}
                      {appt.doctor && (
                        <>
                          {' '}
                          &middot; Dr. {appt.doctor.firstName}{' '}
                          {appt.doctor.lastName}
                        </>
                      )}
                    </p>
                  </div>
                  <Badge variant={statusVariant[appt.status] ?? 'outline'}>
                    {appt.status.replace(/_/g, ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
