'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  ListChecks,
  Plus,
  Receipt,
} from 'lucide-react';
import { SidebarUserMenu } from './sidebar-user-menu';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/hotel', icon: LayoutDashboard },
  { label: 'Book New', href: '/hotel/book', icon: Plus },
  { label: 'Appointments', href: '/hotel/appointments', icon: ListChecks },
  { label: 'Billing', href: '/hotel/billing', icon: Receipt },
];

export function HotelSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-card">
      <SidebarUserMenu homeHref="/hotel" />

      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/hotel' && pathname.startsWith(item.href));

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
