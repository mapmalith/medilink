'use client';

import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Download, Plus, QrCode, Search } from 'lucide-react';
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAllQRCodes } from '@/hooks/use-qr-codes';
import { useHotelList, useGenerateQRCode } from '@/hooks/use-hotels';

const ALL = '__all__';
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

const generateSchema = z.object({
  hotelId: z.string().min(1, 'Select a hotel'),
  location: z.string().min(1, 'Location is required'),
});
type GenerateForm = z.infer<typeof generateSchema>;

export default function QRCodesPage() {
  const qrCodes = useAllQRCodes();
  const hotels = useHotelList();
  const generate = useGenerateQRCode();

  const [hotelFilter, setHotelFilter] = useState<string>(ALL);
  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<GenerateForm>({
    resolver: zodResolver(generateSchema),
    defaultValues: { hotelId: '', location: '' },
  });
  const selectedHotelId = watch('hotelId');

  const rows = useMemo(() => {
    const list = qrCodes.data ?? [];
    const q = search.trim().toLowerCase();
    return list.filter((qr) => {
      if (hotelFilter !== ALL && qr.hotelId !== hotelFilter) return false;
      if (statusFilter === 'active' && !qr.isActive) return false;
      if (statusFilter === 'inactive' && qr.isActive) return false;
      if (
        q &&
        !qr.code.toLowerCase().includes(q) &&
        !(qr.location ?? '').toLowerCase().includes(q) &&
        !qr.hotelName.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [qrCodes.data, hotelFilter, statusFilter, search]);

  async function onSubmit(form: GenerateForm) {
    try {
      await generate.mutateAsync({
        id: form.hotelId,
        location: form.location,
      });
      toast.success('QR code generated');
      reset();
      setDialogOpen(false);
      qrCodes.refetch();
    } catch {
      toast.error('Failed to generate QR code');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">QR Codes</h1>
          <p className="text-sm text-muted-foreground">
            Every QR code across all hotels.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Generate QR Code
        </Button>
      </div>

      <Card>
        <CardContent className="grid gap-3 pt-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1">
            <Label>Hotel</Label>
            <Select
              value={hotelFilter}
              onValueChange={(v: unknown) =>
                setHotelFilter(typeof v === 'string' ? v : ALL)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All hotels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All hotels</SelectItem>
                {(hotels.data ?? []).map((h) => (
                  <SelectItem key={h.id} value={h.id}>
                    {h.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Status</Label>
            <Select
              value={statusFilter}
              onValueChange={(v: unknown) =>
                setStatusFilter(typeof v === 'string' ? v : ALL)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Search</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="code, location, hotel"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {qrCodes.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Hotel</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-center">Scans</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Image</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((qr) => (
                  <TableRow key={qr.id}>
                    <TableCell className="font-mono text-xs">
                      {qr.code}
                    </TableCell>
                    <TableCell className="text-sm">{qr.hotelName}</TableCell>
                    <TableCell className="text-sm">
                      {qr.location ?? '—'}
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {qr.scanCount}
                    </TableCell>
                    <TableCell>
                      <Badge variant={qr.isActive ? 'default' : 'secondary'}>
                        {qr.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(parseISO(qr.createdAt), 'd MMM yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <a
                        href={`${API_BASE}/qr-codes/${qr.code}/image`}
                        download={`${qr.code}.png`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <Download className="h-3.5 w-3.5" />
                        PNG
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      <QrCode className="mx-auto mb-2 h-8 w-8 opacity-40" />
                      No QR codes match these filters.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
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
              <Label>Hotel</Label>
              <Select
                value={selectedHotelId}
                onValueChange={(v: unknown) =>
                  setValue('hotelId', typeof v === 'string' ? v : '', {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a hotel" />
                </SelectTrigger>
                <SelectContent>
                  {(hotels.data ?? []).map((h) => (
                    <SelectItem key={h.id} value={h.id}>
                      {h.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.hotelId ? (
                <p className="text-sm text-destructive">
                  {errors.hotelId.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="e.g. Lobby, Reception, Pool"
                {...register('location')}
              />
              {errors.location ? (
                <p className="text-sm text-destructive">
                  {errors.location.message}
                </p>
              ) : null}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  reset();
                  setDialogOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Generating…' : 'Generate'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
