'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { cx } from '@/lib/truss/ui';
import { BrandLogo } from '@/components/brand/Logo';

/**
 * Primary navigation.
 *
 * Coach comes first and stays visually dominant everywhere, because it is the
 * reason the platform exists. On phones this renders as a bottom bar, which is
 * where a thumb actually reaches.
 */

interface NavItem {
  href: string;
  key: 'coach' | 'practice' | 'research' | 'campaigns' | 'accounts' | 'method';
  icon: React.ReactNode;
  primary?: boolean;
}

const ITEMS: NavItem[] = [
  { href: '/coach', key: 'coach', primary: true, icon: <IconCoach /> },
  { href: '/practice', key: 'practice', icon: <IconMic /> },
  { href: '/method', key: 'method', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M12 5v16M12 5C9 3 5 3 2 4v15c3-1 7-1 10 2 3-3 7-3 10-2V4c-3-1-7-1-10 1Z" strokeLinejoin="round" /></svg> },
  { href: '/research', key: 'research', icon: <IconMap /> },
  { href: '/campaigns', key: 'campaigns', icon: <IconMegaphone /> },
  { href: '/accounts', key: 'accounts', icon: <IconHome /> },
];

export function AppNav({ orgName }: { orgName: string }) {
  const pathname = usePathname();
  const t = useTranslations('nav');

  return (
    <>
      {/* Phone: bottom bar */}
      <nav
        className="app-mobile-nav fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        aria-label="Main"
      >
        <ul className="flex">
          {ITEMS.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <li key={item.href} className="min-w-0 flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  // min-h-touch is the accessibility floor; the exact bar
                  // height comes from --app-tabbar-h so the Coach work area
                  // can subtract it and land flush.
                  className={cx(
                    'flex min-h-touch flex-col items-center justify-center gap-1 text-[11px] font-semibold',
                    active ? 'text-gold-600' : 'text-ink-500',
                  )}
                >
                  <span className={cx(item.primary && !active && 'text-ink-800')}>{item.icon}</span>
                  {t(item.key)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Desktop: sidebar */}
      <nav className="app-sidebar hidden shrink-0 md:flex" aria-label="Main">
        <Link href="/coach" className="app-sidebar-brand" aria-label="TRUSS Coach home">
          <BrandLogo preload className="app-sidebar-logo" />
        </Link>
        <ul className="app-sidebar-items space-y-1">
          {ITEMS.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                {/* Colors live in .app-sidebar-link — the navy chrome is the one
                    place the light-first tokens deliberately do not apply. */}
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cx('app-sidebar-link', item.primary && 'text-base')}
                >
                  <span>{item.icon}</span>
                  {t(item.key)}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="app-sidebar-footer">
          <Link href="/settings" className="app-org-link">
            <span>{(orgName || 'T').charAt(0).toUpperCase()}</span>
            <div><b>{orgName}</b><small>Settings</small></div>
            <i aria-hidden>›</i>
          </Link>
        </div>
      </nav>
    </>
  );
}

/* Icons are inline so the app ships no icon dependency and stays fast on 3G. */

function IconCoach() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconMic() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconMap() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M9 20l-5.4-2.7A1 1 0 0 1 3 16.4V5.6a1 1 0 0 1 1.4-.9L9 7m0 13l6-3m-6 3V7m6 10l4.6 2.3a1 1 0 0 0 1.4-.9V7.6a1 1 0 0 0-.6-.9L15 4m0 13V4m0 0L9 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconMegaphone() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M3 11v2a1 1 0 0 0 1 1h3l7 4V6l-7 4H4a1 1 0 0 0-1 1zM18 8a4 4 0 0 1 0 8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconHome() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M3 11l9-8 9 8M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
