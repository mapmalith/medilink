'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Home,
  Loader2,
  MapPin,
  Phone,
  Plus,
  Search,
  Stethoscope,
  User,
  Video,
  Wallet,
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  useBookingAvailableSlots,
  useCreateAppointment,
  useCreatePatient,
  useCreatePaymentLink,
  usePatientSearch,
  usePayWithCredit,
} from '@/hooks/use-booking';
import type { AppointmentType, AvailableSlot } from '@/lib/types/appointment';
import type {
  CreatedAppointment,
  PatientSummary,
  PaymentLinkResult,
} from '@/lib/types/booking';
import { cn } from '@/lib/utils';

/**
 * Context passed into the shared booking wizard. Callers (hotel portal,
 * call-center portal) build this from their own data sources before
 * mounting the wizard.
 */
export interface BookingWizardContext {
  /** Default visit address used to pre-fill the House Call address field. */
  defaultAddress: string;
  /**
   * Credit info for the "Use hotel credit" option. Pass `null` to hide
   * that option entirely (e.g. call-center direct-patient flow).
   */
  credit: { limit: number; used: number } | null;
  /** Hotel id forwarded to createAppointment. Optional for call-center. */
  hotelId?: string;
  /**
   * Caller-type override for createAppointment's `bookedBy`. Only honoured
   * server-side for CALL_CENTER role.
   */
  bookedBy?: 'HOTEL' | 'PATIENT';
  /** Link target for "View all appointments" in the confirmation step. */
  appointmentsHref: string;
  /** Breadcrumb + heading copy. */
  header: {
    dashboardLabel: string;
    dashboardHref: string;
    title: string;
    subtitle: string;
  };
}

type WizardStep = 1 | 2 | 3 | 4;

const TYPE_OPTIONS: {
  value: AppointmentType;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    value: 'HOUSE_CALL',
    label: 'House Call',
    description: 'Doctor visits the guest at the hotel',
    icon: Home,
  },
  {
    value: 'TELE_CONSULTATION',
    label: 'Tele-Consultation',
    description: 'Video consultation from a time slot',
    icon: Video,
  },
  {
    value: 'MEDICAL_VISIT',
    label: 'Medical Visit',
    description: 'Guest visits a medical facility',
    icon: Stethoscope,
  },
];

function formatMoney(amount: number | null, currency = 'USD') {
  if (amount === null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function BookingWizard({ context }: { context: BookingWizardContext }) {
  const [step, setStep] = useState<WizardStep>(1);

  // Step 1
  const [patient, setPatient] = useState<PatientSummary | null>(null);

  // Step 2
  const [appointmentType, setAppointmentType] =
    useState<AppointmentType | null>(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [visitAddress, setVisitAddress] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [notes, setNotes] = useState('');

  // Step 3 / 4
  const [createdAppointment, setCreatedAppointment] =
    useState<CreatedAppointment | null>(null);
  const [paymentLink, setPaymentLink] = useState<PaymentLinkResult | null>(
    null,
  );

  function reset() {
    setStep(1);
    setPatient(null);
    setAppointmentType(null);
    setDate('');
    setTime('');
    setVisitAddress('');
    setSelectedSlot(null);
    setNotes('');
    setCreatedAppointment(null);
    setPaymentLink(null);
  }

  const canProceedFromStep2 = (() => {
    if (!appointmentType) return false;
    if (appointmentType === 'TELE_CONSULTATION') return !!selectedSlot;
    return !!date && !!time;
  })();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link href={context.header.dashboardHref} className="hover:underline">
              {context.header.dashboardLabel}
            </Link>
            <span>/</span>
            <span>Book New</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            {context.header.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {context.header.subtitle}
          </p>
        </div>
      </div>

      <StepHeader step={step} />

      {step === 1 && (
        <PatientStep
          patient={patient}
          onSelect={(p) => {
            setPatient(p);
            if (!visitAddress && context.defaultAddress)
              setVisitAddress(context.defaultAddress);
          }}
          onNext={() => setStep(2)}
        />
      )}

      {step === 2 && (
        <AppointmentStep
          type={appointmentType}
          setType={(t) => {
            setAppointmentType(t);
            setSelectedSlot(null);
          }}
          date={date}
          setDate={setDate}
          time={time}
          setTime={setTime}
          visitAddress={visitAddress}
          setVisitAddress={setVisitAddress}
          notes={notes}
          setNotes={setNotes}
          selectedSlot={selectedSlot}
          setSelectedSlot={setSelectedSlot}
          defaultAddress={context.defaultAddress}
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
          canProceed={canProceedFromStep2}
        />
      )}

      {step === 3 && patient && appointmentType && (
        <PaymentStep
          context={context}
          patient={patient}
          appointmentType={appointmentType}
          date={date}
          time={time}
          visitAddress={visitAddress}
          notes={notes}
          selectedSlot={selectedSlot}
          onBack={() => setStep(2)}
          onDone={(appt, link) => {
            setCreatedAppointment(appt);
            setPaymentLink(link);
            setStep(4);
          }}
        />
      )}

      {step === 4 && createdAppointment && (
        <ConfirmationStep
          appointment={createdAppointment}
          paymentLink={paymentLink}
          onBookAnother={reset}
          appointmentsHref={context.appointmentsHref}
        />
      )}
    </div>
  );
}

// ─── Step header ────────────────────────────────────────────────────────────
function StepHeader({ step }: { step: WizardStep }) {
  const steps = [
    { id: 1, label: 'Patient' },
    { id: 2, label: 'Appointment' },
    { id: 3, label: 'Payment' },
    { id: 4, label: 'Confirmation' },
  ] as const;
  return (
    <div className="flex items-center justify-between rounded-lg border bg-card p-4">
      {steps.map((s, idx) => {
        const isActive = step === s.id;
        const isDone = step > s.id;
        return (
          <div key={s.id} className="flex flex-1 items-center">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold',
                  isDone && 'bg-primary text-primary-foreground',
                  isActive && 'bg-primary text-primary-foreground ring-4 ring-primary/20',
                  !isActive && !isDone && 'bg-muted text-muted-foreground',
                )}
              >
                {isDone ? <Check className="h-4 w-4" /> : s.id}
              </div>
              <span
                className={cn(
                  'text-sm font-medium',
                  (isActive || isDone) ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {s.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div
                className={cn(
                  'mx-4 h-[2px] flex-1',
                  isDone ? 'bg-primary' : 'bg-muted',
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 1 — Patient ───────────────────────────────────────────────────────
function PatientStep({
  patient,
  onSelect,
  onNext,
}: {
  patient: PatientSummary | null;
  onSelect: (p: PatientSummary) => void;
  onNext: () => void;
}) {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'search' | 'create'>('search');
  const { data: results, isLoading } = usePatientSearch(query);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Patient Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            type="button"
            variant={mode === 'search' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('search')}
          >
            <Search className="mr-2 h-4 w-4" />
            Search existing
          </Button>
          <Button
            type="button"
            variant={mode === 'create' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('create')}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create new
          </Button>
        </div>

        {mode === 'search' && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, passport or phone"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="divide-y rounded-md border">
              {isLoading ? (
                <div className="space-y-2 p-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : !results || results.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No patients found. Try creating a new one.
                </div>
              ) : (
                results.map((p) => {
                  const isSelected = patient?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => onSelect(p)}
                      className={cn(
                        'flex w-full items-start justify-between gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/50',
                        isSelected && 'bg-primary/5',
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium">
                            {p.firstName} {p.lastName}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            {p.emailAddress && <span>{p.emailAddress}</span>}
                            {p.whatsappNumber && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {p.whatsappNumber}
                              </span>
                            )}
                            {p.nationality && <span>· {p.nationality}</span>}
                          </div>
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {mode === 'create' && <NewPatientForm onCreated={onSelect} />}

        <div className="flex justify-end pt-2">
          <Button onClick={onNext} disabled={!patient}>
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function NewPatientForm({
  onCreated,
}: {
  onCreated: (p: PatientSummary) => void;
}) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    whatsappNumber: '',
    passportNumber: '',
    nationality: '',
  });
  const createPatient = useCreatePatient();

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.email || !form.password) {
      toast.error('First name, last name, email and password are required');
      return;
    }
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    try {
      const patient = await createPatient.mutateAsync({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        phone: form.phone || undefined,
        whatsappNumber: form.whatsappNumber || undefined,
        passportNumber: form.passportNumber || undefined,
        nationality: form.nationality || undefined,
      });
      toast.success('Patient created');
      onCreated(patient);
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? 'Failed to create patient';
      toast.error(message);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-md border p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="firstName">First name</Label>
          <Input
            id="firstName"
            value={form.firstName}
            onChange={(e) => update('firstName', e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="lastName">Last name</Label>
          <Input
            id="lastName"
            value={form.lastName}
            onChange={(e) => update('lastName', e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={form.phone}
            onChange={(e) => update('phone', e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="whatsappNumber">WhatsApp</Label>
          <Input
            id="whatsappNumber"
            value={form.whatsappNumber}
            onChange={(e) => update('whatsappNumber', e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="passportNumber">Passport #</Label>
          <Input
            id="passportNumber"
            value={form.passportNumber}
            onChange={(e) => update('passportNumber', e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="nationality">Nationality</Label>
          <Input
            id="nationality"
            value={form.nationality}
            onChange={(e) => update('nationality', e.target.value)}
          />
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={createPatient.isPending}>
          {createPatient.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Create patient
        </Button>
      </div>
    </form>
  );
}

// ─── Step 2 — Appointment ───────────────────────────────────────────────────
function AppointmentStep({
  type,
  setType,
  date,
  setDate,
  time,
  setTime,
  visitAddress,
  setVisitAddress,
  notes,
  setNotes,
  selectedSlot,
  setSelectedSlot,
  defaultAddress,
  onBack,
  onNext,
  canProceed,
}: {
  type: AppointmentType | null;
  setType: (t: AppointmentType) => void;
  date: string;
  setDate: (v: string) => void;
  time: string;
  setTime: (v: string) => void;
  visitAddress: string;
  setVisitAddress: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  selectedSlot: AvailableSlot | null;
  setSelectedSlot: (s: AvailableSlot | null) => void;
  defaultAddress: string;
  onBack: () => void;
  onNext: () => void;
  canProceed: boolean;
}) {
  const { data: slots, isLoading: slotsLoading } = useBookingAvailableSlots(
    date || null,
    type,
  );

  const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Appointment Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-3">
          {TYPE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isActive = type === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setType(opt.value)}
                className={cn(
                  'flex flex-col items-start gap-2 rounded-md border p-4 text-left transition-all hover:border-primary/60',
                  isActive && 'border-primary bg-primary/5 ring-2 ring-primary/20',
                )}
              >
                <Icon className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {opt.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {type && <Separator />}

        {type === 'HOUSE_CALL' && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="hc-date">Preferred date</Label>
                <Input
                  id="hc-date"
                  type="date"
                  min={today}
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    if (time && e.target.value) {
                      const parsed = parseISO(time);
                      if (!Number.isNaN(parsed.getTime())) {
                        const [h, m] = format(parsed, 'HH:mm').split(':');
                        setTime(`${e.target.value}T${h}:${m}:00`);
                      }
                    }
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="hc-time">Preferred time</Label>
                <Input
                  id="hc-time"
                  type="time"
                  value={time ? format(parseISO(time), 'HH:mm') : ''}
                  onChange={(e) => {
                    if (!date) return;
                    setTime(`${date}T${e.target.value}:00`);
                  }}
                  disabled={!date}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="hc-address">Visit address</Label>
              <Textarea
                id="hc-address"
                rows={2}
                value={visitAddress}
                onChange={(e) => setVisitAddress(e.target.value)}
                placeholder={defaultAddress || 'Hotel address'}
              />
              <p className="text-xs text-muted-foreground">
                Defaults to the hotel address. Edit if the guest is elsewhere.
              </p>
            </div>
          </div>
        )}

        {type === 'MEDICAL_VISIT' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="mv-date">Preferred date</Label>
              <Input
                id="mv-date"
                type="date"
                min={today}
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  if (time && e.target.value) {
                    const parsed = parseISO(time);
                    if (!Number.isNaN(parsed.getTime())) {
                      const [h, m] = format(parsed, 'HH:mm').split(':');
                      setTime(`${e.target.value}T${h}:${m}:00`);
                    }
                  }
                }}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="mv-time">Preferred time</Label>
              <Input
                id="mv-time"
                type="time"
                value={time ? format(parseISO(time), 'HH:mm') : ''}
                onChange={(e) => {
                  if (!date) return;
                  setTime(`${date}T${e.target.value}:00`);
                }}
                disabled={!date}
              />
            </div>
          </div>
        )}

        {type === 'TELE_CONSULTATION' && (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="tc-date">Select date</Label>
              <Input
                id="tc-date"
                type="date"
                min={today}
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setSelectedSlot(null);
                }}
                className="sm:max-w-xs"
              />
            </div>

            {date && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Available slots</Label>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span className="h-3 w-3 rounded bg-blue-500" />
                      Available
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-3 w-3 rounded bg-muted-foreground/30" />
                      Booked
                    </span>
                  </div>
                </div>
                {slotsLoading ? (
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <Skeleton key={i} className="h-16" />
                    ))}
                  </div>
                ) : !slots || slots.length === 0 ? (
                  <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                    No slots available on this date.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {slots.map((slot) => {
                      const isActive = selectedSlot?.id === slot.id;
                      return (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={cn(
                            'flex flex-col items-center gap-0.5 rounded-md border p-2 text-xs transition-all',
                            'border-blue-500/30 bg-blue-500/10 text-blue-700 hover:bg-blue-500/20',
                            isActive &&
                              'border-blue-600 bg-blue-600 text-white hover:bg-blue-600',
                          )}
                        >
                          <span className="font-medium">
                            {format(parseISO(slot.startTime), 'HH:mm')}
                          </span>
                          <span className="truncate opacity-80">
                            Dr. {slot.doctor.lastName}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {selectedSlot && (
              <div className="rounded-md bg-muted p-3 text-sm">
                <p className="font-medium">
                  Dr. {selectedSlot.doctor.firstName}{' '}
                  {selectedSlot.doctor.lastName}
                </p>
                {selectedSlot.doctor.specialization && (
                  <p className="text-xs text-muted-foreground">
                    {selectedSlot.doctor.specialization}
                  </p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  Auto-assigned from selected slot
                </p>
              </div>
            )}
          </div>
        )}

        {type && (
          <div className="space-y-1">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Symptoms, special requests, etc."
            />
          </div>
        )}

        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button onClick={onNext} disabled={!canProceed}>
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Step 3 — Payment ───────────────────────────────────────────────────────
function PaymentStep({
  context,
  patient,
  appointmentType,
  date,
  time,
  visitAddress,
  notes,
  selectedSlot,
  onBack,
  onDone,
}: {
  context: BookingWizardContext;
  patient: PatientSummary;
  appointmentType: AppointmentType;
  date: string;
  time: string;
  visitAddress: string;
  notes: string;
  selectedSlot: AvailableSlot | null;
  onBack: () => void;
  onDone: (appt: CreatedAppointment, link: PaymentLinkResult | null) => void;
}) {
  const createAppointment = useCreateAppointment();
  const createLink = useCreatePaymentLink();
  const payWithCredit = usePayWithCredit();

  const creditRemaining = context.credit
    ? context.credit.limit - context.credit.used
    : 0;

  const [draft, setDraft] = useState<CreatedAppointment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState<PaymentLinkResult | null>(
    null,
  );
  const [copied, setCopied] = useState(false);

  async function ensureAppointment(): Promise<CreatedAppointment | null> {
    if (draft) return draft;
    try {
      const appt = await createAppointment.mutateAsync({
        patientId: patient.id,
        appointmentType,
        scheduledDate:
          appointmentType === 'TELE_CONSULTATION' ? undefined : date,
        scheduledTime:
          appointmentType === 'TELE_CONSULTATION' ? undefined : time,
        timeSlotId:
          appointmentType === 'TELE_CONSULTATION'
            ? selectedSlot?.id
            : undefined,
        visitAddress:
          appointmentType === 'HOUSE_CALL' ? visitAddress : undefined,
        notes: notes || undefined,
        hotelId: context.hotelId,
        bookedBy: context.bookedBy,
      });
      setDraft(appt);
      return appt;
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? 'Failed to create appointment';
      setError(message);
      toast.error(message);
      return null;
    }
  }

  async function handlePayWithCredit() {
    const appt = await ensureAppointment();
    if (!appt) return;
    try {
      await payWithCredit.mutateAsync(appt.id);
      toast.success('Paid with hotel credit');
      onDone(appt, null);
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? 'Credit payment failed';
      toast.error(message);
    }
  }

  async function handleGenerateLink() {
    const appt = await ensureAppointment();
    if (!appt) return;
    try {
      const link = await createLink.mutateAsync(appt.id);
      setGeneratedLink(link);
      toast.success('Payment link generated');
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? 'Failed to generate link';
      toast.error(message);
    }
  }

  function handleContinueWithLink() {
    if (draft && generatedLink) {
      onDone(draft, generatedLink);
    }
  }

  async function handleCopy() {
    if (!generatedLink) return;
    await navigator.clipboard.writeText(generatedLink.url);
    setCopied(true);
    toast.success('Link copied');
    setTimeout(() => setCopied(false), 2000);
  }

  const amount = draft?.amountCharged ?? null;
  const currency = draft?.currency ?? 'USD';
  const canUseCredit =
    !!context.credit && amount !== null && creditRemaining >= amount;

  const scheduledTimeIso =
    appointmentType === 'TELE_CONSULTATION'
      ? selectedSlot?.startTime ?? null
      : time || null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Payment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 rounded-md border p-4 text-sm">
          <SummaryRow
            label="Patient"
            value={`${patient.firstName} ${patient.lastName}`}
          />
          <SummaryRow
            label="Type"
            value={
              TYPE_OPTIONS.find((o) => o.value === appointmentType)?.label ??
              appointmentType
            }
          />
          {scheduledTimeIso && (
            <SummaryRow
              label="When"
              value={format(parseISO(scheduledTimeIso), 'EEE dd MMM · HH:mm')}
            />
          )}
          {appointmentType === 'TELE_CONSULTATION' && selectedSlot && (
            <SummaryRow
              label="Doctor"
              value={`Dr. ${selectedSlot.doctor.firstName} ${selectedSlot.doctor.lastName}`}
            />
          )}
          {appointmentType === 'HOUSE_CALL' && visitAddress && (
            <SummaryRow label="Address" value={visitAddress} />
          )}
          <Separator className="my-2" />
          <div className="flex items-center justify-between text-base font-semibold">
            <span>Total</span>
            <span>{formatMoney(amount, currency)}</span>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {!generatedLink && (
          <div
            className={cn(
              'grid gap-3',
              context.credit ? 'sm:grid-cols-2' : 'sm:grid-cols-1',
            )}
          >
            {context.credit && (
              <button
                type="button"
                disabled={
                  createAppointment.isPending ||
                  payWithCredit.isPending ||
                  !canUseCredit
                }
                onClick={handlePayWithCredit}
                className={cn(
                  'flex flex-col items-start gap-2 rounded-md border p-4 text-left transition-all hover:border-primary/60 disabled:cursor-not-allowed disabled:opacity-60',
                )}
              >
                <Wallet className="h-5 w-5 text-indigo-600" />
                <div>
                  <p className="text-sm font-medium">Use hotel credit</p>
                  <p className="text-xs text-muted-foreground">
                    Remaining credit: {formatMoney(creditRemaining, currency)}
                  </p>
                  {!canUseCredit && amount !== null && (
                    <p className="mt-1 text-xs text-destructive">
                      Insufficient credit for this booking
                    </p>
                  )}
                </div>
                {payWithCredit.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </button>
            )}

            <button
              type="button"
              disabled={createAppointment.isPending || createLink.isPending}
              onClick={handleGenerateLink}
              className={cn(
                'flex flex-col items-start gap-2 rounded-md border p-4 text-left transition-all hover:border-primary/60 disabled:cursor-not-allowed disabled:opacity-60',
              )}
            >
              <MapPin className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-sm font-medium">Generate payment link</p>
                <p className="text-xs text-muted-foreground">
                  Share the link with the guest to pay online
                </p>
              </div>
              {createLink.isPending && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </button>
          </div>
        )}

        {generatedLink && (
          <div className="space-y-3 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              Payment link generated
            </div>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={generatedLink.url}
                className="font-mono text-xs"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Expires{' '}
              {format(parseISO(generatedLink.expiry), 'EEE dd MMM · HH:mm')}
            </p>
            <div className="flex justify-end">
              <Button onClick={handleContinueWithLink}>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <div className="flex justify-between pt-2">
          <Button
            variant="outline"
            onClick={onBack}
            disabled={
              !!draft || createAppointment.isPending || payWithCredit.isPending
            }
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

// ─── Step 4 — Confirmation ─────────────────────────────────────────────────
function ConfirmationStep({
  appointment,
  paymentLink,
  onBookAnother,
  appointmentsHref,
}: {
  appointment: CreatedAppointment;
  paymentLink: PaymentLinkResult | null;
  onBookAnother: () => void;
  appointmentsHref: string;
}) {
  const [copied, setCopied] = useState(false);
  const reference = appointment.id.slice(0, 8).toUpperCase();

  async function handleCopyLink() {
    if (!paymentLink) return;
    await navigator.clipboard.writeText(paymentLink.url);
    setCopied(true);
    toast.success('Link copied');
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card>
      <CardContent className="space-y-5 pt-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold">Appointment confirmed</h2>
          <p className="text-sm text-muted-foreground">Reference number</p>
          <Badge variant="secondary" className="font-mono text-sm">
            {reference}
          </Badge>
        </div>

        <div className="space-y-2 rounded-md border p-4 text-sm">
          <SummaryRow
            label="Patient"
            value={`${appointment.patient.firstName} ${appointment.patient.lastName}`}
          />
          <SummaryRow
            label="Type"
            value={
              TYPE_OPTIONS.find((o) => o.value === appointment.appointmentType)
                ?.label ?? appointment.appointmentType
            }
          />
          <SummaryRow
            label="When"
            value={format(
              parseISO(appointment.scheduledTime),
              'EEE dd MMM · HH:mm',
            )}
          />
          {appointment.doctor && (
            <SummaryRow
              label="Doctor"
              value={`Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}`}
            />
          )}
          {appointment.visitAddress && (
            <SummaryRow label="Address" value={appointment.visitAddress} />
          )}
          <SummaryRow
            label="Status"
            value={paymentLink ? 'Awaiting payment' : 'Confirmed'}
          />
          <SummaryRow
            label="Amount"
            value={formatMoney(appointment.amountCharged, appointment.currency)}
          />
        </div>

        {paymentLink && (
          <div className="space-y-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-4">
            <p className="text-sm font-medium">Payment link</p>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={paymentLink.url}
                className="font-mono text-xs"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleCopyLink}
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Link
            href={appointmentsHref}
            className={buttonVariants({ variant: 'outline' })}
          >
            View all appointments
          </Link>
          <Button onClick={onBookAnother}>
            <Plus className="mr-2 h-4 w-4" />
            Book another
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
