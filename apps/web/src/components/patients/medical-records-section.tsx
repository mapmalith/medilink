'use client';

import { format, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Stethoscope } from 'lucide-react';
import type { PatientMedicalRecord } from '@/lib/types/patient';

const typeLabel: Record<string, string> = {
  HOUSE_CALL: 'House Call',
  TELE_CONSULTATION: 'Tele-Consultation',
  MEDICAL_VISIT: 'Medical Visit',
};

interface MedicalRecordsSectionProps {
  records: PatientMedicalRecord[];
}

export function MedicalRecordsSection({ records }: MedicalRecordsSectionProps) {
  if (!records.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            Medical Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No medical records yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Stethoscope className="h-5 w-5" />
          Medical Records
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {records.map((record) => (
          <div
            key={record.id}
            className="rounded-lg border p-4 space-y-3"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium">
                  Dr. {record.doctor.firstName} {record.doctor.lastName}
                  {record.doctor.specialization && (
                    <span className="text-muted-foreground font-normal">
                      {' '}
                      · {record.doctor.specialization}
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(
                    parseISO(record.appointment.scheduledDate),
                    'MMM d, yyyy',
                  )}{' '}
                  ·{' '}
                  {typeLabel[record.appointment.appointmentType] ??
                    record.appointment.appointmentType}
                </p>
              </div>
              {record.followUpRequired && (
                <Badge variant="outline">Follow-up required</Badge>
              )}
            </div>

            {record.diagnosis && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Diagnosis
                </p>
                <p className="text-sm">{record.diagnosis}</p>
              </div>
            )}

            {record.notes && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Notes
                </p>
                <p className="text-sm whitespace-pre-wrap">{record.notes}</p>
              </div>
            )}

            {record.followUpRequired && record.followUpDate && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Follow-up Date
                </p>
                <p className="text-sm">
                  {format(parseISO(record.followUpDate), 'MMM d, yyyy')}
                </p>
                {record.followUpNotes && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {record.followUpNotes}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
