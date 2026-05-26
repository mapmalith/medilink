'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, LogOut, User } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { logout } from '@/lib/auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SidebarUserMenuProps {
  homeHref: string;
}

export function SidebarUserMenu({ homeHref }: SidebarUserMenuProps) {
  const router = useRouter();
  const { user } = useAuthStore();

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  const roleLabel = user?.role?.replace('_', ' ') || 'User';

  return (
    <div className="flex h-16 items-center justify-between border-b px-6">
      <Link href={homeHref} className="text-xl font-bold tracking-tight">
        MEDI LINK
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Open user menu"
          className="-mr-2 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronDown className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              <p className="text-sm font-medium">
                {user?.email ?? 'Signed in'}
              </p>
              <p className="text-xs text-muted-foreground">{roleLabel}</p>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <User className="mr-2 h-4 w-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
