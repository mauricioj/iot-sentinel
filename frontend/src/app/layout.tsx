import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import './globals.css';
import { AuthProvider } from '@/contexts/auth-context';
import { ThingTypesProvider } from '@/contexts/thing-types-context';
import { ToastProvider } from '@/components/ui/toast';

export const metadata: Metadata = {
  title: 'IoT Sentinel',
  description: 'IoT device management and network monitoring',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className="dark">
      <body>
        <NextIntlClientProvider messages={messages}>
          <ToastProvider>
            <AuthProvider>
              <ThingTypesProvider>{children}</ThingTypesProvider>
            </AuthProvider>
          </ToastProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
