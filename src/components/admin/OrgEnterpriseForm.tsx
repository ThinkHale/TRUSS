'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  adminRemoveDomain,
  adminSetContract,
  adminSetDomain,
  adminSetHierarchy,
  type ActionResult,
} from '@/app/actions/admin';
import { Result } from './OrgPlanForm';

export interface OrgDomain {
  domain: string;
  default_role: 'rep' | 'manager';
  auto_join: boolean;
  sso_required: boolean;
  verified_at: string | null;
}

/**
 * The enterprise controls an operator sets on a tenant: where it sits in a
 * portfolio, which email domains are its own (and whether they must use SSO),
 * and what its offline contract is worth.
 */
export function OrgEnterpriseForm({
  orgId,
  kind,
  parentId,
  portfolios,
  companies,
  domains,
  contract,
}: {
  orgId: string;
  kind: 'company' | 'portfolio';
  parentId: string | null;
  portfolios: { id: string; name: string }[];
  /** Companies inside this org, when it is a portfolio. */
  companies: { id: string; name: string }[];
  domains: OrgDomain[];
  contract: { annualCents: number | null; startsOn: string | null; renewsOn: string | null };
}) {
  const [pending, start] = useTransition();

  const [nextKind, setNextKind] = useState(kind);
  const [parent, setParent] = useState(parentId ?? '');
  const [hierarchyResult, setHierarchyResult] = useState<ActionResult | null>(null);

  const [domain, setDomain] = useState('');
  const [role, setRole] = useState<'rep' | 'manager'>('rep');
  const [autoJoin, setAutoJoin] = useState(true);
  const [sso, setSso] = useState(false);
  const [domainResult, setDomainResult] = useState<ActionResult | null>(null);

  const [annual, setAnnual] = useState(contract.annualCents == null ? '' : String(Math.round(contract.annualCents / 100)));
  const [startsOn, setStartsOn] = useState(contract.startsOn ?? '');
  const [renewsOn, setRenewsOn] = useState(contract.renewsOn ?? '');
  const [contractResult, setContractResult] = useState<ActionResult | null>(null);

  return (
    <>
      <section className="admin-card">
        <h2>Portfolio</h2>
        <p className="admin-sub">
          A portfolio is a holding company. Companies placed in it inherit its playbook rules, knowledge, and
          published scenarios, and its leaders see their aggregated numbers — never their people&apos;s transcripts.
        </p>
        <div className="admin-row">
          <label>
            This organization is a
            <select value={nextKind} onChange={(e) => setNextKind(e.target.value as 'company' | 'portfolio')}>
              <option value="company">company</option>
              <option value="portfolio">portfolio</option>
            </select>
          </label>
          {nextKind === 'company' && (
            <label className="admin-grow">
              In portfolio
              <select value={parent} onChange={(e) => setParent(e.target.value)}>
                <option value="">— none —</option>
                {portfolios.filter((p) => p.id !== orgId).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
          )}
          <button type="button" className="admin-btn admin-btn-primary" disabled={pending}
            onClick={() => start(async () =>
              setHierarchyResult(await adminSetHierarchy({ orgId, kind: nextKind, parentId: parent || null })))}>
            Save
          </button>
        </div>
        <Result result={hierarchyResult} success="Saved." />
        {kind === 'portfolio' && (
          <p className="admin-note">
            {companies.length
              ? <>Companies in it: {companies.map((c, i) => (
                  <span key={c.id}>{i ? ', ' : ''}<Link href={`/admin/orgs/${c.id}`}>{c.name}</Link></span>
                ))}.</>
              : 'No companies in it yet. Open a company and choose this portfolio.'}
          </p>
        )}
      </section>

      <section className="admin-card">
        <h2>Email domains and SSO</h2>
        <p className="admin-sub">
          Anyone who signs in with a confirmed address at these domains joins this company. Establish that the
          company owns the domain first — a DNS TXT record or the signed agreement — because this decides who lands
          in the tenant. With <b>SSO required</b>, password sign-ins at the domain are refused; set up the SAML
          connection in Supabase (<code>supabase sso add</code>) before turning it on.
        </p>
        {domains.length > 0 && (
          <ul className="admin-list">
            {domains.map((d) => (
              <li key={d.domain}>
                <code>{d.domain}</code>
                <small>
                  joins as {d.default_role}{d.auto_join ? '' : ' (auto-join off)'}
                  {d.sso_required ? ' · SSO required' : ''}
                </small>
                <button type="button" className="admin-btn admin-btn-danger" disabled={pending}
                  onClick={() => {
                    if (confirm(`Remove ${d.domain}? New people at it will no longer join automatically.`)) {
                      start(async () => setDomainResult(await adminRemoveDomain(orgId, d.domain)));
                    }
                  }}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="admin-row">
          <label className="admin-grow">
            Domain
            <input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="apexroofing.com" />
          </label>
          <label>
            Joins as
            <select value={role} onChange={(e) => setRole(e.target.value as 'rep' | 'manager')}>
              <option value="rep">rep</option>
              <option value="manager">manager</option>
            </select>
          </label>
          <label className="admin-field">
            <input type="checkbox" checked={autoJoin} onChange={(e) => setAutoJoin(e.target.checked)} /> Auto-join
          </label>
          <label className="admin-field">
            <input type="checkbox" checked={sso} onChange={(e) => setSso(e.target.checked)} /> SSO required
          </label>
          <button type="button" className="admin-btn admin-btn-primary" disabled={pending || !domain.trim()}
            onClick={() => start(async () => {
              const r = await adminSetDomain({ orgId, domain, defaultRole: role, autoJoin, ssoRequired: sso });
              setDomainResult(r);
              if (r.ok) setDomain('');
            })}>
            Add domain
          </button>
        </div>
        <Result result={domainResult} success="Saved." />
      </section>

      <section className="admin-card">
        <h2>Contract</h2>
        <p className="admin-sub">
          For an agreement signed outside Stripe. The economics view uses this as the company&apos;s revenue.
        </p>
        <div className="admin-row">
          <label>
            Annual value (USD)
            <input inputMode="numeric" value={annual} onChange={(e) => setAnnual(e.target.value.replace(/[^0-9]/g, ''))} placeholder="60000" />
          </label>
          <label>
            Starts
            <input type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
          </label>
          <label>
            Renews
            <input type="date" value={renewsOn} onChange={(e) => setRenewsOn(e.target.value)} />
          </label>
          <button type="button" className="admin-btn admin-btn-primary" disabled={pending}
            onClick={() => start(async () => setContractResult(await adminSetContract({
              orgId,
              annualDollars: annual ? Number(annual) : null,
              startsOn: startsOn || null,
              renewsOn: renewsOn || null,
            })))}>
            Save
          </button>
        </div>
        <Result result={contractResult} success="Saved." />
      </section>
    </>
  );
}
