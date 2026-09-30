'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * The Team area's sections. Owner/admin-only sections are passed in by the
 * server layout, which knows the role; this component only renders links —
 * every page authorizes on its own.
 */
export function TeamTabs({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const tabs = [
    { href: '/team', label: 'Overview', exact: true },
    { href: '/team/program', label: 'Program' },
    { href: '/team/compliance', label: 'Compliance' },
    { href: '/team/scenarios', label: 'Scenarios' },
    { href: '/team/knowledge', label: 'Knowledge' },
    { href: '/team/outcomes', label: 'Outcomes' },
    { href: '/team/people', label: 'People' },
    ...(isAdmin ? [{ href: '/team/audit', label: 'Audit log' }] : []),
  ];

  return (
    <nav className="team-tabs" aria-label="Team">
      {tabs.map((tab) => {
        const active = tab.exact
          ? pathname === tab.href || pathname.startsWith('/team/reps') || pathname.startsWith('/team/sessions')
          : pathname.startsWith(tab.href);
        return (
          <Link key={tab.href} href={tab.href} aria-current={active ? 'page' : undefined}>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
