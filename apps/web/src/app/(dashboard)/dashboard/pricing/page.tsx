'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PricingTable } from '@/components/pricing/pricing-table';
import { PricingDialog } from '@/components/pricing/pricing-dialog';

export default function PricingPage() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pricing</h1>
          <p className="text-sm text-muted-foreground">
            Manage appointment pricing for each type.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Pricing
        </Button>
      </div>

      <PricingTable />

      <PricingDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
