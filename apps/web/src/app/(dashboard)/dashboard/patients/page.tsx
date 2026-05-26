'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PatientsTable } from '@/components/patients/patients-table';
import { PatientDialog } from '@/components/patients/patient-dialog';

export default function PatientsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Patients</h1>
          <p className="text-sm text-muted-foreground">
            Manage patient records, medical history, and consents.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Patient
        </Button>
      </div>

      <PatientsTable />

      <PatientDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
