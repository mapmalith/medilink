'use client';

import { format, parseISO } from 'date-fns';
import { ArrowRight, Clock, Stethoscope, User, History } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useRescheduleHistory } from '@/hooks/use-appointments';

interface RescheduleHistoryPanelProps {
  appointmentId: string;
}

export function RescheduleHistoryPanel({
  appointmentId,
}: RescheduleHistoryPanelProps) {
  const { data, isLoading } = useRescheduleHistory(appointmentId);

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-8 text-center">
        <History className="h-6 w-6 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">
          This appointment has not been rescheduled.
        </p>
      </div>
    );
  }

  return (
    <ol className="relative space-y-4 border-l pl-6">
      {data.map((entry) => {
        const doctorChanged =
          entry.previousDoctorId !== entry.newDoctorId &&
          (entry.previousDoctor || entry.newDoctor);

        return (
          <li key={entry.id} className="relative">
            <span className="absolute -left-[29px] top-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-primary" />

            <div className="rounded-md border bg-card p-3 text-sm shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="h-5">
                    {entry.rescheduledByRole}
                  </Badge>
                  {entry.rescheduledBy?.email && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      {entry.rescheduledBy.email}
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {format(parseISO(entry.createdAt), 'MMM d, yyyy HH:mm')}
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground line-through">
                    {format(parseISO(entry.previousDate), 'MMM d, yyyy')} ·{' '}
                    {format(parseISO(entry.previousTime), 'HH:mm')}
                  </span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className="font-medium">
                    {format(parseISO(entry.newDate), 'MMM d, yyyy')} ·{' '}
                    {format(parseISO(entry.newTime), 'HH:mm')}
                  </span>
                </div>

                {doctorChanged && (
                  <div className="flex items-center gap-2 text-xs">
                    <Stethoscope className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground line-through">
                      {entry.previousDoctor
                        ? `Dr. ${entry.previousDoctor.firstName} ${entry.previousDoctor.lastName}`
                        : 'Unassigned'}
                    </span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span className="font-medium">
                      {entry.newDoctor
                        ? `Dr. ${entry.newDoctor.firstName} ${entry.newDoctor.lastName}`
                        : 'Unassigned'}
                    </span>
                  </div>
                )}
              </div>

              {entry.reason && (
                <div className="mt-2 border-t pt-2 text-xs">
                  <span className="text-muted-foreground">Reason: </span>
                  {entry.reason}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
