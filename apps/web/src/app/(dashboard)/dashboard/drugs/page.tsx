'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DrugsTable } from '@/components/drugs/drugs-table';
import { DrugDialog } from '@/components/drugs/drug-dialog';

export default function DrugsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Drug Catalog</h1>
          <p className="text-sm text-muted-foreground">
            Manage the drug formulary available for prescriptions.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Drug
        </Button>
      </div>

      <DrugsTable />

      <DrugDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
