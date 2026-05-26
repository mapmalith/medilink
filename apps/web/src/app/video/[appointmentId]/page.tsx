'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import DailyIframe, { type DailyCall } from '@daily-co/daily-js';
import { Clock, Loader2, User, Video } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { useAuthStore } from '@/stores/auth-store';
import { useVideoJoin } from '@/hooks/use-video';

export default function VideoCallPage() {
  return (
    <ProtectedRoute
      allowedRoles={['ADMIN', 'CALL_CENTER', 'DOCTOR', 'PATIENT']}
    >
      <VideoCallInner />
    </ProtectedRoute>
  );
}

function VideoCallInner() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const { data, isLoading, error } = useVideoJoin(appointmentId ?? null);

  const containerRef = useRef<HTMLDivElement>(null);
  const callFrameRef = useRef<DailyCall | null>(null);
  const [ended, setEnded] = useState(false);

  // Mount the Daily iframe once we have a room URL AND the call isn't over.
  useEffect(() => {
    const roomUrl = data?.roomUrl;
    if (!roomUrl || ended) return;
    if (!containerRef.current) return;
    if (callFrameRef.current) return; // already mounted

    const callFrame = DailyIframe.createFrame(containerRef.current, {
      iframeStyle: {
        width: '100%',
        height: '100%',
        border: '0',
      },
      showLeaveButton: true,
    });
    callFrame.on('left-meeting', () => {
      setEnded(true);
      callFrame.destroy();
      callFrameRef.current = null;
    });
    callFrame.join({ url: roomUrl }).catch((err) => {
      console.error('Failed to join Daily room', err);
    });
    callFrameRef.current = callFrame;

    return () => {
      if (callFrameRef.current) {
        callFrameRef.current.destroy();
        callFrameRef.current = null;
      }
    };
  }, [data?.roomUrl, ended]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-lg font-semibold text-destructive">
              Unable to join the consultation
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              The appointment could not be found, or you do not have access
              to this video room.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { appointment, roomUrl, notYetOpen } = data;
  const scheduledAt = parseISO(appointment.scheduledTime);

  // Post-call view (role-aware)
  if (ended) {
    const isDoctor = user?.role === 'DOCTOR';
    if (isDoctor) {
      // Redirect doctor to the consultation completion page.
      router.replace(`/doctor/appointments/${appointment.id}/complete`);
      return (
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="space-y-3 pt-6 text-center">
            <div className="text-lg font-semibold">Call ended</div>
            <p className="text-sm text-muted-foreground">
              Your doctor will send you a summary shortly.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppointmentHeader appointment={appointment} />

      {notYetOpen ? (
        <WaitingRoom scheduledAt={scheduledAt} />
      ) : !roomUrl ? (
        <NoRoomYet />
      ) : (
        <div className="flex-1 bg-black">
          <div ref={containerRef} className="h-[calc(100vh-88px)] w-full" />
        </div>
      )}
    </div>
  );
}

function AppointmentHeader({
  appointment,
}: {
  appointment: {
    patient: { firstName: string; lastName: string };
    doctor: { firstName: string; lastName: string } | null;
    appointmentType: string;
    scheduledTime: string;
    status: string;
  };
}) {
  const scheduledAt = parseISO(appointment.scheduledTime);
  return (
    <header className="flex items-center justify-between border-b bg-card px-6 py-3">
      <div className="flex items-center gap-4">
        <Video className="h-5 w-5 text-primary" />
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-1">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            <span>
              {appointment.patient.firstName} {appointment.patient.lastName}
            </span>
          </div>
          {appointment.doctor && (
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">×</span>
              <span>
                Dr. {appointment.doctor.firstName}{' '}
                {appointment.doctor.lastName}
              </span>
            </div>
          )}
          <Badge variant="outline" className="text-[10px]">
            {appointment.appointmentType.replace(/_/g, ' ')}
          </Badge>
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Clock className="h-3.5 w-3.5" />
        {format(scheduledAt, 'EEE dd MMM · HH:mm')}
      </div>
    </header>
  );
}

function WaitingRoom({ scheduledAt }: { scheduledAt: Date }) {
  return (
    <div className="flex flex-1 items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-5 w-5" />
            Waiting for consultation to start
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Your video consultation will begin shortly.</p>
          <p>
            Scheduled for{' '}
            <span className="font-medium text-foreground">
              {format(scheduledAt, 'EEEE, dd MMMM · HH:mm')}
            </span>
            .
          </p>
          <p className="text-xs">
            The call link becomes active 10 minutes before your appointment.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function NoRoomYet() {
  return (
    <div className="flex flex-1 items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center text-sm text-muted-foreground">
          Video room will be created 10 minutes before your appointment.
        </CardContent>
      </Card>
    </div>
  );
}
