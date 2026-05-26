'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { useConfigMap } from '@/hooks/use-config';
import { AppointmentSettingsCard } from '@/components/settings/appointment-settings-card';
import { ReschedulingSettingsCard } from '@/components/settings/rescheduling-settings-card';
import { DefaultSettingsCard } from '@/components/settings/default-settings-card';

export default function SettingsPage() {
  const { map: configMap, isLoading } = useConfigMap();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">System Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure platform-wide defaults and business rules.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <div className="space-y-6">
          <AppointmentSettingsCard configMap={configMap} />
          <ReschedulingSettingsCard configMap={configMap} />
          <DefaultSettingsCard configMap={configMap} />
        </div>
      )}
    </div>
  );
}
