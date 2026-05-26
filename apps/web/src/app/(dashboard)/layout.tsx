'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { Sidebar } from '@/components/layouts/sidebar';
import { Header } from '@/components/layouts/header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'CALL_CENTER', 'PATIENT']}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
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
