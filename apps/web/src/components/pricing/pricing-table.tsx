'use client';

import { useState } from 'react';
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
import { Pencil, Trash2 } from 'lucide-react';
import { usePricingList, useDeletePricing } from '@/hooks/use-pricing';
import { PricingDialog } from './pricing-dialog';
import type { Pricing } from '@/lib/types/pricing';

const typeLabel: Record<string, string> = {
  HOUSE_CALL: 'House Call',
  TELE_CONSULTATION: 'Tele-Consultation',
  MEDICAL_VISIT: 'Medical Visit',
};

export function PricingTable() {
  const { data: pricingList, isLoading } = usePricingList();
  const deleteMutation = useDeletePricing();
  const [editPricing, setEditPricing] = useState<Pricing | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast.success('Pricing deactivated successfully');
    } catch {
      toast.error('Failed to deactivate pricing');
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

  if (!pricingList?.length) {
    return (
      <p className="text-sm text-muted-foreground text-center py-12">
        No pricing records found. Add one to get started.
      </p>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Currency</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Effective From</TableHead>
              <TableHead>Effective To</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pricingList.map((pricing) => (
              <TableRow key={pricing.id}>
                <TableCell className="font-medium">
                  {typeLabel[pricing.appointmentType] ?? pricing.appointmentType}
                </TableCell>
                <TableCell>
                  {parseFloat(pricing.price).toFixed(2)}
                </TableCell>
                <TableCell>{pricing.currency}</TableCell>
                <TableCell>
                  <Badge variant={pricing.isActive ? 'default' : 'secondary'}>
                    {pricing.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {format(parseISO(pricing.effectiveFrom), 'MMM d, yyyy')}
                </TableCell>
                <TableCell>
                  {pricing.effectiveTo
                    ? format(parseISO(pricing.effectiveTo), 'MMM d, yyyy')
                    : '—'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setEditPricing(pricing)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setDeleteId(pricing.id)}
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

      <PricingDialog
        open={!!editPricing}
        onOpenChange={(open) => !open && setEditPricing(null)}
        pricing={editPricing}
      />

      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Deactivate Pricing</DialogTitle>
            <DialogDescription>
              This will deactivate the pricing record. Are you sure?
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
