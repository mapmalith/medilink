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
import { useCreateStaff, useUpdateStaff } from '@/hooks/use-staff';
import type { Staff, StaffDepartment } from '@/lib/types/staff';

const createStaffSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  department: z.enum(['ADMIN', 'CALL_CENTER'], {
    required_error: 'Department is required',
  }),
  phone: z.string().optional(),
});

const editStaffSchema = createStaffSchema.omit({ password: true });

type CreateStaffForm = z.infer<typeof createStaffSchema>;

interface StaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff?: Staff | null;
}

const selectClassName =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

export function StaffDialog({
  open,
  onOpenChange,
  staff,
}: StaffDialogProps) {
  const createMutation = useCreateStaff();
  const updateMutation = useUpdateStaff();
  const isEdit = !!staff;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateStaffForm>({
    resolver: zodResolver(isEdit ? editStaffSchema : createStaffSchema),
  });

  useEffect(() => {
    if (open) {
      if (staff) {
        reset({
          email: staff.user.email,
          password: '',
          firstName: staff.firstName,
          lastName: staff.lastName,
          department:
            (staff.department as StaffDepartment | undefined) ?? 'CALL_CENTER',
          phone: staff.user.phone || '',
        });
      } else {
        reset({
          email: '',
          password: '',
          firstName: '',
          lastName: '',
          department: 'CALL_CENTER',
          phone: '',
        });
      }
    }
  }, [open, staff, reset]);

  async function onSubmit(data: CreateStaffForm) {
    try {
      const payload = {
        ...data,
        phone: data.phone || undefined,
      };

      if (isEdit && staff) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...rest } = payload;
        await updateMutation.mutateAsync({ id: staff.id, ...rest });
        toast.success('Staff member updated successfully');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('Staff member created successfully');
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
          <DialogTitle>
            {isEdit ? 'Edit Staff Member' : 'Add Staff Member'}
          </DialogTitle>
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

          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <select
              id="department"
              {...register('department')}
              className={selectClassName}
            >
              <option value="CALL_CENTER">Call Center</option>
              <option value="ADMIN">Admin</option>
            </select>
            {errors.department && (
              <p className="text-sm text-destructive">
                {errors.department.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" {...register('phone')} />
          </div>

          {!isEdit && (
            <div className="space-y-2">
              <Label htmlFor="password">Temporary Password</Label>
              <Input id="password" type="password" {...register('password')} />
              {(errors as Record<string, { message?: string }>).password && (
                <p className="text-sm text-destructive">
                  {
                    (errors as Record<string, { message?: string }>).password
                      ?.message
                  }
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Staff member should change this on first login.
              </p>
            </div>
          )}

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
