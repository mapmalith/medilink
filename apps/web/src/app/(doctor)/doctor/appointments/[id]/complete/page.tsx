'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  MapPin,
  Phone,
  Pill,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  useCompleteConsultation,
  useDoctorAppointment,
} from '@/hooks/use-doctor-portal';
import { useDrugSearch, type DrugSearchResult } from '@/hooks/use-drugs';
import { APPOINTMENT_TYPE_LABEL } from '@/lib/types/appointment';

const FREQUENCY_OPTIONS = [
  'Once daily',
  'Twice daily',
  'Three times daily',
  'Four times daily',
  'Every 4 hours',
  'Every 6 hours',
  'Every 8 hours',
  'Every 12 hours',
  'As needed',
  'Before meals',
  'After meals',
  'At bedtime',
];

const selectClassName =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

const prescriptionSchema = z.object({
  drugId: z.string().min(1, 'Drug is required'),
  drugName: z.string().min(1),
  dosage: z.string().min(1, 'Dosage is required'),
  frequency: z.string().min(1, 'Frequency is required'),
  duration: z.string().min(1, 'Duration is required'),
  instructions: z.string().optional(),
});

const completionSchema = z
  .object({
    diagnosis: z.string().optional(),
    notes: z.string().optional(),
    followUpRequired: z.boolean(),
    followUpDate: z.string().optional(),
    followUpNotes: z.string().optional(),
    prescriptions: z.array(prescriptionSchema),
  })
  .refine(
    (data) => !data.followUpRequired || (data.followUpDate?.length ?? 0) > 0,
    {
      message: 'Follow-up date is required',
      path: ['followUpDate'],
    },
  );

type CompletionForm = z.infer<typeof completionSchema>;

export default function CompleteConsultationPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const appointmentId = params?.id ?? null;

  const { data: appointment, isLoading, error } = useDoctorAppointment(appointmentId);
  const completeMutation = useCompleteConsultation();

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CompletionForm>({
    resolver: zodResolver(completionSchema),
    defaultValues: {
      diagnosis: '',
      notes: '',
      followUpRequired: false,
      followUpDate: '',
      followUpNotes: '',
      prescriptions: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'prescriptions',
  });

  const followUpRequired = watch('followUpRequired');

  async function onSubmit(values: CompletionForm) {
    if (!appointmentId) return;
    try {
      await completeMutation.mutateAsync({
        id: appointmentId,
        payload: {
          diagnosis: values.diagnosis?.trim() || undefined,
          notes: values.notes?.trim() || undefined,
          followUpRequired: values.followUpRequired,
          followUpDate:
            values.followUpRequired && values.followUpDate
              ? new Date(values.followUpDate).toISOString()
              : undefined,
          followUpNotes:
            values.followUpRequired && values.followUpNotes?.trim()
              ? values.followUpNotes.trim()
              : undefined,
          prescriptions: values.prescriptions.map((p) => ({
            drugId: p.drugId,
            dosage: p.dosage,
            frequency: p.frequency,
            duration: p.duration,
            instructions: p.instructions?.trim() || undefined,
          })),
        },
      });
      toast.success('Consultation completed');
      router.push('/doctor/today');
    } catch (err) {
      const apiError = err as { response?: { data?: { message?: string } } };
      toast.error(
        apiError?.response?.data?.message ?? 'Failed to complete consultation',
      );
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="space-y-4">
        <Link
          href="/doctor/today"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to today
        </Link>
        <p className="text-sm text-destructive">
          Could not load appointment.
        </p>
      </div>
    );
  }

  const isInProgress = appointment.status === 'IN_PROGRESS';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link
            href="/doctor/today"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to today
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            Complete consultation
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/doctor/today')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || completeMutation.isPending || !isInProgress}
          >
            <CheckCircle2 className="mr-1 h-4 w-4" />
            {completeMutation.isPending ? 'Saving…' : 'Complete & save'}
          </Button>
        </div>
      </div>

      {!isInProgress && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          This appointment is in status{' '}
          <strong>{appointment.status}</strong>. Only in-progress appointments
          can be completed.
        </div>
      )}

      {/* Patient header (read-only) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Patient</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-lg font-semibold">
                {appointment.patient.firstName} {appointment.patient.lastName}
              </p>
              {appointment.patient.nationality && (
                <p className="text-xs text-muted-foreground">
                  {appointment.patient.nationality}
                </p>
              )}
              {appointment.patient.whatsappNumber && (
                <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  {appointment.patient.whatsappNumber}
                </p>
              )}
            </div>
            <div className="space-y-1 text-sm">
              <p>
                <span className="text-muted-foreground">Type:</span>{' '}
                {APPOINTMENT_TYPE_LABEL[appointment.appointmentType]}
              </p>
              <p>
                <span className="text-muted-foreground">When:</span>{' '}
                {format(parseISO(appointment.scheduledDate), 'EEE, MMM d, yyyy')}{' '}
                · {format(parseISO(appointment.scheduledTime), 'HH:mm')} ·{' '}
                {appointment.duration} min
              </p>
              {appointment.hotel && (
                <p className="flex items-center gap-1 text-muted-foreground">
                  <Building2 className="h-3 w-3" />
                  {appointment.hotel.name}
                </p>
              )}
              {appointment.visitAddress && (
                <p className="flex items-start gap-1 text-muted-foreground">
                  <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                  {appointment.visitAddress}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Diagnosis + notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Clinical notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="diagnosis">Diagnosis</Label>
            <Textarea
              id="diagnosis"
              rows={3}
              placeholder="Primary diagnosis and observations..."
              {...register('diagnosis')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              rows={4}
              placeholder="Additional notes, vitals, recommendations..."
              {...register('notes')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Follow-up */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Follow-up</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="follow-up-toggle" className="cursor-pointer">
                Follow-up required
              </Label>
              <p className="text-xs text-muted-foreground">
                Schedule a recommended follow-up date for the patient.
              </p>
            </div>
            <Switch
              id="follow-up-toggle"
              checked={followUpRequired}
              onCheckedChange={(checked: boolean) =>
                setValue('followUpRequired', checked, { shouldValidate: true })
              }
            />
          </div>
          {followUpRequired && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="followUpDate">Follow-up date</Label>
                <Input
                  id="followUpDate"
                  type="date"
                  {...register('followUpDate')}
                />
                {errors.followUpDate && (
                  <p className="text-xs text-destructive">
                    {errors.followUpDate.message}
                  </p>
                )}
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="followUpNotes">Follow-up notes</Label>
                <Textarea
                  id="followUpNotes"
                  rows={2}
                  placeholder="What should be reviewed at the follow-up?"
                  {...register('followUpNotes')}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prescriptions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Prescriptions</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              append({
                drugId: '',
                drugName: '',
                dosage: '',
                frequency: 'Once daily',
                duration: '',
                instructions: '',
              })
            }
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add prescription
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.length === 0 && (
            <div className="rounded-md border border-dashed p-6 text-center">
              <Pill className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No prescriptions added. Click &quot;Add prescription&quot; to
                include one.
              </p>
            </div>
          )}
          {fields.map((field, index) => (
            <PrescriptionRow
              key={field.id}
              index={index}
              register={register}
              setValue={setValue}
              watch={watch}
              onRemove={() => remove(index)}
              errors={errors.prescriptions?.[index]}
            />
          ))}
        </CardContent>
      </Card>
    </form>
  );
}

interface PrescriptionRowProps {
  index: number;
  // The form helpers are loosely typed here so we can keep this row self-
  // contained without re-declaring the whole form schema.
  register: ReturnType<typeof useForm<CompletionForm>>['register'];
  setValue: ReturnType<typeof useForm<CompletionForm>>['setValue'];
  watch: ReturnType<typeof useForm<CompletionForm>>['watch'];
  onRemove: () => void;
  errors?: {
    drugId?: { message?: string };
    dosage?: { message?: string };
    frequency?: { message?: string };
    duration?: { message?: string };
  };
}

function PrescriptionRow({
  index,
  register,
  setValue,
  watch,
  onRemove,
  errors,
}: PrescriptionRowProps) {
  const drugId = watch(`prescriptions.${index}.drugId`);
  const drugName = watch(`prescriptions.${index}.drugName`);

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-1">
          <Label className="text-xs">Drug</Label>
          {drugId ? (
            <SelectedDrugChip
              name={drugName}
              onClear={() => {
                setValue(`prescriptions.${index}.drugId`, '');
                setValue(`prescriptions.${index}.drugName`, '');
              }}
            />
          ) : (
            <DrugSearchPicker
              onSelect={(drug) => {
                setValue(`prescriptions.${index}.drugId`, drug.id, {
                  shouldValidate: true,
                });
                setValue(
                  `prescriptions.${index}.drugName`,
                  formatDrugLabel(drug),
                );
              }}
            />
          )}
          {errors?.drugId && (
            <p className="text-xs text-destructive">{errors.drugId.message}</p>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onRemove}
          aria-label="Remove prescription"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Dosage</Label>
          <Input
            placeholder="e.g. 500 mg"
            {...register(`prescriptions.${index}.dosage`)}
          />
          {errors?.dosage && (
            <p className="text-xs text-destructive">{errors.dosage.message}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Frequency</Label>
          <select
            className={selectClassName}
            {...register(`prescriptions.${index}.frequency`)}
          >
            {FREQUENCY_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          {errors?.frequency && (
            <p className="text-xs text-destructive">
              {errors.frequency.message}
            </p>
          )}
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Duration</Label>
          <Input
            placeholder="e.g. 7 days"
            {...register(`prescriptions.${index}.duration`)}
          />
          {errors?.duration && (
            <p className="text-xs text-destructive">
              {errors.duration.message}
            </p>
          )}
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Instructions</Label>
          <Input
            placeholder="e.g. After food"
            {...register(`prescriptions.${index}.instructions`)}
          />
        </div>
      </div>
    </div>
  );
}

function SelectedDrugChip({
  name,
  onClear,
}: {
  name: string;
  onClear: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/40 px-2.5 py-1.5">
      <div className="flex items-center gap-2 truncate">
        <Pill className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="truncate text-sm">{name}</span>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onClear}
        aria-label="Clear drug"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function DrugSearchPicker({
  onSelect,
}: {
  onSelect: (drug: DrugSearchResult) => void;
}) {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce the typed query so we don't hammer the API on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 200);
    return () => clearTimeout(t);
  }, [query]);

  // Close on outside click.
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const { data: results, isFetching } = useDrugSearch(
    debounced,
    debounced.length > 0,
  );

  const showDropdown = open && debounced.length > 0;

  const items = useMemo(() => results ?? [], [results]);

  return (
    <div ref={containerRef} className="relative">
      <Input
        placeholder="Search drugs by name..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-md border bg-popover shadow-md">
          {isFetching && (
            <p className="p-3 text-xs text-muted-foreground">Searching…</p>
          )}
          {!isFetching && items.length === 0 && (
            <p className="p-3 text-xs text-muted-foreground">
              No drugs match &quot;{debounced}&quot;.
            </p>
          )}
          {items.map((drug) => (
            <button
              key={drug.id}
              type="button"
              onClick={() => {
                onSelect(drug);
                setQuery('');
                setOpen(false);
              }}
              className="flex w-full flex-col items-start gap-0.5 border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted"
            >
              <span className="font-medium">{drug.name}</span>
              <span className="text-xs text-muted-foreground">
                {[drug.genericName, drug.strength, drug.dosageForm]
                  .filter(Boolean)
                  .join(' · ') || '—'}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function formatDrugLabel(drug: DrugSearchResult): string {
  const extras = [drug.strength, drug.dosageForm].filter(Boolean).join(' ');
  return extras ? `${drug.name} (${extras})` : drug.name;
}
