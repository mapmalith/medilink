'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { HotelSidebar } from '@/components/layouts/hotel-sidebar';
import { Header } from '@/components/layouts/header';

export default function HotelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute allowedRoles={['HOTEL']}>
      <div className="flex h-screen overflow-hidden">
        <HotelSidebar />
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
