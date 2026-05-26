'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StaffTable } from '@/components/staff/staff-table';
import { StaffDialog } from '@/components/staff/staff-dialog';

export default function StaffPage() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Staff</h1>
          <p className="text-sm text-muted-foreground">
            Manage admin and call center team members.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Staff
        </Button>
      </div>

      <StaffTable />

      <StaffDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
