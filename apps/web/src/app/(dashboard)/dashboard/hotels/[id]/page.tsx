'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useHotel } from '@/hooks/use-hotels';
import { HotelProfileCard } from '@/components/hotels/hotel-profile-card';
import { HotelDialog } from '@/components/hotels/hotel-dialog';
import { CreditSection } from '@/components/hotels/credit-section';
import { CreditLedger } from '@/components/hotels/credit-ledger';
import { QRCodesSection } from '@/components/hotels/qr-codes-section';
import { HotelAppointmentHistory } from '@/components/hotels/hotel-appointment-history';

export default function HotelDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { data: hotel, isLoading } = useHotel(id);
  const [editOpen, setEditOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">Hotel not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/dashboard/hotels')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">{hotel.name}</h1>
      </div>

      <Tabs defaultValue="profile" className="flex flex-col gap-4">
        <TabsList variant="line">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="credit">Credit</TabsTrigger>
          <TabsTrigger value="qr-codes">QR Codes</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <HotelProfileCard hotel={hotel} onEdit={() => setEditOpen(true)} />
        </TabsContent>
        <TabsContent value="credit" className="space-y-4">
          <CreditSection
            hotelId={id}
            creditLimit={hotel.creditLimit}
            creditUsed={hotel.creditUsed}
          />
          <CreditLedger hotelId={id} />
        </TabsContent>
        <TabsContent value="qr-codes">
          <QRCodesSection hotelId={id} />
        </TabsContent>
        <TabsContent value="appointments">
          <HotelAppointmentHistory hotelId={id} />
        </TabsContent>
      </Tabs>

      <HotelDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        hotel={
          hotel
            ? {
                ...hotel,
                qrCodeCount: hotel.qrCodes.length,
              }
            : null
        }
      />
    </div>
  );
}
