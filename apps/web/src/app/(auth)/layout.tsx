'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { accessToken, user } = useAuthStore();

  useEffect(() => {
    if (accessToken && user) {
      router.replace('/dashboard');
    }
  }, [accessToken, user, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
