'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { useHotelList, useDeleteHotel } from '@/hooks/use-hotels';
import { HotelDialog } from './hotel-dialog';
import type { Hotel } from '@/lib/types/hotel';

export function HotelsTable() {
  const router = useRouter();
  const { data: hotels, isLoading } = useHotelList();
  const deleteMutation = useDeleteHotel();
  const [editHotel, setEditHotel] = useState<Hotel | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast.success('Hotel deactivated successfully');
    } catch {
      toast.error('Failed to deactivate hotel');
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

  if (!hotels?.length) {
    return (
      <p className="text-sm text-muted-foreground text-center py-12">
        No hotels found. Add one to get started.
      </p>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Hotel Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="text-right">Credit Limit</TableHead>
              <TableHead className="text-right">Used</TableHead>
              <TableHead className="text-right">Available</TableHead>
              <TableHead className="text-center">QR Codes</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hotels.map((hotel) => {
              const limit = parseFloat(hotel.creditLimit);
              const used = parseFloat(hotel.creditUsed);
              const available = limit - used;
              return (
                <TableRow key={hotel.id}>
                  <TableCell className="font-medium">{hotel.name}</TableCell>
                  <TableCell>{hotel.contactPerson || '—'}</TableCell>
                  <TableCell>{hotel.phone || '—'}</TableCell>
                  <TableCell className="text-right">
                    ${limit.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    ${used.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={
                        available < 0 ? 'text-destructive font-medium' : ''
                      }
                    >
                      ${available.toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    {hotel.qrCodeCount}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={hotel.user.isActive ? 'default' : 'secondary'}
                    >
                      {hotel.user.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() =>
                          router.push(`/dashboard/hotels/${hotel.id}`)
                        }
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setEditHotel(hotel)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setDeleteId(hotel.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <HotelDialog
        open={!!editHotel}
        onOpenChange={(open) => !open && setEditHotel(null)}
        hotel={editHotel}
      />

      <Dialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Deactivate Hotel</DialogTitle>
            <DialogDescription>
              This will deactivate the hotel account. Are you sure?
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
