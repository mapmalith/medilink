'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Plus,
  CalendarClock,
  LayoutGrid,
} from 'lucide-react';
import { SidebarUserMenu } from './sidebar-user-menu';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/call-center', icon: LayoutDashboard },
  { label: 'New Booking', href: '/call-center/book', icon: Plus },
  { label: 'Reschedule', href: '/call-center/reschedule', icon: CalendarClock },
  { label: 'Live Board', href: '/call-center/board', icon: LayoutGrid },
];

export function CallCenterSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-card">
      <SidebarUserMenu homeHref="/call-center" />

      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/call-center' && pathname.startsWith(item.href));

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
