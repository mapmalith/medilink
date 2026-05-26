'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useHotelList } from '@/hooks/use-hotels';
import {
  APPOINTMENT_TYPE_LABEL,
  type AppointmentFilters,
  type AppointmentType,
} from '@/lib/types/appointment';

const selectClassName =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

interface AppointmentFiltersBarProps {
  filters: AppointmentFilters;
  onChange: (filters: AppointmentFilters) => void;
}

export function AppointmentFiltersBar({
  filters,
  onChange,
}: AppointmentFiltersBarProps) {
  const { data: hotels } = useHotelList();

  function update<K extends keyof AppointmentFilters>(
    key: K,
    value: AppointmentFilters[K] | '',
  ) {
    const next = { ...filters };
    if (value === '' || value === undefined) {
      delete next[key];
    } else {
      next[key] = value as AppointmentFilters[K];
    }
    onChange(next);
  }

  const hasAny = Object.keys(filters).length > 0;

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-md border bg-card p-3">
      <div className="space-y-1 min-w-[160px]">
        <Label htmlFor="filter-type" className="text-xs">
          Type
        </Label>
        <select
          id="filter-type"
          value={filters.type ?? ''}
          onChange={(e) =>
            update('type', (e.target.value || '') as AppointmentType | '')
          }
          className={selectClassName}
        >
          <option value="">All types</option>
          {(Object.keys(APPOINTMENT_TYPE_LABEL) as AppointmentType[]).map(
            (t) => (
              <option key={t} value={t}>
                {APPOINTMENT_TYPE_LABEL[t]}
              </option>
            ),
          )}
        </select>
      </div>

      <div className="space-y-1 min-w-[200px]">
        <Label htmlFor="filter-hotel" className="text-xs">
          Hotel
        </Label>
        <select
          id="filter-hotel"
          value={filters.hotelId ?? ''}
          onChange={(e) => update('hotelId', e.target.value)}
          className={selectClassName}
        >
          <option value="">All hotels</option>
          {hotels?.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="filter-start" className="text-xs">
          From
        </Label>
        <Input
          id="filter-start"
          type="date"
          value={filters.startDate ?? ''}
          onChange={(e) => update('startDate', e.target.value)}
          className="w-40"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="filter-end" className="text-xs">
          To
        </Label>
        <Input
          id="filter-end"
          type="date"
          value={filters.endDate ?? ''}
          onChange={(e) => update('endDate', e.target.value)}
          className="w-40"
        />
      </div>

      {hasAny && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange({})}
          className="gap-1"
        >
          <X className="h-3.5 w-3.5" />
          Clear
        </Button>
      )}
    </div>
  );
}
