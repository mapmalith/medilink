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
import { useCreatePatient, useUpdatePatient } from '@/hooks/use-patients';
import { useHotelList } from '@/hooks/use-hotels';
import type { Patient } from '@/lib/types/patient';

const createPatientSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phone: z.string().optional(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  dateOfBirth: z.string().optional(),
  nationality: z.string().optional(),
  passportNumber: z.string().optional(),
  whatsappNumber: z.string().optional(),
  hotelId: z.string().optional(),
});

const editPatientSchema = createPatientSchema.omit({ password: true });

type CreatePatientForm = z.infer<typeof createPatientSchema>;

interface PatientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient?: Patient | null;
}

export function PatientDialog({
  open,
  onOpenChange,
  patient,
}: PatientDialogProps) {
  const createMutation = useCreatePatient();
  const updateMutation = useUpdatePatient();
  const { data: hotels } = useHotelList();
  const isEdit = !!patient;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreatePatientForm>({
    resolver: zodResolver(isEdit ? editPatientSchema : createPatientSchema),
  });

  useEffect(() => {
    if (open) {
      if (patient) {
        reset({
          email: patient.user.email,
          password: '',
          phone: patient.user.phone || '',
          firstName: patient.firstName,
          lastName: patient.lastName,
          dateOfBirth: patient.dateOfBirth
            ? patient.dateOfBirth.split('T')[0]
            : '',
          nationality: patient.nationality || '',
          passportNumber: patient.passportNumber || '',
          whatsappNumber: patient.whatsappNumber || '',
          hotelId: patient.hotel?.id || '',
        });
      } else {
        reset({
          email: '',
          password: '',
          phone: '',
          firstName: '',
          lastName: '',
          dateOfBirth: '',
          nationality: '',
          passportNumber: '',
          whatsappNumber: '',
          hotelId: '',
        });
      }
    }
  }, [open, patient, reset]);

  async function onSubmit(data: CreatePatientForm) {
    try {
      const payload = {
        ...data,
        phone: data.phone || undefined,
        dateOfBirth: data.dateOfBirth || undefined,
        nationality: data.nationality || undefined,
        passportNumber: data.passportNumber || undefined,
        whatsappNumber: data.whatsappNumber || undefined,
        hotelId: data.hotelId || undefined,
      };

      if (isEdit && patient) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...rest } = payload;
        await updateMutation.mutateAsync({
          id: patient.id,
          ...rest,
        });
        toast.success('Patient updated successfully');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('Patient created successfully');
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Patient' : 'Add Patient'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input id="firstName" {...register('firstName')} />
              {errors.firstName && (
                <p className="text-sm text-destructive">
                  {errors.firstName.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input id="lastName" {...register('lastName')} />
              {errors.lastName && (
                <p className="text-sm text-destructive">
                  {errors.lastName.message}
                </p>
              )}
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
                  {
                    (errors as Record<string, { message?: string }>).password
                      ?.message
                  }
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...register('phone')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsappNumber">WhatsApp</Label>
              <Input id="whatsappNumber" {...register('whatsappNumber')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input
                id="dateOfBirth"
                type="date"
                {...register('dateOfBirth')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nationality">Nationality</Label>
              <Input id="nationality" {...register('nationality')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="passportNumber">Passport Number</Label>
            <Input id="passportNumber" {...register('passportNumber')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hotelId">Hotel</Label>
            <select
              id="hotelId"
              {...register('hotelId')}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">— None —</option>
              {hotels?.map((hotel) => (
                <option key={hotel.id} value={hotel.id}>
                  {hotel.name}
                </option>
              ))}
            </select>
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
