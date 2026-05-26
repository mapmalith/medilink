'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useDoctor } from '@/hooks/use-doctors';
import { DoctorProfileCard } from '@/components/doctors/doctor-profile-card';
import { DoctorDialog } from '@/components/doctors/doctor-dialog';
import { AvailabilityGrid } from '@/components/doctors/availability-grid';
import { AppointmentHistory } from '@/components/doctors/appointment-history';

export default function DoctorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { data: doctor, isLoading } = useDoctor(id);
  const [editOpen, setEditOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">Doctor not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/dashboard/doctors')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">
          Dr. {doctor.firstName} {doctor.lastName}
        </h1>
      </div>

      <Tabs defaultValue="profile" className="flex flex-col gap-4">
        <TabsList variant="line">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="availability">Availability</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <DoctorProfileCard doctor={doctor} onEdit={() => setEditOpen(true)} />
        </TabsContent>
        <TabsContent value="availability">
          <AvailabilityGrid doctorId={id} />
        </TabsContent>
        <TabsContent value="appointments">
          <AppointmentHistory doctorId={id} />
        </TabsContent>
      </Tabs>

      <DoctorDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        doctor={doctor}
      />
    </div>
  );
}
