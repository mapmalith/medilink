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
import { useCreateDrug, useUpdateDrug } from '@/hooks/use-drugs';
import { DRUG_CATEGORIES, DOSAGE_FORMS, type Drug } from '@/lib/types/drug';

const drugSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  genericName: z.string().optional(),
  category: z.string().optional(),
  manufacturer: z.string().optional(),
  dosageForm: z.string().optional(),
  strength: z.string().optional(),
});

type DrugForm = z.infer<typeof drugSchema>;

interface DrugDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drug?: Drug | null;
}

const selectClassName =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

export function DrugDialog({ open, onOpenChange, drug }: DrugDialogProps) {
  const createMutation = useCreateDrug();
  const updateMutation = useUpdateDrug();
  const isEdit = !!drug;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DrugForm>({
    resolver: zodResolver(drugSchema),
  });

  useEffect(() => {
    if (open) {
      if (drug) {
        reset({
          name: drug.name,
          genericName: drug.genericName || '',
          category: drug.category || '',
          manufacturer: drug.manufacturer || '',
          dosageForm: drug.dosageForm || '',
          strength: drug.strength || '',
        });
      } else {
        reset({
          name: '',
          genericName: '',
          category: '',
          manufacturer: '',
          dosageForm: '',
          strength: '',
        });
      }
    }
  }, [open, drug, reset]);

  async function onSubmit(data: DrugForm) {
    try {
      const payload = {
        name: data.name,
        genericName: data.genericName || undefined,
        category: data.category || undefined,
        manufacturer: data.manufacturer || undefined,
        dosageForm: data.dosageForm || undefined,
        strength: data.strength || undefined,
      };

      if (isEdit && drug) {
        await updateMutation.mutateAsync({ id: drug.id, ...payload });
        toast.success('Drug updated successfully');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('Drug created successfully');
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
          <DialogTitle>{isEdit ? 'Edit Drug' : 'Add Drug'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register('name')} />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="genericName">Generic Name</Label>
            <Input id="genericName" {...register('genericName')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                {...register('category')}
                className={selectClassName}
              >
                <option value="">— Select category —</option>
                {DRUG_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="manufacturer">Manufacturer</Label>
              <Input id="manufacturer" {...register('manufacturer')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dosageForm">Dosage Form</Label>
              <select
                id="dosageForm"
                {...register('dosageForm')}
                className={selectClassName}
              >
                <option value="">— Select form —</option>
                {DOSAGE_FORMS.map((form) => (
                  <option key={form} value={form}>
                    {form}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="strength">Strength</Label>
              <Input
                id="strength"
                placeholder="e.g. 500mg"
                {...register('strength')}
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
