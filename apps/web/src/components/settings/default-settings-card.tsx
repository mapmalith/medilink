'use client';

import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Settings2 } from 'lucide-react';
import { useUpdateConfig } from '@/hooks/use-config';
import {
  CONFIG_KEYS,
  CURRENCY_OPTIONS,
  type SystemConfig,
} from '@/lib/types/config';

interface DefaultSettingsCardProps {
  configMap: Map<string, SystemConfig>;
}

const selectClassName =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

export function DefaultSettingsCard({ configMap }: DefaultSettingsCardProps) {
  const updateMutation = useUpdateConfig();

  const currencyValue =
    configMap.get(CONFIG_KEYS.DEFAULT_CURRENCY)?.value ?? 'USD';

  async function handleCurrencyChange(
    e: React.ChangeEvent<HTMLSelectElement>,
  ) {
    const value = e.target.value;
    try {
      await updateMutation.mutateAsync({
        key: CONFIG_KEYS.DEFAULT_CURRENCY,
        value,
      });
      toast.success('Default currency updated');
    } catch {
      toast.error('Failed to update default currency');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="h-5 w-5" />
          Default Settings
        </CardTitle>
        <CardDescription>
          Platform-wide defaults for currencies and locales.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-w-sm">
          <Label htmlFor="defaultCurrency">Default Currency</Label>
          <select
            id="defaultCurrency"
            value={currencyValue}
            onChange={handleCurrencyChange}
            disabled={updateMutation.isPending}
            className={selectClassName}
          >
            {CURRENCY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Currency used for new pricing records and invoices.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
