'use client';

import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import {
  Activity,
  CheckCircle2,
  CreditCard,
  ListChecks,
  Plus,
  Wallet,
  MapPin,
  Phone,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import {
  useHotelDashboardStats,
  useHotelMe,
} from '@/hooks/use-hotel-portal';
import {
  APPOINTMENT_STATUS_LABEL,
  APPOINTMENT_TYPE_COLOR,
  APPOINTMENT_TYPE_LABEL,
  type Appointment,
} from '@/lib/types/appointment';
import { cn } from '@/lib/utils';

function formatMoney(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function HotelDashboardPage() {
  const { data: me } = useHotelMe();
  const { data: stats, isLoading } = useHotelDashboardStats();

  const creditLimit = stats?.creditLimit ?? 0;
  const creditUsed = stats?.creditUsed ?? 0;
  const creditBalance = stats?.creditBalance ?? 0;
  const usedPct =
    creditLimit > 0 ? Math.min(100, (creditUsed / creditLimit) * 100) : 0;
  const isLowCredit = creditLimit > 0 && creditBalance / creditLimit < 0.2;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome{me ? `, ${me.name}` : ''}
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage guest appointments and credit balance.
          </p>
        </div>
        <Link
          href="/hotel/book"
          className={buttonVariants({ className: 'gap-2' })}
        >
          <Plus className="h-4 w-4" />
          Book New Appointment
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Activity className="h-5 w-5 text-primary" />}
          label="Active appointments"
          value={isLoading ? null : stats?.activeAppointments ?? 0}
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
          label="Completed today"
          value={isLoading ? null : stats?.completedToday ?? 0}
        />
        <StatCard
          icon={<Wallet className="h-5 w-5 text-indigo-600" />}
          label="Credit balance"
          value={isLoading ? null : formatMoney(creditBalance)}
        />
        <StatCard
          icon={<CreditCard className="h-5 w-5 text-amber-600" />}
          label="Credit used"
          value={isLoading ? null : formatMoney(creditUsed)}
        />
      </div>

      {/* Credit balance bar + today's list */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Credit balance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold tabular-nums">
                    {formatMoney(creditBalance)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    of {formatMoney(creditLimit)}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      isLowCredit ? 'bg-red-500' : 'bg-emerald-500',
                    )}
                    style={{ width: `${usedPct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Used {formatMoney(creditUsed)} ({usedPct.toFixed(0)}%)
                  </span>
                  {isLowCredit && (
                    <Badge variant="destructive" className="h-5 text-[10px]">
                      Low credit
                    </Badge>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Today&apos;s appointments</CardTitle>
            <Link
              href="/hotel/appointments"
              className="text-xs text-primary hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : !stats || stats.todayList.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-sm text-muted-foreground">
                <ListChecks className="h-8 w-8 opacity-50" />
                <span>No appointments scheduled today.</span>
              </div>
            ) : (
              <div className="divide-y">
                {stats.todayList.map((a) => (
                  <TodayRow key={a.id} appointment={a} />
                ))}
              </div>
            )}
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

function TodayRow({ appointment }: { appointment: Appointment }) {
  const color = APPOINTMENT_TYPE_COLOR[appointment.appointmentType];
  return (
    <div className="flex items-start justify-between gap-3 py-3">
      <div className="space-y-1">
        <p className="text-sm font-medium">
          {appointment.patient.firstName} {appointment.patient.lastName}
        </p>
        <p className="text-xs text-muted-foreground">
          {format(parseISO(appointment.scheduledTime), 'HH:mm')} ·{' '}
          {appointment.duration} min
          {appointment.doctor && (
            <>
              {' · '}Dr. {appointment.doctor.firstName}{' '}
              {appointment.doctor.lastName}
            </>
          )}
        </p>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          {appointment.visitAddress && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span className="line-clamp-1 max-w-[200px]">
                {appointment.visitAddress}
              </span>
            </span>
          )}
          {appointment.patient.whatsappNumber && (
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {appointment.patient.whatsappNumber}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <Badge
          variant="outline"
          className="h-5 gap-1 text-[10px]"
          style={{ borderColor: color, color }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: color }}
          />
          {APPOINTMENT_TYPE_LABEL[appointment.appointmentType]}
        </Badge>
        <span className="text-[10px] text-muted-foreground">
          {APPOINTMENT_STATUS_LABEL[appointment.status]}
        </span>
      </div>
    </div>
  );
}
