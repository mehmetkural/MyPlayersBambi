import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MyPlayers',
  description: 'Haftalık futbol grubu puanlama ve takım kurma platformu',
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as 'tr' | 'en' | 'de')) {
    notFound();
  }
  const messages = await getMessages();
  return (
    <html lang={locale}>
      <body className="bg-gray-950 text-gray-100 min-h-screen antialiased">
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
