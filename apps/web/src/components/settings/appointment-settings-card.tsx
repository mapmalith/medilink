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
import { Switch } from '@/components/ui/switch';
import { Calendar } from 'lucide-react';
import { useUpdateConfig } from '@/hooks/use-config';
import { CONFIG_KEYS, type SystemConfig } from '@/lib/types/config';

interface AppointmentSettingsCardProps {
  configMap: Map<string, SystemConfig>;
}

export function AppointmentSettingsCard({
  configMap,
}: AppointmentSettingsCardProps) {
  const updateMutation = useUpdateConfig();

  const slotDurationValue =
    configMap.get(CONFIG_KEYS.SLOT_DURATION)?.value ?? '30';
  const paymentTimeoutValue =
    configMap.get(CONFIG_KEYS.PAYMENT_TIMEOUT)?.value ?? '60';
  const houseCallPaymentValue =
    configMap.get(CONFIG_KEYS.HOUSE_CALL_PAYMENT_REQUIRED)?.value ?? 'true';

  const [slotDuration, setSlotDuration] = useState(slotDurationValue);
  const [paymentTimeout, setPaymentTimeout] = useState(paymentTimeoutValue);

  useEffect(() => {
    setSlotDuration(slotDurationValue);
  }, [slotDurationValue]);

  useEffect(() => {
    setPaymentTimeout(paymentTimeoutValue);
  }, [paymentTimeoutValue]);

  async function handleSave(key: string, value: string, label: string) {
    try {
      await updateMutation.mutateAsync({ key, value });
      toast.success(`${label} updated`);
    } catch {
      toast.error(`Failed to update ${label.toLowerCase()}`);
    }
  }

  async function handleSlotDurationBlur() {
    if (slotDuration !== slotDurationValue) {
      await handleSave(CONFIG_KEYS.SLOT_DURATION, slotDuration, 'Slot duration');
    }
  }

  async function handlePaymentTimeoutBlur() {
    if (paymentTimeout !== paymentTimeoutValue) {
      await handleSave(
        CONFIG_KEYS.PAYMENT_TIMEOUT,
        paymentTimeout,
        'Payment timeout',
      );
    }
  }

  async function handleHouseCallToggle(checked: boolean) {
    await handleSave(
      CONFIG_KEYS.HOUSE_CALL_PAYMENT_REQUIRED,
      checked ? 'true' : 'false',
      'House call payment',
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Appointment Settings
        </CardTitle>
        <CardDescription>
          Configure slot duration and payment rules.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="slotDuration">Slot Duration (minutes)</Label>
            <Input
              id="slotDuration"
              type="number"
              min="5"
              step="5"
              value={slotDuration}
              onChange={(e) => setSlotDuration(e.target.value)}
              onBlur={handleSlotDurationBlur}
            />
            <p className="text-xs text-muted-foreground">
              Duration of each tele-consultation slot.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentTimeout">Payment Timeout (minutes)</Label>
            <Input
              id="paymentTimeout"
              type="number"
              min="1"
              value={paymentTimeout}
              onChange={(e) => setPaymentTimeout(e.target.value)}
              onBlur={handlePaymentTimeoutBlur}
            />
            <p className="text-xs text-muted-foreground">
              Minutes before unpaid appointments are auto-cancelled.
            </p>
          </div>
        </div>

        <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="houseCallPayment" className="text-sm font-medium">
              House Call Payment Required
            </Label>
            <p className="text-xs text-muted-foreground">
              Require payment before a house call visit is confirmed.
            </p>
          </div>
          <Switch
            id="houseCallPayment"
            checked={houseCallPaymentValue === 'true'}
            onCheckedChange={handleHouseCallToggle}
            disabled={updateMutation.isPending}
          />
        </div>
      </CardContent>
    </Card>
  );
}
