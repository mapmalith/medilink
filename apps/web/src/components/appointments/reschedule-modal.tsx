'use client';

import { useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useAvailableSlots,
  useRescheduleAppointment,
} from '@/hooks/use-appointments';
import { useDoctorList } from '@/hooks/use-doctors';
import type { Appointment } from '@/lib/types/appointment';
import { APPOINTMENT_TYPE_LABEL } from '@/lib/types/appointment';

const selectClassName =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

interface RescheduleModalProps {
  appointment: Appointment | null;
  onClose: () => void;
  /**
   * Optional — fired with the updated appointment after a successful
   * reschedule, before `onClose` is called. Used by the call-center
   * reschedule page to show a read-back confirmation panel.
   */
  onRescheduled?: (updated: Appointment) => void;
}

export function RescheduleModal({
  appointment,
  onClose,
  onRescheduled,
}: RescheduleModalProps) {
  const rescheduleMutation = useRescheduleAppointment();
  const { data: doctors } = useDoctorList();

  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState(''); // HH:mm
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [newDoctorId, setNewDoctorId] = useState('');
  const [reason, setReason] = useState('');

  const isTeleConsult = appointment?.appointmentType === 'TELE_CONSULTATION';

  // Reset form whenever a new appointment is opened.
  useEffect(() => {
    if (appointment) {
      setNewDate('');
      setNewTime('');
      setSelectedSlotId('');
      setNewDoctorId('');
      setReason('');
    }
  }, [appointment?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: slots, isLoading: slotsLoading } = useAvailableSlots(
    isTeleConsult ? appointment?.id : null,
    isTeleConsult ? newDate || null : null,
  );

  const selectedSlot = useMemo(
    () => slots?.find((s) => s.id === selectedSlotId) ?? null,
    [slots, selectedSlotId],
  );

  async function handleSubmit() {
    if (!appointment) return;
    if (!reason.trim()) {
      toast.error('Please provide a reason');
      return;
    }
    if (!newDate) {
      toast.error('Please choose a new date');
      return;
    }

    let newTimeIso: string;
    let newTimeSlotId: string | undefined;

    if (isTeleConsult) {
      if (!selectedSlot) {
        toast.error('Please select an available slot');
        return;
      }
      newTimeIso = selectedSlot.startTime;
      newTimeSlotId = selectedSlot.id;
    } else {
      if (!newTime) {
        toast.error('Please choose a new time');
        return;
      }
      // Combine date + time into an ISO datetime (local time).
      const combined = new Date(`${newDate}T${newTime}:00`);
      if (Number.isNaN(combined.getTime())) {
        toast.error('Invalid date or time');
        return;
      }
      newTimeIso = combined.toISOString();
    }

    try {
      const updated = await rescheduleMutation.mutateAsync({
        id: appointment.id,
        newDate,
        newTime: newTimeIso,
        newTimeSlotId,
        newDoctorId:
          !isTeleConsult && newDoctorId ? newDoctorId : undefined,
        reason: reason.trim(),
      });
      toast.success('Appointment rescheduled');
      onRescheduled?.(updated);
      onClose();
    } catch (err) {
      const apiError = err as {
        response?: { data?: { message?: string } };
      };
      const message =
        apiError?.response?.data?.message ?? 'Failed to reschedule';
      toast.error(
        Array.isArray(message) ? message.join(', ') : String(message),
      );
    }
  }

  if (!appointment) {
    return (
      <Dialog open={false} onOpenChange={onClose}>
        <DialogContent />
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Reschedule Appointment</DialogTitle>
          <DialogDescription>
            Move this appointment to a new date and time.
          </DialogDescription>
        </DialogHeader>

        {/* Current appointment summary */}
        <div className="rounded-md border bg-muted/30 p-3 text-sm">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <div>
              <span className="text-muted-foreground">Patient:</span>{' '}
              <span className="font-medium">
                {appointment.patient.firstName} {appointment.patient.lastName}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Type:</span>{' '}
              <span className="font-medium">
                {APPOINTMENT_TYPE_LABEL[appointment.appointmentType]}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Date:</span>{' '}
              {format(parseISO(appointment.scheduledDate), 'MMM d, yyyy')}
            </div>
            <div>
              <span className="text-muted-foreground">Time:</span>{' '}
              {format(parseISO(appointment.scheduledTime), 'HH:mm')}
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">Doctor:</span>{' '}
              {appointment.doctor
                ? `Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}`
                : 'Not assigned'}
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">Reschedules used:</span>{' '}
              {appointment.rescheduleCount}
            </div>
          </div>
        </div>

        {/* New date */}
        <div className="space-y-2">
          <Label htmlFor="reschedule-date">New date</Label>
          <Input
            id="reschedule-date"
            type="date"
            value={newDate}
            onChange={(e) => {
              setNewDate(e.target.value);
              setSelectedSlotId('');
            }}
            min={format(new Date(), 'yyyy-MM-dd')}
          />
        </div>

        {/* Tele-consult: slot grid */}
        {isTeleConsult && newDate && (
          <div className="space-y-2">
            <Label>Available slots</Label>
            {slotsLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : !slots || slots.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No available slots for that date.
              </p>
            ) : (
              <div className="grid max-h-56 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
                {slots.map((slot) => {
                  const active = slot.id === selectedSlotId;
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => setSelectedSlotId(slot.id)}
                      className={`rounded-md border p-2 text-left text-xs transition-colors ${
                        active
                          ? 'border-primary bg-primary/10'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <div className="font-medium">
                        {format(parseISO(slot.startTime), 'HH:mm')} –{' '}
                        {format(parseISO(slot.endTime), 'HH:mm')}
                      </div>
                      <div className="text-muted-foreground">
                        Dr. {slot.doctor.firstName} {slot.doctor.lastName}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* House call / medical visit: time + optional doctor */}
        {!isTeleConsult && (
          <>
            <div className="space-y-2">
              <Label htmlFor="reschedule-time">New time</Label>
              <Input
                id="reschedule-time"
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reschedule-doctor">
                Change doctor (optional)
              </Label>
              <select
                id="reschedule-doctor"
                value={newDoctorId}
                onChange={(e) => setNewDoctorId(e.target.value)}
                className={selectClassName}
              >
                <option value="">Keep current doctor</option>
                {doctors
                  ?.filter((d) => d.user.isActive)
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      Dr. {d.firstName} {d.lastName}
                      {d.specialization ? ` — ${d.specialization}` : ''}
                    </option>
                  ))}
              </select>
            </div>
          </>
        )}

        {/* Reason */}
        <div className="space-y-2">
          <Label htmlFor="reschedule-reason">Reason</Label>
          <Textarea
            id="reschedule-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why is this appointment being rescheduled?"
            rows={3}
          />
        </div>

        {/* Warning */}
        <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-50 p-2 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>This will notify the patient and doctor.</span>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={rescheduleMutation.isPending}
          >
            {rescheduleMutation.isPending ? 'Rescheduling…' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
