'use client';

import { useAuthStore } from '@/stores/auth-store';

interface RoleGateProps {
  allowedRoles: string[];
  children: React.ReactNode;
}

export function RoleGate({ allowedRoles, children }: RoleGateProps) {
  const { user } = useAuthStore();

  if (!user || !allowedRoles.includes(user.role)) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center">
        <h2 className="text-2xl font-semibold text-destructive">
          Access Denied
        </h2>
        <p className="mt-2 text-muted-foreground">
          You do not have permission to view this page.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
