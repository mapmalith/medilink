'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Copy, Plus, Save, Trash2 } from 'lucide-react';
import {
  CalendarBody,
  CalendarDate,
  CalendarDatePagination,
  CalendarDatePicker,
  CalendarHeader,
  CalendarItem,
  CalendarMonthPicker,
  CalendarProvider,
  CalendarYearPicker,
  type Feature,
} from '@/components/kibo-ui/calendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  useDoctorAvailability,
  useReplaceDoctorAvailability,
} from '@/hooks/use-doctor-portal';
import {
  APPOINTMENT_TYPE_COLOR,
  APPOINTMENT_TYPE_LABEL,
  type AppointmentType,
} from '@/lib/types/appointment';
import type { DoctorAvailabilitySlotInput } from '@/lib/types/doctor-portal';

// dayOfWeek convention matches JS Date.getDay() — 0 = Sunday, 6 = Saturday.
const DAYS: { value: number; short: string; long: string }[] = [
  { value: 0, short: 'Sun', long: 'Sunday' },
  { value: 1, short: 'Mon', long: 'Monday' },
  { value: 2, short: 'Tue', long: 'Tuesday' },
  { value: 3, short: 'Wed', long: 'Wednesday' },
  { value: 4, short: 'Thu', long: 'Thursday' },
  { value: 5, short: 'Fri', long: 'Friday' },
  { value: 6, short: 'Sat', long: 'Saturday' },
];

const APPOINTMENT_TYPES: AppointmentType[] = [
  'HOUSE_CALL',
  'TELE_CONSULTATION',
  'MEDICAL_VISIT',
];

const selectClassName =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

type EditableSlot = DoctorAvailabilitySlotInput & { _key: string };

let nextKey = 0;
function makeKey() {
  nextKey += 1;
  return `slot-${nextKey}`;
}

function emptySlot(dayOfWeek: number): EditableSlot {
  return {
    _key: makeKey(),
    dayOfWeek,
    appointmentType: 'TELE_CONSULTATION',
    startTime: '09:00',
    endTime: '17:00',
    isActive: true,
  };
}

function slotsAreEqual(
  a: EditableSlot[],
  b: EditableSlot[],
): boolean {
  if (a.length !== b.length) return false;
  const norm = (s: EditableSlot) =>
    `${s.dayOfWeek}|${s.appointmentType}|${s.startTime}|${s.endTime}|${s.isActive ? 1 : 0}`;
  const aKeys = a.map(norm).sort();
  const bKeys = b.map(norm).sort();
  return aKeys.every((k, i) => k === bKeys[i]);
}

export default function DoctorAvailabilityPage() {
  const { data: serverSlots, isLoading } = useDoctorAvailability();
  const replaceMutation = useReplaceDoctorAvailability();

  const [slots, setSlots] = useState<EditableSlot[]>([]);
  const [baseline, setBaseline] = useState<EditableSlot[]>([]);
  const [editDay, setEditDay] = useState<number | null>(null);

  // Sync server -> local state when fresh data arrives.
  useEffect(() => {
    if (!serverSlots) return;
    const mapped: EditableSlot[] = serverSlots.map((s) => ({
      _key: makeKey(),
      dayOfWeek: s.dayOfWeek,
      appointmentType: s.appointmentType,
      startTime: s.startTime,
      endTime: s.endTime,
      isActive: s.isActive,
    }));
    setSlots(mapped);
    setBaseline(mapped);
  }, [serverSlots]);

  const slotsByDay = useMemo(() => {
    const map: Record<number, EditableSlot[]> = {};
    for (const day of DAYS) map[day.value] = [];
    for (const s of slots) {
      (map[s.dayOfWeek] ??= []).push(s);
    }
    for (const day of DAYS) {
      map[day.value].sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
    return map;
  }, [slots]);

  const totalActiveThisWeek = useMemo(
    () => slots.filter((s) => s.isActive).length,
    [slots],
  );

  const dirty = useMemo(() => !slotsAreEqual(slots, baseline), [slots, baseline]);

  // Build features for the monthly Kibo Calendar — one green dot per day that
  // has at least one active slot in the week.
  const calendarFeatures = useMemo<Feature[]>(() => {
    const today = new Date();
    const year = today.getFullYear();
    const features: Feature[] = [];
    // Generate features for the current and next month so users can flip
    // through neighbouring months and still see the recurring dots.
    for (let monthOffset = -1; monthOffset <= 12; monthOffset++) {
      const monthDate = new Date(year, today.getMonth() + monthOffset, 1);
      const m = monthDate.getMonth();
      const y = monthDate.getFullYear();
      const daysInMonth = new Date(y, m + 1, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(y, m, d);
        const dow = date.getDay();
        const daySlots = (slotsByDay[dow] ?? []).filter((s) => s.isActive);
        if (daySlots.length === 0) continue;
        features.push({
          id: `${y}-${m}-${d}`,
          name: `${daySlots.length} slot${daySlots.length === 1 ? '' : 's'}`,
          startAt: date,
          endAt: date,
          status: {
            id: 'available',
            name: 'Available',
            color: '#10b981',
          },
        });
      }
    }
    return features;
  }, [slotsByDay]);

  function openEdit(day: number) {
    setEditDay(day);
  }

  function closeEdit() {
    setEditDay(null);
  }

  function saveDayChanges(day: number, daySlots: EditableSlot[]) {
    setSlots((prev) => [
      ...prev.filter((s) => s.dayOfWeek !== day),
      ...daySlots.map((s) => ({ ...s, dayOfWeek: day })),
    ]);
  }

  function copyDayToWeekdays(day: number, daySlots: EditableSlot[]) {
    // Replace Monday-Friday with the given day's slots.
    const weekdays = [1, 2, 3, 4, 5];
    setSlots((prev) => {
      const others = prev.filter((s) => !weekdays.includes(s.dayOfWeek));
      const cloned: EditableSlot[] = [];
      for (const wd of weekdays) {
        for (const s of daySlots) {
          cloned.push({ ...s, _key: makeKey(), dayOfWeek: wd });
        }
      }
      return [...others, ...cloned];
    });
    toast.success(`Copied to Mon–Fri (${daySlots.length} slot(s) each)`);
  }

  async function handleSave() {
    // Validate: start < end on every active slot.
    for (const s of slots) {
      if (s.isActive && s.startTime >= s.endTime) {
        toast.error(
          `Invalid time on ${DAYS[s.dayOfWeek].long}: ${s.startTime} must be before ${s.endTime}`,
        );
        return;
      }
    }
    try {
      await replaceMutation.mutateAsync(
        slots.map(({ _key: _ignored, ...rest }) => rest),
      );
      toast.success('Availability saved');
    } catch (err) {
      const apiError = err as { response?: { data?: { message?: string } } };
      toast.error(
        apiError?.response?.data?.message ?? 'Failed to save availability',
      );
    }
  }

  function handleReset() {
    setSlots(baseline);
    toast.info('Changes discarded');
  }

  const currentYear = new Date().getFullYear();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Availability</h1>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Availability</h1>
          <p className="text-sm text-muted-foreground">
            Configure the weekly hours when patients can book you. Click any
            day to edit, add, or remove time slots.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              disabled={replaceMutation.isPending}
            >
              Discard
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!dirty || replaceMutation.isPending}
          >
            <Save className="mr-1 h-4 w-4" />
            {replaceMutation.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </div>

      {/* Slot count preview */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-4">
          <div>
            <p className="text-xs text-muted-foreground">Weekly preview</p>
            <p className="text-2xl font-bold tabular-nums">
              {totalActiveThisWeek} slot
              {totalActiveThisWeek === 1 ? '' : 's'}
            </p>
            <p className="text-xs text-muted-foreground">
              will be generated for booking each week
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {APPOINTMENT_TYPES.map((t) => {
              const count = slots.filter(
                (s) => s.isActive && s.appointmentType === t,
              ).length;
              return (
                <div key={t} className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: APPOINTMENT_TYPE_COLOR[t] }}
                  />
                  {APPOINTMENT_TYPE_LABEL[t]}: {count}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Weekly grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Weekly schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
            {DAYS.map((day) => {
              const daySlots = slotsByDay[day.value];
              const activeCount = daySlots.filter((s) => s.isActive).length;
              return (
                <button
                  type="button"
                  key={day.value}
                  onClick={() => openEdit(day.value)}
                  className="flex min-h-[140px] flex-col rounded-md border bg-card p-3 text-left transition-colors hover:bg-muted"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{day.short}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {activeCount}
                    </span>
                  </div>
                  <div className="mt-2 space-y-1 overflow-hidden text-[11px]">
                    {daySlots.length === 0 && (
                      <p className="text-muted-foreground italic">No slots</p>
                    )}
                    {daySlots.slice(0, 4).map((slot) => (
                      <div
                        key={slot._key}
                        className="flex items-center gap-1 truncate"
                        style={{
                          opacity: slot.isActive ? 1 : 0.4,
                        }}
                      >
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{
                            backgroundColor:
                              APPOINTMENT_TYPE_COLOR[slot.appointmentType],
                          }}
                        />
                        <span className="truncate">
                          {slot.startTime}–{slot.endTime}
                        </span>
                      </div>
                    ))}
                    {daySlots.length > 4 && (
                      <p className="text-muted-foreground">
                        +{daySlots.length - 4} more
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Monthly overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monthly overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-md border">
            <CalendarProvider>
              <CalendarDate>
                <CalendarDatePicker>
                  <CalendarMonthPicker />
                  <CalendarYearPicker
                    start={currentYear - 1}
                    end={currentYear + 2}
                  />
                </CalendarDatePicker>
                <CalendarDatePagination />
              </CalendarDate>
              <CalendarHeader />
              <CalendarBody features={calendarFeatures}>
                {({ feature }) => <CalendarItem feature={feature} />}
              </CalendarBody>
            </CalendarProvider>
          </div>
        </CardContent>
      </Card>

      <DayEditDialog
        day={editDay}
        slots={editDay !== null ? slotsByDay[editDay] : []}
        onClose={closeEdit}
        onSave={saveDayChanges}
        onCopyToWeekdays={copyDayToWeekdays}
      />
    </div>
  );
}

interface DayEditDialogProps {
  day: number | null;
  slots: EditableSlot[];
  onClose: () => void;
  onSave: (day: number, slots: EditableSlot[]) => void;
  onCopyToWeekdays: (day: number, slots: EditableSlot[]) => void;
}

function DayEditDialog({
  day,
  slots,
  onClose,
  onSave,
  onCopyToWeekdays,
}: DayEditDialogProps) {
  const [draft, setDraft] = useState<EditableSlot[]>([]);

  // Reset draft whenever the dialog opens for a new day.
  useEffect(() => {
    if (day !== null) {
      setDraft(slots.map((s) => ({ ...s })));
    }
  }, [day, slots]);

  if (day === null) return null;

  function updateRow(key: string, patch: Partial<EditableSlot>) {
    setDraft((prev) =>
      prev.map((s) => (s._key === key ? { ...s, ...patch } : s)),
    );
  }

  function removeRow(key: string) {
    setDraft((prev) => prev.filter((s) => s._key !== key));
  }

  function addRow() {
    setDraft((prev) => [...prev, emptySlot(day as number)]);
  }

  function handleApply() {
    // Validate before applying
    for (const s of draft) {
      if (s.isActive && s.startTime >= s.endTime) {
        toast.error(`Invalid time: ${s.startTime} must be before ${s.endTime}`);
        return;
      }
    }
    onSave(day as number, draft);
    onClose();
  }

  function handleCopy() {
    // Validate before copying
    for (const s of draft) {
      if (s.isActive && s.startTime >= s.endTime) {
        toast.error(`Invalid time: ${s.startTime} must be before ${s.endTime}`);
        return;
      }
    }
    onSave(day as number, draft);
    onCopyToWeekdays(day as number, draft);
    onClose();
  }

  return (
    <Dialog open={day !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit {DAYS[day].long}</DialogTitle>
          <DialogDescription>
            Add as many time blocks as you need. Each block represents one
            availability window for a single appointment type.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
          {draft.length === 0 && (
            <p className="text-sm text-muted-foreground italic">
              No availability for this day. Click &quot;Add slot&quot; to add one.
            </p>
          )}
          {draft.map((slot) => (
            <div
              key={slot._key}
              className="space-y-2 rounded-md border p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs">Type</Label>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={slot.isActive}
                    onCheckedChange={(checked: boolean) =>
                      updateRow(slot._key, { isActive: checked })
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeRow(slot._key)}
                    aria-label="Remove slot"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <select
                className={selectClassName}
                value={slot.appointmentType}
                onChange={(e) =>
                  updateRow(slot._key, {
                    appointmentType: e.target.value as AppointmentType,
                  })
                }
              >
                {APPOINTMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {APPOINTMENT_TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Start</Label>
                  <Input
                    type="time"
                    value={slot.startTime}
                    onChange={(e) =>
                      updateRow(slot._key, { startTime: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">End</Label>
                  <Input
                    type="time"
                    value={slot.endTime}
                    onChange={(e) =>
                      updateRow(slot._key, { endTime: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={addRow}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add slot
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            disabled={draft.length === 0}
            title="Apply these slots to Monday through Friday"
          >
            <Copy className="mr-1 h-3.5 w-3.5" />
            Copy to weekdays
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleApply}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
