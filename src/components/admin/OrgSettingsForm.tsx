'use client';

import { useState, useTransition } from 'react';
import { adminUpdateOrgSettings, type ActionResult } from '@/app/actions/admin';
import { Result } from './OrgPlanForm';

/**
 * The Enterprise customization surface.
 *
 * Everything here is injected into the Coach, research, and campaign prompts as
 * reference context, which is what makes a tenant's TRUSS feel like theirs
 * without a fork of the codebase. Playbook rules carry the most weight: they
 * are the rules a rep is held to, and the Coach cites them by name.
 *
 * Lists are edited as one-per-line text, because that is how somebody actually
 * pastes a playbook out of a document.
 */

export interface OrgSettings {
  trades: string[];
  service_area: string[];
  playbook_rules: string[];
  brand_name: string | null;
  brand_logo_url: string | null;
  brand_color: string | null;
  default_locale: 'en' | 'es';
}

const toLines = (values: string[]) => values.join('\n');
const fromLines = (value: string) =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

export function OrgSettingsForm({
  orgId,
  settings,
}: {
  orgId: string;
  settings: OrgSettings | null;
}) {
  const [trades, setTrades] = useState(toLines(settings?.trades ?? []));
  const [area, setArea] = useState(toLines(settings?.service_area ?? []));
  const [rules, setRules] = useState(toLines(settings?.playbook_rules ?? []));
  const [brandName, setBrandName] = useState(settings?.brand_name ?? '');
  const [brandLogo, setBrandLogo] = useState(settings?.brand_logo_url ?? '');
  const [brandColor, setBrandColor] = useState(settings?.brand_color ?? '');
  const [locale, setLocale] = useState<'en' | 'es'>(settings?.default_locale ?? 'en');
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();

  return (
    <section className="admin-card">
      <h2>Company context</h2>
      <p className="admin-sub">
        Injected into every Coach, research, and campaign prompt for this tenant. One item per
        line.
      </p>

      <label className="admin-field">
        Trades
        <textarea
          rows={3}
          value={trades}
          onChange={(e) => setTrades(e.target.value)}
          placeholder={'Roofing\nSiding\nGutters'}
        />
      </label>

      <label className="admin-field">
        Service area
        <textarea
          rows={3}
          value={area}
          onChange={(e) => setArea(e.target.value)}
          placeholder={'Dallas TX\nFort Worth TX'}
        />
      </label>

      <label className="admin-field">
        Playbook rules
        <textarea
          rows={6}
          value={rules}
          onChange={(e) => setRules(e.target.value)}
          placeholder={
            'Never quote a price at the door. Scope comes after the adjuster meeting.\n' +
            'Every contingency agreement must be countersigned by a manager.'
          }
        />
        <small>
          The highest-leverage field. These are the rules a rep is held to, and the Coach will
          hold them to these rules by name.
        </small>
      </label>

      <h3 className="admin-h3">White label</h3>
      <div className="admin-row">
        <label className="admin-grow">
          Brand name
          <input
            type="text"
            value={brandName}
            maxLength={120}
            onChange={(e) => setBrandName(e.target.value)}
          />
        </label>
        <label>
          Brand color
          <input
            type="text"
            value={brandColor}
            maxLength={32}
            placeholder="#c8901c"
            onChange={(e) => setBrandColor(e.target.value)}
          />
        </label>
        <label>
          Default language
          <select value={locale} onChange={(e) => setLocale(e.target.value as 'en' | 'es')}>
            <option value="en">English</option>
            <option value="es">Español</option>
          </select>
        </label>
      </div>

      <label className="admin-field">
        Brand logo URL
        <input
          type="url"
          value={brandLogo}
          maxLength={500}
          placeholder="https://…"
          onChange={(e) => setBrandLogo(e.target.value)}
        />
      </label>

      <div className="admin-actions">
        <button
          type="button"
          className="admin-btn admin-btn-primary"
          disabled={pending}
          onClick={() =>
            start(async () => {
              setResult(
                await adminUpdateOrgSettings({
                  orgId,
                  trades: fromLines(trades),
                  serviceArea: fromLines(area),
                  playbookRules: fromLines(rules),
                  brandName: brandName.trim() || null,
                  brandLogoUrl: brandLogo.trim() || null,
                  brandColor: brandColor.trim() || null,
                  defaultLocale: locale,
                }),
              );
            })
          }
        >
          {pending ? 'Saving…' : 'Save context'}
        </button>
      </div>

      <Result result={result} success="Context saved." />
    </section>
  );
}
