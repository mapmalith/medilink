'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { logout } from '@/lib/auth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function Header() {
  const router = useRouter();
  const { user } = useAuthStore();

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  const initials = user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : 'ML';

  const roleLabel = user?.role?.replace('_', ' ') || 'User';

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <div />

      <div className="flex items-center gap-4">
        <Badge variant="secondary" className="text-xs">
          {roleLabel}
        </Badge>

        <DropdownMenu>
          <DropdownMenuTrigger className="relative h-9 w-9 rounded-full outline-none">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <p className="text-sm font-medium">{user?.email}</p>
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
    </header>
  );
}
