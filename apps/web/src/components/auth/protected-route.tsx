'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const router = useRouter();
  const { user, accessToken } = useAuthStore();

  useEffect(() => {
    if (!accessToken || !user) {
      router.replace('/login');
      return;
    }
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      // Send the user to the portal that matches their role.
      const dest =
        user.role === 'DOCTOR'
          ? '/doctor'
          : user.role === 'HOTEL'
            ? '/hotel'
            : user.role === 'CALL_CENTER'
              ? '/call-center'
              : '/dashboard';
      router.replace(dest);
    }
  }, [accessToken, user, router, allowedRoles]);

  if (!accessToken || !user) {
    return null;
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}
