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
import { Switch } from '@/components/ui/switch';
import { useCreateDoctor, useUpdateDoctor } from '@/hooks/use-doctors';
import type { Doctor } from '@/lib/types/doctor';

const createDoctorSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phone: z.string().optional(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  specialization: z.string().optional(),
  licenseNumber: z.string().min(1, 'License number is required'),
  whatsappNumber: z.string().optional(),
  isAvailableHouseCall: z.boolean(),
  isAvailableTeleConsult: z.boolean(),
  isAvailableMedicalVisit: z.boolean(),
});

const editDoctorSchema = createDoctorSchema.omit({ password: true });

type CreateDoctorForm = z.infer<typeof createDoctorSchema>;
type EditDoctorForm = z.infer<typeof editDoctorSchema>;

interface DoctorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doctor?: Doctor | null;
}

export function DoctorDialog({ open, onOpenChange, doctor }: DoctorDialogProps) {
  const createMutation = useCreateDoctor();
  const updateMutation = useUpdateDoctor();
  const isEdit = !!doctor;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateDoctorForm>({
    resolver: zodResolver(isEdit ? editDoctorSchema : createDoctorSchema),
    defaultValues: {
      isAvailableHouseCall: false,
      isAvailableTeleConsult: false,
      isAvailableMedicalVisit: false,
    },
  });

  useEffect(() => {
    if (open) {
      if (doctor) {
        reset({
          email: doctor.user.email,
          password: '',
          phone: doctor.user.phone || '',
          firstName: doctor.firstName,
          lastName: doctor.lastName,
          specialization: doctor.specialization || '',
          licenseNumber: doctor.licenseNumber,
          whatsappNumber: doctor.whatsappNumber || '',
          isAvailableHouseCall: doctor.isAvailableHouseCall,
          isAvailableTeleConsult: doctor.isAvailableTeleConsult,
          isAvailableMedicalVisit: doctor.isAvailableMedicalVisit,
        });
      } else {
        reset({
          email: '',
          password: '',
          phone: '',
          firstName: '',
          lastName: '',
          specialization: '',
          licenseNumber: '',
          whatsappNumber: '',
          isAvailableHouseCall: false,
          isAvailableTeleConsult: false,
          isAvailableMedicalVisit: false,
        });
      }
    }
  }, [open, doctor, reset]);

  async function onSubmit(data: CreateDoctorForm | EditDoctorForm) {
    try {
      if (isEdit && doctor) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...rest } = data as CreateDoctorForm;
        await updateMutation.mutateAsync({
          id: doctor.id,
          ...rest,
          phone: rest.phone || undefined,
          specialization: rest.specialization || undefined,
          whatsappNumber: rest.whatsappNumber || undefined,
        });
        toast.success('Doctor updated successfully');
      } else {
        const createData = data as CreateDoctorForm;
        await createMutation.mutateAsync({
          ...createData,
          phone: createData.phone || undefined,
          specialization: createData.specialization || undefined,
          whatsappNumber: createData.whatsappNumber || undefined,
        });
        toast.success('Doctor created successfully');
      }
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || 'Something went wrong';
      toast.error(message);
    }
  }

  const houseCall = watch('isAvailableHouseCall');
  const teleConsult = watch('isAvailableTeleConsult');
  const medicalVisit = watch('isAvailableMedicalVisit');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Doctor' : 'Add Doctor'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">
              Personal Info
            </h4>
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
                <p className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>
            {!isEdit && (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  {...register('password')}
                />
                {(errors as Record<string, { message?: string }>).password && (
                  <p className="text-sm text-destructive">
                    {(errors as Record<string, { message?: string }>).password?.message}
                  </p>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...register('phone')} />
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">
              Professional Info
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="specialization">Specialization</Label>
                <Input id="specialization" {...register('specialization')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="licenseNumber">License Number</Label>
                <Input id="licenseNumber" {...register('licenseNumber')} />
                {errors.licenseNumber && (
                  <p className="text-sm text-destructive">
                    {errors.licenseNumber.message}
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsappNumber">WhatsApp Number</Label>
              <Input id="whatsappNumber" {...register('whatsappNumber')} />
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">
              Availability
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="houseCall">House Call</Label>
                <Switch
                  id="houseCall"
                  checked={houseCall}
                  onCheckedChange={(checked: boolean) =>
                    setValue('isAvailableHouseCall', checked)
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="teleConsult">Tele-Consultation</Label>
                <Switch
                  id="teleConsult"
                  checked={teleConsult}
                  onCheckedChange={(checked: boolean) =>
                    setValue('isAvailableTeleConsult', checked)
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="medicalVisit">Medical Visit</Label>
                <Switch
                  id="medicalVisit"
                  checked={medicalVisit}
                  onCheckedChange={(checked: boolean) =>
                    setValue('isAvailableMedicalVisit', checked)
                  }
                />
              </div>
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
