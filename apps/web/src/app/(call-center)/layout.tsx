'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { CallCenterSidebar } from '@/components/layouts/call-center-sidebar';
import { Header } from '@/components/layouts/header';

export default function CallCenterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute allowedRoles={['CALL_CENTER']}>
      <div className="flex h-screen overflow-hidden">
        <CallCenterSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto bg-muted/30 p-6">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
