'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format, parseISO, differenceInSeconds } from 'date-fns';
import {
  Calendar,
  Clock,
  ListChecks,
  Stethoscope,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { buttonVariants } from '@/components/ui/button';
import { useDoctorMe, useDoctorStats } from '@/hooks/use-doctor-portal';

function formatCountdown(target: Date | null): string {
  if (!target) return '—';
  const seconds = differenceInSeconds(target, new Date());
  if (seconds <= 0) return 'Now';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${seconds}s`;
}

export default function DoctorDashboardPage() {
  const { data: me } = useDoctorMe();
  const { data: stats, isLoading } = useDoctorStats();
  const [, force] = useState(0);

  // Tick every second so the countdown stays fresh between TanStack refetches.
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const next = stats?.nextAppointment ?? null;
  const nextStart = next ? parseISO(next.scheduledTime) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome{me ? `, Dr. ${me.firstName}` : ''}
        </h1>
        <p className="text-sm text-muted-foreground">
          Here&apos;s what your day looks like.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Calendar className="h-5 w-5 text-primary" />}
          label="Today's appointments"
          value={isLoading ? null : stats?.todayCount ?? 0}
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
          label="Completed today"
          value={isLoading ? null : stats?.completedToday ?? 0}
        />
        <StatCard
          icon={<Stethoscope className="h-5 w-5 text-indigo-600" />}
          label="This week"
          value={isLoading ? null : stats?.weeklyCount ?? 0}
        />
        <StatCard
          icon={<Clock className="h-5 w-5 text-amber-600" />}
          label="Next in"
          value={
            isLoading ? null : nextStart ? formatCountdown(nextStart) : '—'
          }
        />
      </div>

      {/* Next appointment + quick actions */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Next appointment</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : !next ? (
              <p className="text-sm text-muted-foreground">
                You have no upcoming appointments.
              </p>
            ) : (
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-lg font-semibold">
                    {next.patient.firstName} {next.patient.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {format(parseISO(next.scheduledDate), 'EEEE, MMM d')} ·{' '}
                    {nextStart && format(nextStart, 'HH:mm')} ·{' '}
                    {next.duration} min
                  </p>
                  {next.hotel && (
                    <p className="text-xs text-muted-foreground">
                      {next.hotel.name}
                    </p>
                  )}
                  {next.visitAddress && (
                    <p className="text-xs text-muted-foreground">
                      {next.visitAddress}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold tabular-nums">
                    {formatCountdown(nextStart)}
                  </p>
                  <Link
                    href="/doctor/today"
                    className={buttonVariants({ size: 'sm', className: 'mt-2' })}
                  >
                    View today
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <QuickAction
              href="/doctor/today"
              icon={<ListChecks className="h-4 w-4" />}
              label="Today's appointments"
            />
            <QuickAction
              href="/doctor/schedule"
              icon={<Calendar className="h-4 w-4" />}
              label="My schedule"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string | null;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 pt-4">
        <div className="rounded-md bg-muted p-2">{icon}</div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          {value === null ? (
            <Skeleton className="mt-1 h-6 w-12" />
          ) : (
            <p className="text-2xl font-bold tabular-nums">{value}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function QuickAction({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted"
    >
      {icon}
      {label}
    </Link>
  );
}
