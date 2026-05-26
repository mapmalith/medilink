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
import { useCreateHotel, useUpdateHotel } from '@/hooks/use-hotels';
import type { Hotel } from '@/lib/types/hotel';

const createHotelSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Hotel name is required'),
  address: z.string().optional(),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  creditLimit: z.coerce.number().min(0, 'Credit limit cannot be negative').optional(),
});

const editHotelSchema = createHotelSchema.omit({ password: true });

type CreateHotelForm = z.infer<typeof createHotelSchema>;

interface HotelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hotel?: Hotel | null;
}

export function HotelDialog({ open, onOpenChange, hotel }: HotelDialogProps) {
  const createMutation = useCreateHotel();
  const updateMutation = useUpdateHotel();
  const isEdit = !!hotel;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateHotelForm>({
    resolver: zodResolver(isEdit ? editHotelSchema : createHotelSchema),
  });

  useEffect(() => {
    if (open) {
      if (hotel) {
        reset({
          email: hotel.user.email,
          password: '',
          name: hotel.name,
          address: hotel.address || '',
          contactPerson: hotel.contactPerson || '',
          phone: hotel.phone || '',
          creditLimit: parseFloat(hotel.creditLimit),
        });
      } else {
        reset({
          email: '',
          password: '',
          name: '',
          address: '',
          contactPerson: '',
          phone: '',
          creditLimit: 0,
        });
      }
    }
  }, [open, hotel, reset]);

  async function onSubmit(data: CreateHotelForm) {
    try {
      if (isEdit && hotel) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...rest } = data;
        await updateMutation.mutateAsync({
          id: hotel.id,
          ...rest,
          address: rest.address || undefined,
          contactPerson: rest.contactPerson || undefined,
          phone: rest.phone || undefined,
        });
        toast.success('Hotel updated successfully');
      } else {
        await createMutation.mutateAsync({
          ...data,
          address: data.address || undefined,
          contactPerson: data.contactPerson || undefined,
          phone: data.phone || undefined,
        });
        toast.success('Hotel created successfully');
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Hotel' : 'Add Hotel'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Hotel Name</Label>
            <Input id="name" {...register('name')} />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" {...register('address')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contactPerson">Contact Person</Label>
              <Input id="contactPerson" {...register('contactPerson')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...register('phone')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register('email')} />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          {!isEdit && (
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" {...register('password')} />
              {(errors as Record<string, { message?: string }>).password && (
                <p className="text-sm text-destructive">
                  {(errors as Record<string, { message?: string }>).password?.message}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="creditLimit">Credit Limit ($)</Label>
            <Input
              id="creditLimit"
              type="number"
              step="0.01"
              {...register('creditLimit')}
            />
            {errors.creditLimit && (
              <p className="text-sm text-destructive">
                {errors.creditLimit.message}
              </p>
            )}
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
