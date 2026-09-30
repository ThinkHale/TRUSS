import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Security',
  description:
    'How TRUSS isolates each company’s data, who can see what, where it is processed, and what a security review can ask us for.',
};

/**
 * The page a customer's security reviewer reads first.
 *
 * Every claim here is enforced somewhere specific, and the comment beside it
 * says where, so this page is revised when the enforcement changes rather than
 * drifting from it. It deliberately makes no certification claim TRUSS does
 * not hold: SOC 2 is described as in preparation, because it is.
 */

const CONTROLS: { title: string; body: string }[] = [
  {
    // Every tenant table carries org_id with RLS on; see docs/ARCHITECTURE.md
    // and tests/db/migrations.test.ts.
    title: 'Each company is isolated in the database',
    body: 'Every row carries the company it belongs to, and Postgres row-level security decides what each signed-in person can read or write. Isolation is not a filter in application code that a bug could skip; it is enforced by the database on every query, and an automated test suite runs cross-company reads and writes against a real Postgres on every change.',
  },
  {
    // coach_conversations_own (0002); no manager, portfolio, or operator policy.
    title: 'Coach conversations are private to the rep',
    body: 'A rep’s conversations with TRUSS Coach can be read by that rep and nobody else — not their manager, not their company’s owners, not a portfolio’s leaders, and not TRUSS staff. Practice scores and field reviews are visible to the rep’s managers, and reps are told so.',
  },
  {
    // portfolio_company_summary is SECURITY DEFINER and returns aggregates only (0023).
    title: 'Holding companies see numbers, not people',
    body: 'A portfolio’s leaders see each operating company’s aggregate adoption, scores, and outcomes. They have no access to an operating company’s transcripts, scorecards, or customer records; those stay with that company’s own managers.',
  },
  {
    // org_audit_log + admin_audit_log, written in the same transaction (0008, 0017).
    title: 'Everything done with authority is logged',
    body: 'Adding or removing people, changing roles, loading company material, exporting data, connecting systems, and issuing credentials are each recorded in the same database transaction as the change. Anything TRUSS staff do inside a company’s account appears in that company’s own audit log.',
  },
  {
    // sso_required_for / ssoStatus(); org_domains (0021).
    title: 'Single sign-on and domain control',
    body: 'Companies can sign in through their identity provider with SAML SSO and require it for their email domain, so removing someone in the identity provider ends their TRUSS access. A company’s owners and admins invite, re-role, and remove their own people; removal takes effect on the next request.',
  },
  {
    // /api/export (scope=org|accounts|me).
    title: 'Your data leaves when you want it to',
    body: 'Owners and admins can export their company’s data as JSON and their accounts as CSV at any time. Every person can download everything TRUSS holds about them. Deleting a company removes its data from the live database.',
  },
  {
    // /api/integrations/outcomes; token_hash only (0022).
    title: 'Integration tokens are stored as hashes',
    body: 'A CRM connection authenticates with a token that is shown once and stored only as a SHA-256 hash, can be revoked instantly, and can write only to the company that created it.',
  },
  {
    // field-review route: remove() in a finally; consent attestation stored.
    title: 'Recorded conversations are consent-gated and not kept',
    body: 'Field reviews require the uploader to confirm that everyone on the recording knew and agreed. The audio is deleted as soon as it is transcribed; the transcript and scorecard are kept, and the attestation is recorded with them.',
  },
  {
    // GUARDRAILS in src/lib/ai/prompts.ts, appended after tenant material.
    title: 'Company material cannot loosen the guardrails',
    body: 'Documents a company loads into the Coach are treated as reference, not instruction. TRUSS will not coach deductible waiving, exaggerated damage, or promised claim outcomes whatever a document says, and it flags them when a rep does.',
  },
];

const SUBPROCESSORS: [string, string, string][] = [
  ['Supabase', 'Database, authentication, file storage', 'United States'],
  ['OpenAI', 'Language, speech, transcription, and embedding models', 'United States'],
  ['Vercel', 'Application hosting and logs', 'United States'],
  ['Stripe', 'Subscription billing', 'United States'],
  ['Google Maps Platform', 'Geocoding, places, and weather for area research', 'United States'],
];

export default function SecurityPage() {
  return (
    <div className="px-5 py-16">
      <div className="mx-auto max-w-3xl">
        <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-gold-600">Security</p>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">How TRUSS protects your company&apos;s data</h1>
        <p className="mt-5 text-lg text-ink-600">
          Written for the person reviewing TRUSS before their company signs. Each point below describes what the
          system actually enforces.
        </p>

        <div className="mt-10 grid gap-4">
          {CONTROLS.map((c) => (
            <section key={c.title} className="card">
              <h2 className="text-lg font-bold">{c.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">{c.body}</p>
            </section>
          ))}
        </div>

        <h2 className="mt-12 text-2xl font-extrabold tracking-tight">Subprocessors</h2>
        <div className="card mt-4 overflow-x-auto !p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wider text-ink-500">
              <tr><th className="p-3">Provider</th><th className="p-3">Used for</th><th className="p-3">Where</th></tr>
            </thead>
            <tbody>
              {SUBPROCESSORS.map(([name, use, where]) => (
                <tr key={name} className="border-b border-line last:border-0">
                  <td className="p-3 font-semibold">{name}</td>
                  <td className="p-3 text-ink-600">{use}</td>
                  <td className="p-3 text-ink-600">{where}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-ink-500">
          Storm data comes from NOAA and the National Weather Service; no personal information is sent to them.
        </p>

        <h2 className="mt-12 text-2xl font-extrabold tracking-tight">Compliance and documents</h2>
        <div className="card mt-4 text-sm leading-relaxed text-ink-600">
          <p>
            TRUSS is preparing for a SOC 2 Type I examination. We do not hold a SOC 2 report today and will not
            claim one until an independent auditor has issued it.
          </p>
          <p className="mt-3">
            Enterprise customers can request our security questionnaire responses, a data processing agreement, and
            our service-level terms. Write to{' '}
            <a className="font-semibold underline" href="mailto:security@trusscoach.com">security@trusscoach.com</a> — the
            same address takes vulnerability reports.
          </p>
          <p className="mt-3">
            See also the <Link href="/privacy" className="font-semibold underline">privacy policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
