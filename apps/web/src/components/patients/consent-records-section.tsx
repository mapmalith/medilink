'use client';

import { format, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileCheck } from 'lucide-react';
import type { PatientConsent } from '@/lib/types/patient';

interface ConsentRecordsSectionProps {
  consents: PatientConsent[];
}

export function ConsentRecordsSection({
  consents,
}: ConsentRecordsSectionProps) {
  if (!consents.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            Consent Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No consent records yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCheck className="h-5 w-5" />
          Consent Records
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {consents.map((consent) => (
          <div key={consent.id} className="rounded-lg border p-4 space-y-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium">
                  {consent.consentType.replace(/_/g, ' ')}
                </p>
                <p className="text-xs text-muted-foreground">
                  Given {format(parseISO(consent.givenAt), 'MMM d, yyyy HH:mm')}
                  {consent.ipAddress && ` · ${consent.ipAddress}`}
                </p>
              </div>
              <Badge
                variant={consent.isWithdrawn ? 'destructive' : 'default'}
              >
                {consent.isWithdrawn ? 'Withdrawn' : 'Active'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {consent.consentText}
            </p>
            {consent.isWithdrawn && consent.withdrawnAt && (
              <p className="text-xs text-destructive">
                Withdrawn{' '}
                {format(parseISO(consent.withdrawnAt), 'MMM d, yyyy HH:mm')}
              </p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
