'use client';

import {
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  CreditCard,
  Stethoscope,
  Hotel,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import { StatCard } from './stat-card';
import { TodaysAppointments } from './todays-appointments';
import { RecentActivity } from './recent-activity';
import { useDashboardStats } from '@/hooks/use-admin-dashboard';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function AdminDashboard() {
  const { data: stats, isLoading } = useDashboardStats();

  return (
    <div className="space-y-6">
      {/* Count stat cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          title="Today's Appointments"
          value={stats?.appointmentsToday ?? 0}
          description="Scheduled for today"
          icon={CalendarCheck}
          href="/dashboard/appointments"
          isLoading={isLoading}
        />
        <StatCard
          title="This Week"
          value={stats?.appointmentsWeek ?? 0}
          description="Appointments this week"
          icon={CalendarDays}
          href="/dashboard/appointments"
          isLoading={isLoading}
        />
        <StatCard
          title="This Month"
          value={stats?.appointmentsMonth ?? 0}
          description="Appointments this month"
          icon={CalendarRange}
          href="/dashboard/appointments"
          isLoading={isLoading}
        />
        <StatCard
          title="Pending Payments"
          value={stats?.pendingPayments ?? 0}
          description="Awaiting payment"
          icon={CreditCard}
          href="/dashboard/payments"
          isLoading={isLoading}
        />
        <StatCard
          title="Active Doctors"
          value={stats?.activeDoctors ?? 0}
          description="Currently active"
          icon={Stethoscope}
          href="/dashboard/doctors"
          isLoading={isLoading}
        />
        <StatCard
          title="Active Hotels"
          value={stats?.activeHotels ?? 0}
          description="Partner hotels"
          icon={Hotel}
          href="/dashboard/hotels"
          isLoading={isLoading}
        />
      </div>

      {/* Revenue cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <StatCard
          title="Revenue Today"
          value={formatCurrency(stats?.revenueToday ?? 0)}
          description="Total collected today"
          icon={DollarSign}
          href="/dashboard/payments"
          isLoading={isLoading}
        />
        <StatCard
          title="Revenue This Month"
          value={formatCurrency(stats?.revenueMonth ?? 0)}
          description="Total collected this month"
          icon={TrendingUp}
          href="/dashboard/payments"
          isLoading={isLoading}
        />
      </div>

      {/* Appointments & Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <TodaysAppointments />
        <RecentActivity />
      </div>
    </div>
  );
}
