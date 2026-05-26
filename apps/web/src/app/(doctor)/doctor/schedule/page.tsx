'use client';

import { useMemo, useState } from 'react';
import { addDays, addMinutes, format, parseISO, startOfWeek } from 'date-fns';
import {
  GanttFeatureList,
  GanttFeatureListGroup,
  GanttFeatureRow,
  GanttHeader,
  GanttProvider,
  GanttSidebar,
  GanttSidebarGroup,
  GanttSidebarItem,
  GanttTimeline,
  GanttToday,
  type GanttFeature,
  type Range,
} from '@/components/kibo-ui/gantt';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  APPOINTMENT_TYPE_COLOR,
  APPOINTMENT_TYPE_LABEL,
} from '@/lib/types/appointment';
import {
  useDoctorAppointments,
  useDoctorMe,
} from '@/hooks/use-doctor-portal';

type RangeMode = 'day' | 'week';

export default function DoctorSchedulePage() {
  const [mode, setMode] = useState<RangeMode>('day');
  const { data: me } = useDoctorMe();

  const { startDate, endDate } = useMemo(() => {
    const today = new Date();
    if (mode === 'day') {
      const day = format(today, 'yyyy-MM-dd');
      return { startDate: day, endDate: day };
    }
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = addDays(weekStart, 6);
    return {
      startDate: format(weekStart, 'yyyy-MM-dd'),
      endDate: format(weekEnd, 'yyyy-MM-dd'),
    };
  }, [mode]);

  const { data: appointments, isLoading } = useDoctorAppointments({
    startDate,
    endDate,
  });

  const features = useMemo<GanttFeature[]>(() => {
    if (!appointments) return [];
    return appointments.map((appt) => {
      const startAt = parseISO(appt.scheduledTime);
      const endAt = addMinutes(startAt, appt.duration || 30);
      const color = APPOINTMENT_TYPE_COLOR[appt.appointmentType];
      return {
        id: appt.id,
        name: `${appt.patient.firstName} ${appt.patient.lastName} — ${APPOINTMENT_TYPE_LABEL[appt.appointmentType]}`,
        startAt,
        endAt,
        status: {
          id: appt.appointmentType,
          name: APPOINTMENT_TYPE_LABEL[appt.appointmentType],
          color,
        },
      };
    });
  }, [appointments]);

  // Doctor schedule = single row.
  const groupName = me ? `Dr. ${me.firstName} ${me.lastName}` : 'My schedule';

  // Map our friendlier "day"/"week" toggle onto Kibo UI's available ranges.
  // Daily granularity covers both day and week views nicely.
  const range: Range = 'daily';

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Schedule</h1>
          <p className="text-sm text-muted-foreground">
            Color-coded by appointment type.
          </p>
        </div>

        <div className="flex items-center gap-1">
          {(['day', 'week'] as RangeMode[]).map((m) => (
            <Button
              key={m}
              variant={mode === m ? 'default' : 'outline'}
              size="sm"
              className="capitalize"
              onClick={() => setMode(m)}
            >
              {m}
            </Button>
          ))}
        </div>
      </div>

      <Legend />

      {isLoading ? (
        <Skeleton className="h-[500px] w-full" />
      ) : features.length === 0 ? (
        <div className="rounded-md border border-dashed p-12 text-center text-sm text-muted-foreground">
          No appointments in this {mode}.
        </div>
      ) : (
        <div className="h-[calc(100vh-22rem)] min-h-[500px] overflow-hidden rounded-md border">
          <GanttProvider range={range} zoom={100} className="h-full">
            <GanttSidebar>
              <GanttSidebarGroup name={groupName}>
                {features.map((feature) => (
                  <GanttSidebarItem key={feature.id} feature={feature} />
                ))}
              </GanttSidebarGroup>
            </GanttSidebar>

            <GanttTimeline>
              <GanttHeader />
              <GanttFeatureList>
                <GanttFeatureListGroup>
                  <GanttFeatureRow features={features}>
                    {(feature) => (
                      <div className="flex h-full w-full items-center gap-2 rounded px-2 text-xs">
                        <div
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: feature.status.color }}
                        />
                        <span className="truncate">{feature.name}</span>
                      </div>
                    )}
                  </GanttFeatureRow>
                </GanttFeatureListGroup>
              </GanttFeatureList>
              <GanttToday />
            </GanttTimeline>
          </GanttProvider>
        </div>
      )}
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs">
      {(
        ['HOUSE_CALL', 'TELE_CONSULTATION', 'MEDICAL_VISIT'] as const
      ).map((type) => (
        <div key={type} className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: APPOINTMENT_TYPE_COLOR[type] }}
          />
          <span className="text-muted-foreground">
            {APPOINTMENT_TYPE_LABEL[type]}
          </span>
        </div>
      ))}
    </div>
  );
}
