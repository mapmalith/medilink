'use client';

import { useMemo, useState } from 'react';
import { parseISO, format, isSameDay, startOfDay } from 'date-fns';
import {
  CalendarBody,
  CalendarDate,
  CalendarDatePagination,
  CalendarDatePicker,
  CalendarHeader,
  CalendarItem,
  CalendarMonthPicker,
  CalendarProvider,
  CalendarYearPicker,
  type Feature,
} from '@/components/kibo-ui/calendar';
import {
  APPOINTMENT_TYPE_COLOR,
  APPOINTMENT_TYPE_LABEL,
  type Appointment,
} from '@/lib/types/appointment';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface CalendarViewProps {
  appointments: Appointment[];
}

export function CalendarView({ appointments }: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<string>(
    format(new Date(), 'yyyy-MM-dd'),
  );

  const features = useMemo<Feature[]>(
    () =>
      appointments.map((a) => {
        const date = parseISO(a.scheduledDate);
        return {
          id: a.id,
          name: `${a.patient.firstName} ${a.patient.lastName}`,
          startAt: date,
          endAt: date,
          status: {
            id: a.appointmentType,
            name: APPOINTMENT_TYPE_LABEL[a.appointmentType],
            color: APPOINTMENT_TYPE_COLOR[a.appointmentType],
          },
        };
      }),
    [appointments],
  );

  const selectedAppts = useMemo(() => {
    const target = startOfDay(parseISO(selectedDate));
    return appointments.filter((a) =>
      isSameDay(parseISO(a.scheduledDate), target),
    );
  }, [appointments, selectedDate]);

  const currentYear = new Date().getFullYear();

  return (
    <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
      <div className="overflow-hidden rounded-md border">
        <CalendarProvider>
          <CalendarDate>
            <CalendarDatePicker>
              <CalendarMonthPicker />
              <CalendarYearPicker
                start={currentYear - 2}
                end={currentYear + 2}
              />
            </CalendarDatePicker>
            <CalendarDatePagination />
          </CalendarDate>
          <CalendarHeader />
          <CalendarBody features={features}>
            {({ feature }) => <CalendarItem feature={feature} />}
          </CalendarBody>
        </CalendarProvider>
      </div>

      <div className="space-y-3 rounded-md border p-4">
        <div className="space-y-2">
          <Label htmlFor="calendar-day">Select a day</Label>
          <Input
            id="calendar-day"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>

        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          <p className="text-xs font-medium text-muted-foreground">
            {selectedAppts.length} appointment
            {selectedAppts.length === 1 ? '' : 's'} on{' '}
            {format(parseISO(selectedDate), 'MMM d, yyyy')}
          </p>
          {selectedAppts.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No appointments on this day.
            </p>
          )}
          {selectedAppts.map((a) => (
            <a
              key={a.id}
              href={`/dashboard/appointments/${a.id}`}
              className="flex items-start gap-3 rounded-md border p-3 hover:bg-muted"
            >
              <div
                className="mt-1 h-2 w-2 shrink-0 rounded-full"
                style={{
                  backgroundColor:
                    APPOINTMENT_TYPE_COLOR[a.appointmentType],
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">
                  {a.patient.firstName} {a.patient.lastName}
                </div>
                <div className="text-xs text-muted-foreground">
                  {format(parseISO(a.scheduledTime), 'HH:mm')} ·{' '}
                  {APPOINTMENT_TYPE_LABEL[a.appointmentType]}
                </div>
                {a.doctor && (
                  <div className="text-xs text-muted-foreground truncate">
                    Dr. {a.doctor.firstName} {a.doctor.lastName}
                  </div>
                )}
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
