'use client';

import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, Pencil } from 'lucide-react';
import type { PatientDetail } from '@/lib/types/patient';

interface PatientProfileCardProps {
  patient: PatientDetail;
  onEdit: () => void;
}

function maskPassport(value: string | null): string {
  if (!value) return '—';
  if (value.length <= 4) return '*'.repeat(value.length);
  return '*'.repeat(value.length - 4) + value.slice(-4);
}

export function PatientProfileCard({
  patient,
  onEdit,
}: PatientProfileCardProps) {
  const [showPassport, setShowPassport] = useState(false);
  const fullName = `${patient.firstName} ${patient.lastName}`;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{fullName}</CardTitle>
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="text-sm font-medium">{patient.user.email}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Phone</p>
            <p className="text-sm font-medium">{patient.user.phone || '—'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">WhatsApp</p>
            <p className="text-sm font-medium">
              {patient.whatsappNumber || '—'}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Date of Birth</p>
            <p className="text-sm font-medium">
              {patient.dateOfBirth
                ? format(parseISO(patient.dateOfBirth), 'MMM d, yyyy')
                : '—'}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Nationality</p>
            <p className="text-sm font-medium">{patient.nationality || '—'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Passport Number</p>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium font-mono">
                {showPassport
                  ? patient.passportNumber || '—'
                  : maskPassport(patient.passportNumber)}
              </p>
              {patient.passportNumber && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="h-5 w-5"
                  onClick={() => setShowPassport((s) => !s)}
                >
                  {showPassport ? (
                    <EyeOff className="h-3 w-3" />
                  ) : (
                    <Eye className="h-3 w-3" />
                  )}
                </Button>
              )}
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Hotel</p>
            <p className="text-sm font-medium">
              {patient.hotel?.name || '—'}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <Badge variant={patient.user.isActive ? 'default' : 'secondary'}>
              {patient.user.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Member since</p>
            <p className="text-sm font-medium">
              {format(parseISO(patient.createdAt), 'MMM d, yyyy')}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
