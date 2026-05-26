'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { usePatient } from '@/hooks/use-patients';
import { PatientProfileCard } from '@/components/patients/patient-profile-card';
import { PatientDialog } from '@/components/patients/patient-dialog';
import { PatientAppointmentHistory } from '@/components/patients/patient-appointment-history';
import { MedicalRecordsSection } from '@/components/patients/medical-records-section';
import { ConsentRecordsSection } from '@/components/patients/consent-records-section';

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { data: patient, isLoading } = usePatient(id);
  const [editOpen, setEditOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">Patient not found.</p>
      </div>
    );
  }

  const fullName = `${patient.firstName} ${patient.lastName}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/dashboard/patients')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">{fullName}</h1>
      </div>

      <Tabs defaultValue="profile" className="flex flex-col gap-4">
        <TabsList variant="line">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="medical-records">Medical Records</TabsTrigger>
          <TabsTrigger value="consents">Consents</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <PatientProfileCard
            patient={patient}
            onEdit={() => setEditOpen(true)}
          />
        </TabsContent>
        <TabsContent value="appointments">
          <PatientAppointmentHistory patientId={id} />
        </TabsContent>
        <TabsContent value="medical-records">
          <MedicalRecordsSection records={patient.medicalRecords} />
        </TabsContent>
        <TabsContent value="consents">
          <ConsentRecordsSection consents={patient.consents} />
        </TabsContent>
      </Tabs>

      <PatientDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        patient={
          patient
            ? {
                id: patient.id,
                firstName: patient.firstName,
                lastName: patient.lastName,
                nationality: patient.nationality,
                passportNumber: patient.passportNumber,
                whatsappNumber: patient.whatsappNumber,
                emailAddress: patient.emailAddress,
                dateOfBirth: patient.dateOfBirth,
                user: patient.user,
                hotel: patient.hotel,
                appointmentsCount: 0,
                lastVisit: null,
                createdAt: patient.createdAt,
              }
            : null
        }
      />
    </div>
  );
}
