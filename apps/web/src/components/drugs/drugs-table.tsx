'use client';

import { useState } from 'react';
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
import { useDrugList, useDeleteDrug } from '@/hooks/use-drugs';
import { DrugDialog } from './drug-dialog';
import type { Drug } from '@/lib/types/drug';

export function DrugsTable() {
  const { data: drugs, isLoading } = useDrugList();
  const deleteMutation = useDeleteDrug();
  const [editDrug, setEditDrug] = useState<Drug | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast.success('Drug deactivated successfully');
    } catch {
      toast.error('Failed to deactivate drug');
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

  if (!drugs?.length) {
    return (
      <p className="text-sm text-muted-foreground text-center py-12">
        No drugs found. Add one to get started.
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
              <TableHead>Generic Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Dosage Form</TableHead>
              <TableHead>Strength</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {drugs.map((drug) => (
              <TableRow key={drug.id}>
                <TableCell className="font-medium">{drug.name}</TableCell>
                <TableCell>{drug.genericName || '—'}</TableCell>
                <TableCell>
                  {drug.category ? (
                    <Badge variant="outline">{drug.category}</Badge>
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell>{drug.dosageForm || '—'}</TableCell>
                <TableCell>{drug.strength || '—'}</TableCell>
                <TableCell>
                  <Badge variant={drug.isActive ? 'default' : 'secondary'}>
                    {drug.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setEditDrug(drug)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setDeleteId(drug.id)}
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

      <DrugDialog
        open={!!editDrug}
        onOpenChange={(open) => !open && setEditDrug(null)}
        drug={editDrug}
      />

      <Dialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Deactivate Drug</DialogTitle>
            <DialogDescription>
              This will deactivate the drug. It will no longer be available for
              new prescriptions. Are you sure?
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
