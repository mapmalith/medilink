'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HotelsTable } from '@/components/hotels/hotels-table';
import { HotelDialog } from '@/components/hotels/hotel-dialog';

export default function HotelsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hotels</h1>
          <p className="text-sm text-muted-foreground">
            Manage hotels, credit limits, and QR codes.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Hotel
        </Button>
      </div>

      <HotelsTable />

      <HotelDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
