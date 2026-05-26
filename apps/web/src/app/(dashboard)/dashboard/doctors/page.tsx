'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DoctorsTable } from '@/components/doctors/doctors-table';
import { DoctorDialog } from '@/components/doctors/doctor-dialog';

export default function DoctorsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Doctors</h1>
          <p className="text-sm text-muted-foreground">
            Manage doctors, their profiles, and availability.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Doctor
        </Button>
      </div>

      <DoctorsTable />

      <DoctorDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
