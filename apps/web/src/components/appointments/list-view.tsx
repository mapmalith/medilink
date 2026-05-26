'use client';

import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Download, ArrowUpDown } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import {
  APPOINTMENT_STATUS_LABEL,
  APPOINTMENT_TYPE_LABEL,
  type Appointment,
} from '@/lib/types/appointment';

interface ListViewProps {
  appointments: Appointment[];
}

type SortKey =
  | 'date'
  | 'type'
  | 'status'
  | 'patient'
  | 'doctor'
  | 'hotel'
  | 'reschedules';

function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function downloadCsv(rows: Appointment[]) {
  const header = [
    'ID',
    'Date',
    'Time',
    'Type',
    'Status',
    'Patient',
    'Doctor',
    'Hotel',
    'Reschedule Count',
    'Amount',
    'Currency',
  ];
  const lines = [header.join(',')];
  for (const a of rows) {
    lines.push(
      [
        csvCell(a.id),
        csvCell(format(parseISO(a.scheduledDate), 'yyyy-MM-dd')),
        csvCell(format(parseISO(a.scheduledTime), 'HH:mm')),
        csvCell(APPOINTMENT_TYPE_LABEL[a.appointmentType]),
        csvCell(APPOINTMENT_STATUS_LABEL[a.status]),
        csvCell(`${a.patient.firstName} ${a.patient.lastName}`),
        csvCell(
          a.doctor ? `Dr. ${a.doctor.firstName} ${a.doctor.lastName}` : '',
        ),
        csvCell(a.hotel?.name ?? ''),
        csvCell(a.rescheduleCount),
        csvCell(a.amountCharged),
        csvCell(a.currency),
      ].join(','),
    );
  }
  const blob = new Blob([lines.join('\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `appointments-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ListView({ appointments }: ListViewProps) {
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return appointments;
    return appointments.filter((a) => {
      const haystack = [
        `${a.patient.firstName} ${a.patient.lastName}`,
        a.doctor ? `${a.doctor.firstName} ${a.doctor.lastName}` : '',
        a.hotel?.name ?? '',
        APPOINTMENT_TYPE_LABEL[a.appointmentType],
        APPOINTMENT_STATUS_LABEL[a.status],
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [appointments, search]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const cmp = compare(a, b, sortKey);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search patient, doctor, hotel…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <div className="ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadCsv(sorted)}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortHeader
                label="Date"
                active={sortKey === 'date'}
                dir={sortDir}
                onClick={() => toggleSort('date')}
              />
              <SortHeader
                label="Type"
                active={sortKey === 'type'}
                dir={sortDir}
                onClick={() => toggleSort('type')}
              />
              <SortHeader
                label="Status"
                active={sortKey === 'status'}
                dir={sortDir}
                onClick={() => toggleSort('status')}
              />
              <SortHeader
                label="Patient"
                active={sortKey === 'patient'}
                dir={sortDir}
                onClick={() => toggleSort('patient')}
              />
              <SortHeader
                label="Doctor"
                active={sortKey === 'doctor'}
                dir={sortDir}
                onClick={() => toggleSort('doctor')}
              />
              <SortHeader
                label="Hotel"
                active={sortKey === 'hotel'}
                dir={sortDir}
                onClick={() => toggleSort('hotel')}
              />
              <SortHeader
                label="Reschedules"
                active={sortKey === 'reschedules'}
                dir={sortDir}
                onClick={() => toggleSort('reschedules')}
                className="text-center"
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-sm text-muted-foreground py-8"
                >
                  No appointments found.
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="whitespace-nowrap">
                    <div className="font-medium">
                      {format(parseISO(a.scheduledDate), 'MMM d, yyyy')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(parseISO(a.scheduledTime), 'HH:mm')}
                    </div>
                  </TableCell>
                  <TableCell>
                    {APPOINTMENT_TYPE_LABEL[a.appointmentType]}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {APPOINTMENT_STATUS_LABEL[a.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {a.patient.firstName} {a.patient.lastName}
                  </TableCell>
                  <TableCell>
                    {a.doctor
                      ? `Dr. ${a.doctor.firstName} ${a.doctor.lastName}`
                      : '—'}
                  </TableCell>
                  <TableCell>{a.hotel?.name ?? '—'}</TableCell>
                  <TableCell className="text-center">
                    {a.rescheduleCount}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function compare(a: Appointment, b: Appointment, key: SortKey): number {
  switch (key) {
    case 'date':
      return (
        new Date(a.scheduledTime).getTime() -
        new Date(b.scheduledTime).getTime()
      );
    case 'type':
      return a.appointmentType.localeCompare(b.appointmentType);
    case 'status':
      return a.status.localeCompare(b.status);
    case 'patient':
      return `${a.patient.firstName} ${a.patient.lastName}`.localeCompare(
        `${b.patient.firstName} ${b.patient.lastName}`,
      );
    case 'doctor': {
      const an = a.doctor
        ? `${a.doctor.firstName} ${a.doctor.lastName}`
        : '';
      const bn = b.doctor
        ? `${b.doctor.firstName} ${b.doctor.lastName}`
        : '';
      return an.localeCompare(bn);
    }
    case 'hotel':
      return (a.hotel?.name ?? '').localeCompare(b.hotel?.name ?? '');
    case 'reschedules':
      return a.rescheduleCount - b.rescheduleCount;
  }
}

function SortHeader({
  label,
  active,
  dir,
  onClick,
  className,
}: {
  label: string;
  active: boolean;
  dir: 'asc' | 'desc';
  onClick: () => void;
  className?: string;
}) {
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1 hover:text-foreground"
      >
        {label}
        <ArrowUpDown
          className={`h-3 w-3 ${active ? 'opacity-100' : 'opacity-30'}`}
        />
        {active && (
          <span className="text-[10px]">{dir === 'asc' ? '↑' : '↓'}</span>
        )}
      </button>
    </TableHead>
  );
}
