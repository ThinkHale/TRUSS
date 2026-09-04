import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://trusscoach.com'),
  title: {
    default: 'TRUSS — Sales intelligence for the Trades',
    template: '%s · TRUSS',
  },
  description:
    'TRUSS is a sales coaching and training platform for roofers, contractors, and home-services ' +
    'sales reps. Practice real conversations out loud, get scored on Trust, Relate, Understand, ' +
    'Solve, Secure, and know the weather before you knock.',
  applicationName: 'TRUSS',
  openGraph: {
    type: 'website',
    siteName: 'TRUSS',
    url: 'https://trusscoach.com',
    title: 'TRUSS — Sales intelligence for the Trades',
    description: 'A sales coach that trains the trades on what actually closes a job.',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#0a0c10',
  width: 'device-width',
  initialScale: 1,
  // Reps zoom in on photos and scope sheets; never lock that away.
  maximumScale: 5,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className="h-full">
      <body className="min-h-full antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
