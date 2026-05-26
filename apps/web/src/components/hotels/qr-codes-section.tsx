'use client';

import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Download, Plus, QrCode } from 'lucide-react';
import { useHotelQRCodes, useGenerateQRCode } from '@/hooks/use-hotels';

const qrSchema = z.object({
  location: z.string().min(1, 'Location is required'),
});

type QRForm = z.infer<typeof qrSchema>;

export function QRCodesSection({ hotelId }: { hotelId: string }) {
  const { data: qrCodes, isLoading } = useHotelQRCodes(hotelId);
  const generateMutation = useGenerateQRCode();
  const [dialogOpen, setDialogOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<QRForm>({
    resolver: zodResolver(qrSchema),
  });

  async function onSubmit(data: QRForm) {
    try {
      await generateMutation.mutateAsync({
        id: hotelId,
        location: data.location,
      });
      toast.success('QR code generated successfully');
      setDialogOpen(false);
      reset();
    } catch {
      toast.error('Failed to generate QR code');
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            QR Codes
          </CardTitle>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Generate QR Code
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Loading QR codes...
            </p>
          ) : !qrCodes?.length ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No QR codes yet. Generate one to get started.
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-center">Scans</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-center">Image</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {qrCodes.map((qr) => (
                    <TableRow key={qr.id}>
                      <TableCell className="font-mono text-sm">
                        {qr.code}
                      </TableCell>
                      <TableCell>{qr.location || '—'}</TableCell>
                      <TableCell className="text-center">
                        {qr.scanCount}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={qr.isActive ? 'default' : 'secondary'}
                        >
                          {qr.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(parseISO(qr.createdAt), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-center">
                        <a
                          href={`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/qr-codes/${qr.code}/image`}
                          download={`${qr.code}.png`}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <Download className="h-3.5 w-3.5" />
                          PNG
                        </a>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Generate QR Code</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="e.g. Lobby, Reception, Pool Area"
                {...register('location')}
              />
              {errors.location && (
                <p className="text-sm text-destructive">
                  {errors.location.message}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Generating...' : 'Generate'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
