'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Building2,
  Stethoscope,
  Settings,
  FileText,
  CreditCard,
  Phone,
  QrCode,
  DollarSign,
  Pill,
  UserCog,
  Home,
  MessageCircle,
  ListChecks,
  ShieldCheck,
} from 'lucide-react';
import { SidebarUserMenu } from './sidebar-user-menu';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: string[];
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['ADMIN', 'CALL_CENTER', 'PATIENT'],
  },
  {
    label: 'Appointments',
    href: '/dashboard/appointments',
    icon: Calendar,
    roles: ['ADMIN', 'CALL_CENTER', 'PATIENT'],
  },
  {
    label: 'House Calls',
    href: '/dashboard/house-calls',
    icon: Home,
    roles: ['ADMIN', 'CALL_CENTER'],
  },
  {
    label: 'Doctors',
    href: '/dashboard/doctors',
    icon: Stethoscope,
    roles: ['ADMIN', 'CALL_CENTER'],
  },
  {
    label: 'Patients',
    href: '/dashboard/patients',
    icon: Users,
    roles: ['ADMIN', 'CALL_CENTER'],
  },
  {
    label: 'Hotels',
    href: '/dashboard/hotels',
    icon: Building2,
    roles: ['ADMIN', 'CALL_CENTER'],
  },
  {
    label: 'QR Codes',
    href: '/dashboard/qr-codes',
    icon: QrCode,
    roles: ['ADMIN'],
  },
  {
    label: 'Payments',
    href: '/dashboard/payments',
    icon: CreditCard,
    roles: ['ADMIN', 'CALL_CENTER'],
  },
  {
    label: 'Invoices',
    href: '/dashboard/invoices',
    icon: FileText,
    roles: ['ADMIN', 'CALL_CENTER'],
  },
  {
    label: 'Call Center',
    href: '/dashboard/call-center',
    icon: Phone,
    roles: ['ADMIN', 'CALL_CENTER'],
  },
  {
    label: 'Drugs',
    href: '/dashboard/drugs',
    icon: Pill,
    roles: ['ADMIN'],
  },
  {
    label: 'Staff',
    href: '/dashboard/staff',
    icon: UserCog,
    roles: ['ADMIN'],
  },
  {
    label: 'Pricing',
    href: '/dashboard/pricing',
    icon: DollarSign,
    roles: ['ADMIN'],
  },
  {
    label: 'WhatsApp',
    href: '/dashboard/whatsapp',
    icon: MessageCircle,
    roles: ['ADMIN'],
  },
  {
    label: 'Jobs',
    href: '/dashboard/jobs',
    icon: ListChecks,
    roles: ['ADMIN'],
  },
  {
    label: 'Audit Log',
    href: '/dashboard/audit',
    icon: ShieldCheck,
    roles: ['ADMIN'],
  },
  {
    label: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
    roles: ['ADMIN'],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();

  const filteredItems = navItems.filter(
    (item) => user && item.roles.includes(user.role),
  );

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-card">
      <SidebarUserMenu homeHref="/dashboard" />

      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {filteredItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
