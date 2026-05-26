'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  RefreshCw,
  Stethoscope,
  User,
  Building2,
  Video,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppointment } from '@/hooks/use-appointments';
import {
  APPOINTMENT_STATUS_LABEL,
  APPOINTMENT_TYPE_LABEL,
  APPOINTMENT_TYPE_COLOR,
} from '@/lib/types/appointment';
import { RescheduleModal } from '@/components/appointments/reschedule-modal';
import { RescheduleHistoryPanel } from '@/components/appointments/reschedule-history-panel';

export default function AppointmentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: appointment, isLoading } = useAppointment(params.id);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!appointment) {
    return (
      <p className="text-sm text-muted-foreground">Appointment not found.</p>
    );
  }

  const typeColor = APPOINTMENT_TYPE_COLOR[appointment.appointmentType];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Appointment Details
            </h1>
            <p className="text-sm text-muted-foreground">
              #{appointment.id.slice(0, 8)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {appointment.appointmentType === 'TELE_CONSULTATION' && (
            <Link
              href={`/video/${appointment.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-primary/40 bg-primary/5 px-3 text-sm font-medium text-primary hover:bg-primary/10"
            >
              <Video className="h-4 w-4" />
              Join Video
            </Link>
          )}
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setRescheduleOpen(true)}
          >
            <RefreshCw className="h-4 w-4" />
            Reschedule
          </Button>
        </div>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ backgroundColor: typeColor }}
              />
              <CardTitle className="text-lg">
                {APPOINTMENT_TYPE_LABEL[appointment.appointmentType]}
              </CardTitle>
              <Badge variant="outline">
                {APPOINTMENT_STATUS_LABEL[appointment.status]}
              </Badge>
              {appointment.rescheduleCount > 0 && (
                <Badge variant="outline" className="gap-1">
                  <RefreshCw className="h-3 w-3" />
                  Rescheduled {appointment.rescheduleCount}x
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-start gap-2">
            <Calendar className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Date</p>
              <p className="font-medium">
                {format(parseISO(appointment.scheduledDate), 'EEEE, MMM d, yyyy')}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Clock className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Time</p>
              <p className="font-medium">
                {format(parseISO(appointment.scheduledTime), 'HH:mm')} ·{' '}
                {appointment.duration} min
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <User className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Patient</p>
              <p className="font-medium">
                {appointment.patient.firstName} {appointment.patient.lastName}
              </p>
              {appointment.patient.whatsappNumber && (
                <p className="text-xs text-muted-foreground">
                  {appointment.patient.whatsappNumber}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Stethoscope className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Doctor</p>
              <p className="font-medium">
                {appointment.doctor
                  ? `Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}`
                  : 'Not assigned'}
              </p>
              {appointment.doctor?.specialization && (
                <p className="text-xs text-muted-foreground">
                  {appointment.doctor.specialization}
                </p>
              )}
            </div>
          </div>

          {appointment.hotel && (
            <div className="flex items-start gap-2">
              <Building2 className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Hotel</p>
                <p className="font-medium">{appointment.hotel.name}</p>
              </div>
            </div>
          )}

          {appointment.visitAddress && (
            <div className="flex items-start gap-2 sm:col-span-2">
              <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Visit Address</p>
                <p className="font-medium">{appointment.visitAddress}</p>
              </div>
            </div>
          )}

          {appointment.notes && (
            <div className="sm:col-span-2">
              <p className="text-xs text-muted-foreground">Notes</p>
              <p className="text-sm">{appointment.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reschedule History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reschedule History</CardTitle>
        </CardHeader>
        <CardContent>
          <RescheduleHistoryPanel appointmentId={appointment.id} />
        </CardContent>
      </Card>

      <RescheduleModal
        appointment={rescheduleOpen ? appointment : null}
        onClose={() => setRescheduleOpen(false)}
      />
    </div>
  );
}
