import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/lib/i18n/request.ts');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // Coach + Practice stream tokens and audio; keep server actions lean.
    serverActions: { bodySizeLimit: '4mb' },
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Practice mode needs the microphone. Everything else is denied.
          { key: 'Permissions-Policy', value: 'camera=(), geolocation=(self), microphone=(self)' },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
