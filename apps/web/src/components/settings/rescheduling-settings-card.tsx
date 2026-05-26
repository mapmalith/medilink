'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RefreshCw } from 'lucide-react';
import { useUpdateConfig } from '@/hooks/use-config';
import { CONFIG_KEYS, type SystemConfig } from '@/lib/types/config';

interface ReschedulingSettingsCardProps {
  configMap: Map<string, SystemConfig>;
}

export function ReschedulingSettingsCard({
  configMap,
}: ReschedulingSettingsCardProps) {
  const updateMutation = useUpdateConfig();

  const maxReschedulesValue =
    configMap.get(CONFIG_KEYS.MAX_RESCHEDULES)?.value ?? '3';
  const noticeHoursValue =
    configMap.get(CONFIG_KEYS.RESCHEDULE_NOTICE_HOURS)?.value ?? '2';

  const [maxReschedules, setMaxReschedules] = useState(maxReschedulesValue);
  const [noticeHours, setNoticeHours] = useState(noticeHoursValue);

  useEffect(() => {
    setMaxReschedules(maxReschedulesValue);
  }, [maxReschedulesValue]);

  useEffect(() => {
    setNoticeHours(noticeHoursValue);
  }, [noticeHoursValue]);

  async function handleSave(key: string, value: string, label: string) {
    try {
      await updateMutation.mutateAsync({ key, value });
      toast.success(`${label} updated`);
    } catch {
      toast.error(`Failed to update ${label.toLowerCase()}`);
    }
  }

  async function handleMaxReschedulesBlur() {
    if (maxReschedules !== maxReschedulesValue) {
      await handleSave(
        CONFIG_KEYS.MAX_RESCHEDULES,
        maxReschedules,
        'Max reschedules',
      );
    }
  }

  async function handleNoticeHoursBlur() {
    if (noticeHours !== noticeHoursValue) {
      await handleSave(
        CONFIG_KEYS.RESCHEDULE_NOTICE_HOURS,
        noticeHours,
        'Minimum notice',
      );
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Rescheduling Settings
        </CardTitle>
        <CardDescription>
          Limits and notice requirements for rescheduling appointments.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="maxReschedules">Max Reschedules</Label>
          <Input
            id="maxReschedules"
            type="number"
            min="0"
            value={maxReschedules}
            onChange={(e) => setMaxReschedules(e.target.value)}
            onBlur={handleMaxReschedulesBlur}
          />
          <p className="text-xs text-muted-foreground">
            Maximum reschedules per appointment. Default: 3.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="noticeHours">Minimum Notice (hours)</Label>
          <Input
            id="noticeHours"
            type="number"
            min="0"
            value={noticeHours}
            onChange={(e) => setNoticeHours(e.target.value)}
            onBlur={handleNoticeHoursBlur}
          />
          <p className="text-xs text-muted-foreground">
            Minimum hours before appointment to allow rescheduling. Default: 2.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
