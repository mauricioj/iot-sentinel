import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/auth-context';
import { ThingTypesProvider } from '@/contexts/thing-types-context';

export const metadata: Metadata = {
  title: 'IoT Sentinel',
  description: 'IoT device management and network monitoring',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <AuthProvider>
          <ThingTypesProvider>{children}</ThingTypesProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
