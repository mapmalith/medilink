import type { Metadata } from 'next';
import './globals.css';
import { GeistSans } from 'geist/font/sans';
import { cn } from '@/lib/utils';
import { Providers } from '@/components/providers';

export const metadata: Metadata = {
  title: 'MEDI LINK',
  description: 'Medical appointment platform for tourists visiting Sri Lanka',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={cn('font-sans', GeistSans.variable)}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
