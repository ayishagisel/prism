import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'PRISM - PR Intelligence & Signal Management',
  description: 'Centralized PR opportunity management platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
