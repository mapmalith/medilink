'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  type AuditFilters,
  type AuditRow,
  useAuditActions,
  useAuditEntities,
  useAuditLogs,
} from '@/hooks/use-audit';

const ALL = '__all__';

export default function AuditPage() {
  const [filters, setFilters] = useState<AuditFilters>({
    page: 1,
    pageSize: 20,
  });
  const logs = useAuditLogs(filters);
  const entities = useAuditEntities();
  const actions = useAuditActions();
  const [expanded, setExpanded] = useState<string | null>(null);

  const update = (next: Partial<AuditFilters>) =>
    setFilters((f) => ({ ...f, ...next, page: 1 }));

  const totalPages = logs.data?.totalPages ?? 1;
  const page = filters.page ?? 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-sm text-muted-foreground">
          Every successful write across the platform.
        </p>
      </div>

      <Card>
        <CardContent className="grid gap-3 pt-6 md:grid-cols-2 lg:grid-cols-6">
          <div className="space-y-1">
            <Label>Entity</Label>
            <Select
              value={filters.entity ?? ALL}
              onValueChange={(v: unknown) =>
                update({
                  entity: typeof v === 'string' && v !== ALL ? v : undefined,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All</SelectItem>
                {(entities.data ?? []).map((e) => (
                  <SelectItem key={e} value={e}>
                    {e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Action</Label>
            <Select
              value={filters.action ?? ALL}
              onValueChange={(v: unknown) =>
                update({
                  action: typeof v === 'string' && v !== ALL ? v : undefined,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All</SelectItem>
                {(actions.data ?? []).map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>User ID</Label>
            <Input
              placeholder="user-id"
              value={filters.userId ?? ''}
              onChange={(e) =>
                update({ userId: e.target.value || undefined })
              }
            />
          </div>
          <div className="space-y-1">
            <Label>Entity ID</Label>
            <Input
              placeholder="entity-id"
              value={filters.entityId ?? ''}
              onChange={(e) =>
                update({ entityId: e.target.value || undefined })
              }
            />
          </div>
          <div className="space-y-1">
            <Label>From</Label>
            <Input
              type="date"
              value={filters.startDate ?? ''}
              onChange={(e) =>
                update({ startDate: e.target.value || undefined })
              }
            />
          </div>
          <div className="space-y-1">
            <Label>To</Label>
            <Input
              type="date"
              value={filters.endDate ?? ''}
              onChange={(e) =>
                update({ endDate: e.target.value || undefined })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {logs.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Entity ID</TableHead>
                  <TableHead>IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(logs.data?.rows ?? []).map((row) => (
                  <AuditTableRow
                    key={row.id}
                    row={row}
                    expanded={expanded === row.id}
                    onToggle={() =>
                      setExpanded((cur) => (cur === row.id ? null : row.id))
                    }
                  />
                ))}
                {logs.data?.rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-sm text-muted-foreground"
                    >
                      No audit entries match these filters.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          )}

          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {logs.data
                ? `${logs.data.total.toLocaleString()} events · page ${page} of ${totalPages}`
                : '—'}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() =>
                  setFilters((f) => ({
                    ...f,
                    page: Math.max(1, (f.page ?? 1) - 1),
                  }))
                }
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() =>
                  setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))
                }
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AuditTableRow({
  row,
  expanded,
  onToggle,
}: {
  row: AuditRow;
  expanded: boolean;
  onToggle: () => void;
}) {
  const detailsString = useMemo(
    () => JSON.stringify(row.details, null, 2),
    [row.details],
  );

  return (
    <>
      <TableRow className="cursor-pointer" onClick={onToggle}>
        <TableCell>
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </TableCell>
        <TableCell className="text-xs">
          {format(new Date(row.createdAt), 'dd MMM yyyy HH:mm:ss')}
        </TableCell>
        <TableCell>
          {row.user ? (
            <div className="flex flex-col">
              <span className="text-sm">{row.user.displayName}</span>
              <Badge variant="outline" className="w-fit text-[10px]">
                {row.user.role}
              </Badge>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">system</span>
          )}
        </TableCell>
        <TableCell>
          <Badge>{row.action}</Badge>
        </TableCell>
        <TableCell className="text-sm">{row.entity}</TableCell>
        <TableCell className="font-mono text-xs">
          {row.entityId ?? '—'}
        </TableCell>
        <TableCell className="font-mono text-xs">
          {row.ipAddress ?? '—'}
        </TableCell>
      </TableRow>
      {expanded ? (
        <TableRow>
          <TableCell colSpan={7} className="bg-muted/30">
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words text-xs">
              {detailsString}
            </pre>
          </TableCell>
        </TableRow>
      ) : null}
    </>
  );
}
