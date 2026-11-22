import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Guest Review Insights',
  description: 'Booking.com guest review insights for Azzurro Hotels operations',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
