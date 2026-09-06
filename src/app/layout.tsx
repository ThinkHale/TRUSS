import type { Metadata, Viewport } from 'next';
import { Inter, Montserrat } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import './globals.css';

/**
 * The brand typefaces: Montserrat for headlines, Inter for body.
 *
 * globals.css has named Inter in --font-sans since the beginning, but nothing
 * ever loaded it — so every screen has been rendering in whatever system-ui
 * resolves to. next/font self-hosts both, which also means no request to
 * Google from a rep's phone.
 */
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const montserrat = Montserrat({
  subsets: ['latin'],
  // Headline weights only. The body face carries everything else.
  weight: ['600', '700', '800', '900'],
  variable: '--font-montserrat',
  display: 'swap',
});

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
    images: [{ url: '/brand/truss-logo.png', width: 2381, height: 1158, alt: 'TRUSS' }],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  // TRUSS Navy, from the brand kit.
  themeColor: '#0B1F2A',
  width: 'device-width',
  initialScale: 1,
  // Reps zoom in on photos and scope sheets; never lock that away.
  maximumScale: 5,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className={`h-full ${inter.variable} ${montserrat.variable}`}>
      <body className="min-h-full antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
