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
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Pencil, Trash2 } from 'lucide-react';
import {
  useStaffList,
  useDeleteStaff,
  useToggleStaffActive,
} from '@/hooks/use-staff';
import { StaffDialog } from './staff-dialog';
import {
  DEPARTMENT_LABEL,
  type Staff,
  type StaffDepartment,
} from '@/lib/types/staff';

function formatDepartment(dept: string | null): string {
  if (!dept) return '—';
  return DEPARTMENT_LABEL[dept as StaffDepartment] ?? dept;
}

export function StaffTable() {
  const { data: staff, isLoading } = useStaffList();
  const deleteMutation = useDeleteStaff();
  const toggleMutation = useToggleStaffActive();
  const [editStaff, setEditStaff] = useState<Staff | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast.success('Staff member deactivated successfully');
    } catch {
      toast.error('Failed to deactivate staff member');
    }
    setDeleteId(null);
  }

  async function handleToggle(id: string) {
    try {
      await toggleMutation.mutateAsync(id);
      toast.success('Status updated');
    } catch {
      toast.error('Failed to update status');
    }
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

  if (!staff?.length) {
    return (
      <p className="text-sm text-muted-foreground text-center py-12">
        No staff members found. Add one to get started.
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
              <TableHead>Email</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {staff.map((member) => (
              <TableRow key={member.id}>
                <TableCell className="font-medium">
                  {member.firstName} {member.lastName}
                </TableCell>
                <TableCell>{member.user.email}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {formatDepartment(member.department)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={member.user.isActive}
                      onCheckedChange={() => handleToggle(member.id)}
                      disabled={toggleMutation.isPending}
                    />
                    <span className="text-sm text-muted-foreground">
                      {member.user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  {member.lastLogin
                    ? format(parseISO(member.lastLogin), 'MMM d, yyyy HH:mm')
                    : 'Never'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setEditStaff(member)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setDeleteId(member.id)}
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

      <StaffDialog
        open={!!editStaff}
        onOpenChange={(open) => !open && setEditStaff(null)}
        staff={editStaff}
      />

      <Dialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Deactivate Staff Member</DialogTitle>
            <DialogDescription>
              This will deactivate the staff account. Are you sure?
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
