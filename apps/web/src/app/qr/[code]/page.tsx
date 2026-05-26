'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import api from '@/lib/api';

export default function QRScanPage() {
  const { code } = useParams<{ code: string }>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;

    let cancelled = false;

    async function handleScan() {
      try {
        const { data } = await api.get(`/qr-codes/${code}/scan`);
        if (!cancelled && data.data?.redirectUrl) {
          window.location.href = data.data.redirectUrl;
        }
      } catch (err) {
        if (cancelled) return;
        const message =
          (err as { response?: { data?: { message?: string } } }).response
            ?.data?.message ?? 'Invalid or expired QR code';
        setError(message);
      }
    }

    handleScan();
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6 text-center">
            <p className="text-lg font-semibold text-destructive">
              Unable to process QR code
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col items-center gap-3 pt-6">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Connecting you to MEDI LINK…
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
