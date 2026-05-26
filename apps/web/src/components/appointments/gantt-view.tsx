'use client';

import { useMemo, useState } from 'react';
import { parseISO, addMinutes } from 'date-fns';
import { useRouter } from 'next/navigation';
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
import {
  APPOINTMENT_TYPE_COLOR,
  APPOINTMENT_TYPE_LABEL,
  type Appointment,
} from '@/lib/types/appointment';

interface GanttViewProps {
  appointments: Appointment[];
}

type DoctorBucket = {
  id: string;
  name: string;
  features: GanttFeature[];
};

const UNASSIGNED_KEY = '__unassigned__';

export function GanttView({ appointments }: GanttViewProps) {
  const router = useRouter();
  const [range, setRange] = useState<Range>('daily');

  const doctorBuckets = useMemo<DoctorBucket[]>(() => {
    const byDoctor = new Map<string, DoctorBucket>();

    for (const appt of appointments) {
      const doctorId = appt.doctor?.id ?? UNASSIGNED_KEY;
      const doctorName = appt.doctor
        ? `Dr. ${appt.doctor.firstName} ${appt.doctor.lastName}`
        : 'Unassigned';

      if (!byDoctor.has(doctorId)) {
        byDoctor.set(doctorId, {
          id: doctorId,
          name: doctorName,
          features: [],
        });
      }

      const color = APPOINTMENT_TYPE_COLOR[appt.appointmentType];
      const startAt = parseISO(appt.scheduledTime);
      const endAt = addMinutes(startAt, appt.duration || 30);

      byDoctor.get(doctorId)!.features.push({
        id: appt.id,
        name: `${appt.patient.firstName} ${appt.patient.lastName} — ${APPOINTMENT_TYPE_LABEL[appt.appointmentType]}`,
        startAt,
        endAt,
        status: {
          id: appt.appointmentType,
          name: APPOINTMENT_TYPE_LABEL[appt.appointmentType],
          color,
        },
        lane: doctorId,
      });
    }

    return Array.from(byDoctor.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [appointments]);

  const handleSelect = (id: string) => {
    router.push(`/dashboard/appointments/${id}`);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-1">
        {(['daily', 'monthly', 'quarterly'] as Range[]).map((r) => (
          <Button
            key={r}
            variant={range === r ? 'default' : 'outline'}
            size="sm"
            onClick={() => setRange(r)}
            className="capitalize"
          >
            {r === 'daily' ? 'Day' : r === 'monthly' ? 'Month' : 'Quarter'}
          </Button>
        ))}
      </div>

      <div className="h-[calc(100vh-22rem)] min-h-[500px] overflow-hidden rounded-md border">
        <GanttProvider range={range} zoom={100} className="h-full">
          <GanttSidebar>
            {doctorBuckets.map((bucket) => (
              <GanttSidebarGroup key={bucket.id} name={bucket.name}>
                {bucket.features.map((feature) => (
                  <GanttSidebarItem
                    key={feature.id}
                    feature={feature}
                    onSelectItem={handleSelect}
                  />
                ))}
              </GanttSidebarGroup>
            ))}
          </GanttSidebar>

          <GanttTimeline>
            <GanttHeader />
            <GanttFeatureList>
              {doctorBuckets.map((bucket) => (
                <GanttFeatureListGroup key={bucket.id}>
                  <GanttFeatureRow features={bucket.features}>
                    {(feature) => (
                      <button
                        type="button"
                        onClick={() => handleSelect(feature.id)}
                        className="flex h-full w-full items-center gap-2 rounded px-2 text-left text-xs"
                      >
                        <div
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: feature.status.color }}
                        />
                        <span className="truncate">{feature.name}</span>
                      </button>
                    )}
                  </GanttFeatureRow>
                </GanttFeatureListGroup>
              ))}
            </GanttFeatureList>
            <GanttToday />
          </GanttTimeline>
        </GanttProvider>
      </div>
    </div>
  );
}
