'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
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
import { useDoctorList } from '@/hooks/use-doctors';
import { useAssignDoctor } from '@/hooks/use-appointments';

const selectClassName =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

interface AssignDoctorModalProps {
  appointmentId: string | null;
  onClose: () => void;
}

export function AssignDoctorModal({
  appointmentId,
  onClose,
}: AssignDoctorModalProps) {
  const { data: doctors } = useDoctorList();
  const assignMutation = useAssignDoctor();
  const [doctorId, setDoctorId] = useState('');

  useEffect(() => {
    if (!appointmentId) setDoctorId('');
  }, [appointmentId]);

  async function handleAssign() {
    if (!appointmentId || !doctorId) return;
    try {
      await assignMutation.mutateAsync({ id: appointmentId, doctorId });
      toast.success('Doctor assigned');
      onClose();
    } catch {
      toast.error('Failed to assign doctor');
    }
  }

  return (
    <Dialog
      open={!!appointmentId}
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Doctor</DialogTitle>
          <DialogDescription>
            Select a doctor to assign to this appointment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="assign-doctor-select">Doctor</Label>
          <select
            id="assign-doctor-select"
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
            className={selectClassName}
          >
            <option value="">Select doctor…</option>
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

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!doctorId || assignMutation.isPending}
          >
            {assignMutation.isPending ? 'Assigning…' : 'Assign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
