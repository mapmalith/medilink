'use client';

import Link from 'next/link';
import { CalendarClock, CreditCard, ListChecks, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCallCenterStats } from '@/hooks/use-call-center';

export default function CallCenterDashboardPage() {
  const { data: stats, isLoading } = useCallCenterStats();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Call Center Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Today&apos;s activity across all hotels
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/call-center/book"
            className={cn(buttonVariants({ size: 'sm' }), 'gap-2')}
          >
            <Plus className="h-4 w-4" />
            New Booking
          </Link>
          <Link
            href="/call-center/reschedule"
            className={cn(
              buttonVariants({ variant: 'outline', size: 'sm' }),
              'gap-2',
            )}
          >
            <CalendarClock className="h-4 w-4" />
            Reschedule
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Today's Bookings"
          value={stats?.todayBookings}
          loading={isLoading}
          icon={<ListChecks className="h-5 w-5 text-muted-foreground" />}
          hint="Appointments created today"
        />
        <StatCard
          title="Pending Payments"
          value={stats?.pendingPayments}
          loading={isLoading}
          icon={<CreditCard className="h-5 w-5 text-muted-foreground" />}
          hint="Awaiting payment, scheduled for today"
        />
        <StatCard
          title="Rescheduled Today"
          value={stats?.rescheduledToday}
          loading={isLoading}
          icon={<CalendarClock className="h-5 w-5 text-muted-foreground" />}
          hint="Moves performed in the last 24h"
        />
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  loading,
  icon,
  hint,
}: {
  title: string;
  value: number | undefined;
  loading: boolean;
  icon: React.ReactNode;
  hint: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className="text-3xl font-bold">{value ?? 0}</div>
        )}
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}
