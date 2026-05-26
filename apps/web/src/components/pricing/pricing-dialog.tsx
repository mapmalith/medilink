'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreatePricing, useUpdatePricing } from '@/hooks/use-pricing';
import type { Pricing } from '@/lib/types/pricing';

const pricingSchema = z.object({
  appointmentType: z.enum(['HOUSE_CALL', 'TELE_CONSULTATION', 'MEDICAL_VISIT'], {
    required_error: 'Appointment type is required',
  }),
  price: z.coerce.number().min(0.01, 'Price must be greater than 0'),
  currency: z.string().min(1, 'Currency is required'),
  effectiveFrom: z.string().min(1, 'Effective from date is required'),
  effectiveTo: z.string().optional(),
});

type PricingForm = z.infer<typeof pricingSchema>;

interface PricingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pricing?: Pricing | null;
}

export function PricingDialog({ open, onOpenChange, pricing }: PricingDialogProps) {
  const createMutation = useCreatePricing();
  const updateMutation = useUpdatePricing();
  const isEdit = !!pricing;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PricingForm>({
    resolver: zodResolver(pricingSchema),
    defaultValues: {
      appointmentType: 'HOUSE_CALL',
      currency: 'USD',
    },
  });

  useEffect(() => {
    if (open) {
      if (pricing) {
        reset({
          appointmentType: pricing.appointmentType,
          price: parseFloat(pricing.price),
          currency: pricing.currency,
          effectiveFrom: pricing.effectiveFrom.slice(0, 10),
          effectiveTo: pricing.effectiveTo?.slice(0, 10) || '',
        });
      } else {
        reset({
          appointmentType: 'HOUSE_CALL',
          price: undefined as unknown as number,
          currency: 'USD',
          effectiveFrom: '',
          effectiveTo: '',
        });
      }
    }
  }, [open, pricing, reset]);

  async function onSubmit(data: PricingForm) {
    try {
      const payload = {
        ...data,
        effectiveTo: data.effectiveTo || undefined,
      };

      if (isEdit && pricing) {
        await updateMutation.mutateAsync({ id: pricing.id, ...payload });
        toast.success('Pricing updated successfully');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('Pricing created successfully');
      }
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || 'Something went wrong';
      toast.error(message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Pricing' : 'Add Pricing'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="appointmentType">Appointment Type</Label>
            <select
              id="appointmentType"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              {...register('appointmentType')}
            >
              <option value="HOUSE_CALL">House Call</option>
              <option value="TELE_CONSULTATION">Tele-Consultation</option>
              <option value="MEDICAL_VISIT">Medical Visit</option>
            </select>
            {errors.appointmentType && (
              <p className="text-sm text-destructive">
                {errors.appointmentType.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register('price')}
              />
              {errors.price && (
                <p className="text-sm text-destructive">
                  {errors.price.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Input
                id="currency"
                placeholder="USD"
                {...register('currency')}
              />
              {errors.currency && (
                <p className="text-sm text-destructive">
                  {errors.currency.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="effectiveFrom">Effective From</Label>
              <Input
                id="effectiveFrom"
                type="date"
                {...register('effectiveFrom')}
              />
              {errors.effectiveFrom && (
                <p className="text-sm text-destructive">
                  {errors.effectiveFrom.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="effectiveTo">Effective To</Label>
              <Input
                id="effectiveTo"
                type="date"
                {...register('effectiveTo')}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? isEdit
                  ? 'Updating...'
                  : 'Creating...'
                : isEdit
                  ? 'Update'
                  : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
