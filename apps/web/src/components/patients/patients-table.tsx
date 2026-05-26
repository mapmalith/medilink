'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { usePatientList, useDeletePatient } from '@/hooks/use-patients';
import { PatientDialog } from './patient-dialog';
import type { Patient } from '@/lib/types/patient';

export function PatientsTable() {
  const router = useRouter();
  const { data: patients, isLoading } = usePatientList();
  const deleteMutation = useDeletePatient();
  const [editPatient, setEditPatient] = useState<Patient | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast.success('Patient deactivated successfully');
    } catch {
      toast.error('Failed to deactivate patient');
    }
    setDeleteId(null);
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!patients?.length) {
    return (
      <p className="text-sm text-muted-foreground text-center py-12">
        No patients found. Add one to get started.
      </p>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Nationality</TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead>Hotel</TableHead>
              <TableHead className="text-center">Appointments</TableHead>
              <TableHead>Last Visit</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {patients.map((patient) => (
              <TableRow key={patient.id}>
                <TableCell className="font-medium">
                  {patient.firstName} {patient.lastName}
                </TableCell>
                <TableCell>{patient.nationality || '—'}</TableCell>
                <TableCell>{patient.whatsappNumber || '—'}</TableCell>
                <TableCell>{patient.hotel?.name || '—'}</TableCell>
                <TableCell className="text-center">
                  {patient.appointmentsCount}
                </TableCell>
                <TableCell>
                  {patient.lastVisit
                    ? format(parseISO(patient.lastVisit), 'MMM d, yyyy')
                    : '—'}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={patient.user.isActive ? 'default' : 'secondary'}
                  >
                    {patient.user.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() =>
                        router.push(`/dashboard/patients/${patient.id}`)
                      }
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setEditPatient(patient)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setDeleteId(patient.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <PatientDialog
        open={!!editPatient}
        onOpenChange={(open) => !open && setEditPatient(null)}
        patient={editPatient}
      />

      <Dialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Deactivate Patient</DialogTitle>
            <DialogDescription>
              This will deactivate the patient account. Are you sure?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deactivating...' : 'Deactivate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
