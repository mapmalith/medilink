'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDoctorAvailability, useReplaceAvailability } from '@/hooks/use-doctors';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TYPES = [
  { key: 'HOUSE_CALL', label: 'House Call' },
  { key: 'TELE_CONSULTATION', label: 'Tele-Consultation' },
  { key: 'MEDICAL_VISIT', label: 'Medical Visit' },
] as const;

interface SlotState {
  enabled: boolean;
  startTime: string;
  endTime: string;
}

type GridState = Record<string, SlotState>;

function slotKey(day: number, type: string) {
  return `${day}-${type}`;
}

export function AvailabilityGrid({ doctorId }: { doctorId: string }) {
  const { data: availability, isLoading } = useDoctorAvailability(doctorId);
  const replaceMutation = useReplaceAvailability();
  const [grid, setGrid] = useState<GridState>({});

  useEffect(() => {
    if (!availability) return;
    const newGrid: GridState = {};

    // Initialize all cells
    for (let day = 0; day < 7; day++) {
      for (const type of TYPES) {
        newGrid[slotKey(day, type.key)] = {
          enabled: false,
          startTime: '09:00',
          endTime: '17:00',
        };
      }
    }

    // Fill from existing data
    for (const slot of availability) {
      const key = slotKey(slot.dayOfWeek, slot.appointmentType);
      newGrid[key] = {
        enabled: slot.isActive,
        startTime: slot.startTime,
        endTime: slot.endTime,
      };
    }

    setGrid(newGrid);
  }, [availability]);

  function updateSlot(key: string, updates: Partial<SlotState>) {
    setGrid((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...updates },
    }));
  }

  async function handleSave() {
    const slots = Object.entries(grid)
      .filter(([, slot]) => slot.enabled)
      .map(([key, slot]) => {
        const [day, ...typeParts] = key.split('-');
        return {
          dayOfWeek: parseInt(day, 10),
          startTime: slot.startTime,
          endTime: slot.endTime,
          appointmentType: typeParts.join('-'),
          isActive: true,
        };
      });

    try {
      await replaceMutation.mutateAsync({ id: doctorId, slots });
      toast.success('Availability updated successfully');
    } catch {
      toast.error('Failed to update availability');
    }
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Loading availability...</p>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Weekly Availability</CardTitle>
        <Button
          onClick={handleSave}
          disabled={replaceMutation.isPending}
        >
          {replaceMutation.isPending ? 'Saving...' : 'Save'}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left py-2 pr-4 font-medium">Day</th>
                {TYPES.map((type) => (
                  <th key={type.key} className="text-center py-2 px-2 font-medium">
                    {type.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAYS.map((day, dayIndex) => (
                <tr key={day} className="border-t">
                  <td className="py-3 pr-4 font-medium">{day}</td>
                  {TYPES.map((type) => {
                    const key = slotKey(dayIndex, type.key);
                    const slot = grid[key];
                    if (!slot) return <td key={type.key} />;
                    return (
                      <td key={type.key} className="py-3 px-2">
                        <div className="flex flex-col items-center gap-2">
                          <Switch
                            checked={slot.enabled}
                            onCheckedChange={(checked: boolean) =>
                              updateSlot(key, { enabled: checked })
                            }
                          />
                          {slot.enabled && (
                            <div className="flex gap-1">
                              <Input
                                type="time"
                                value={slot.startTime}
                                onChange={(e) =>
                                  updateSlot(key, { startTime: e.target.value })
                                }
                                className="h-7 w-24 text-xs"
                              />
                              <Input
                                type="time"
                                value={slot.endTime}
                                onChange={(e) =>
                                  updateSlot(key, { endTime: e.target.value })
                                }
                                className="h-7 w-24 text-xs"
                              />
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
