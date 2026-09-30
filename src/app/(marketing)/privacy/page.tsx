import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy',
  description:
    'What TRUSS collects, who can see it, and where it goes — including the homeowner and claim information your team enters.',
};

/**
 * Privacy policy.
 *
 * This describes what the platform actually does, so it has to be revised when
 * the data flows change. The load-bearing claims, and where they are enforced:
 *
 *  - Coach conversations are private to the rep. `coach_conversations_own`
 *    (migration 0002) has no manager-read counterpart, unlike the policies on
 *    practice_sessions, practice_turns, and scorecards.
 *  - That holds for operators too: the admin console reads through the caller's
 *    own client with RLS applied (src/lib/auth/platform.ts).
 *  - Live roleplay audio is negotiated browser-to-provider over WebRTC
 *    (src/lib/voice/useRealtimeRoleplay.ts) and never reaches our servers. The
 *    push-to-talk fallback does upload a clip (api/practice/reply), which is
 *    transcribed within the request and never persisted — only the text turn is.
 *  - Campaign copy is generated, not sent. Nothing here messages a homeowner.
 *
 * ORG carries what a policy needs and the code cannot tell us.
 */

const ORG = {
  // TODO: replace with the registered legal entity, and add a postal address,
  // before this is relied on where the controller's identity must be published.
  entity: 'TRUSS',
  contact: 'support@trusscoach.com',
  effective: 'September 8, 2026',
};

const PROCESSORS: [string, string][] = [
  ['Supabase', 'Database, sign-in, and file storage. Everything you save in TRUSS lives here.'],
  [
    'OpenAI',
    'Coach answers, roleplay characters, scoring, research briefs, campaign drafts, and knowledge-base indexing.',
  ],
  [
    'Stripe',
    'Subscription payments. Card details go to Stripe directly and are never held by us.',
  ],
  ['Google Maps Platform', 'Geocoding, nearby places, and weather for area research.'],
  [
    'NOAA / National Weather Service',
    'Storm reports for area research. No personal information is sent.',
  ],
  ['Vercel', 'Application hosting, and the server logs that come with it.'],
];

const SUMMARY = [
  'We do not sell your information and we do not advertise to you. There is nothing here for a data broker to buy.',
  'Your conversations with TRUSS Coach are yours. Your manager cannot read them, and neither can we through our operator console.',
  'Homeowner and claim information belongs to the company you work for. We hold it on their instructions, not for our own use.',
  'Live roleplay audio goes straight from your device to our speech provider. It never touches our servers and we never record it.',
];

export default function PrivacyPage() {
  return (
    <div className="px-5 py-16">
      <div className="mx-auto max-w-3xl">
        <header>
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-gold-600">Privacy</p>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            What we collect, and who can see it
          </h1>
          <p className="mt-5 text-lg text-ink-600">
            TRUSS holds two things that deserve care: what you tell the Coach, and what your team
            records about homeowners. This explains what happens to both.
          </p>
          <p className="mt-4 text-sm text-ink-500">Effective {ORG.effective}</p>
        </header>

        <div className="card mt-10">
          <h2 className="text-lg font-bold">The short version</h2>
          <ul className="mt-4 space-y-3 text-sm leading-relaxed text-ink-800">
            {SUMMARY.map((line) => (
              <li key={line} className="flex gap-2">
                <span aria-hidden style={{ color: 'var(--color-go)' }}>
                  ✓
                </span>
                {line}
              </li>
            ))}
          </ul>
        </div>

        <Section title="1. Two kinds of information">
          <p>
            TRUSS is sold to companies. When your employer buys it, they decide who uses it and what
            gets entered into it. That splits the information here in two, and the two are not
            governed the same way.
          </p>
          <p>
            <strong className="text-ink-800">Your account information</strong> — your name, your
            email, your settings, and what you do in the product. This policy explains what we do
            with it, and we answer to you for it.
          </p>
          <p>
            <strong className="text-ink-800">Your company&rsquo;s customer information</strong> — the
            homeowners, contacts, addresses, and insurance claims your team enters. That belongs to
            your company. We store and process it under our agreement with them and on their
            instructions. If you want a homeowner record corrected or removed, the request goes to
            your company; when they ask us, we carry it out.
          </p>
        </Section>

        <Section title="2. What we collect">
          <List
            items={[
              [
                'Account and profile',
                'Your name, email address, phone number, profile photo, and whether you use TRUSS in English or Spanish.',
              ],
              [
                'Your company',
                'Company name, trades, service area, plan and seat count, your role, and invitations sent to your team.',
              ],
              [
                'What you write in the product',
                'Coach conversations, roleplay transcripts and scorecards, notes and logged activity on accounts, campaign drafts, area research briefs, and any company material uploaded to the knowledge base.',
              ],
              [
                'Homeowner and account records',
                'Names, addresses, phone numbers, email addresses, preferred language, and the insurance details this work runs on — carrier, policy number, claim number, deductible, and date of loss. Your team enters these about your team’s customers.',
              ],
              [
                'Billing',
                'If your company subscribes, we keep the plan, subscription status, seat count, and the identifiers our payment processor gives us. We never see or store card numbers.',
              ],
              [
                'Usage',
                'Counts of what has been used against your plan’s limits, and a log of administrative actions taken in the admin console.',
              ],
              [
                'Technical',
                'The ordinary server and security logs our host keeps, including IP address and browser type.',
              ],
            ]}
          />
          <p>
            We do not run advertising or analytics trackers, and we do not buy information about you
            from anyone.
          </p>
        </Section>

        <Section title="3. Your microphone, and what happens to the audio">
          <p>
            Practice is a spoken exercise, so it asks for your microphone. Your browser asks first,
            and you can say no — there is a typed mode that works without one.
          </p>
          <p>
            On a good connection, audio travels directly from your device to our speech provider over
            an encrypted connection. It does not pass through TRUSS and we do not record it. When the
            signal is poor, TRUSS falls back to hold-to-talk: that clip is uploaded, turned into text
            within the same request, and discarded. It is never saved.
          </p>
          <p>
            What we keep, either way, is the written transcript of the conversation and the score it
            produced — a scorecard with no evidence in it is not worth reading.
          </p>
        </Section>

        <Section title="4. Who can see what inside your company">
          <p>
            People on your team do not all see the same things. These limits are attached to the data
            in the database itself, rather than enforced by screens that hide it, which means they
            hold even where the interface does not.
          </p>
          <List
            items={[
              [
                'Coach conversations',
                'Only you. Not your owner, not your admins, not your managers — and not our staff through the operator console, which reads with your permissions applied rather than around them.',
              ],
              [
                'Practice sessions, transcripts, and scorecards',
                'You, plus the owners, admins, and managers at your company. Coaching is the entire point of the exercise, so managers can see how it went.',
              ],
              [
                'Accounts, contacts, activity, campaigns, and research',
                'Everyone signed in at your company. This is the shared record of the work.',
              ],
              ['Billing and team management', 'Owners and admins.'],
            ]}
          />
        </Section>

        <Section title="5. Who else touches it">
          <p>
            We use a small number of vendors to run TRUSS. They may process information only to
            provide their service to us:
          </p>
          <dl className="divide-y divide-[var(--color-line)] border-y border-[var(--color-line)]">
            {PROCESSORS.map(([name, role]) => (
              <div key={name} className="grid gap-1 py-3 sm:grid-cols-[13rem_1fr] sm:gap-4">
                <dt className="text-sm font-bold text-ink-800">{name}</dt>
                <dd className="text-sm text-ink-600">{role}</dd>
              </div>
            ))}
          </dl>
          <p>
            Area research sends only the place you searched — a city, a ZIP code, or an address — to
            the mapping and weather services. It does not send your accounts or your contacts.
          </p>
          <p>
            Campaigns are written, not sent. TRUSS drafts the copy and hands it to you; it never
            emails, texts, or calls a homeowner on your behalf.
          </p>
          <p>
            We do not sell personal information and we do not share it for cross-context behavioral
            advertising. We will disclose information where the law requires it, and if the business
            is ever sold or merged, information may transfer with it under this same policy until it
            is replaced by one you are told about.
          </p>
        </Section>

        <Section title="6. Cookies">
          <p>
            Two, and both are necessary: one that keeps you signed in, and one named{' '}
            <code className="rounded bg-paper-200 px-1 py-0.5 text-[0.85em]">truss_locale</code> that
            remembers whether you want English or Spanish.
          </p>
          <p>
            There are no advertising cookies and no third-party trackers. Nothing here follows you to
            another site. That is why you are not being asked to dismiss a cookie banner.
          </p>
        </Section>

        <Section title="7. How long we keep it">
          <p>
            Your account information stays while your account is open. When an account is deleted,
            the profile and everything private to that person — Coach conversations, practice
            sessions, transcripts, and scorecards — is deleted with it.
          </p>
          <p>
            Your company&rsquo;s records — accounts, contacts, activity, campaigns, research, and the
            knowledge base — belong to the company and remain until the company deletes them or
            closes its account. Encrypted backups persist for a limited period after deletion, and
            billing records are kept as long as tax and accounting rules require.
          </p>
        </Section>

        <Section title="8. Your choices">
          <p>
            You can ask us to show you what we hold about you, correct it, export it, or delete it.
          </p>
          <List
            items={[
              [
                'For your own account',
                `Write to ${ORG.contact}. We will confirm it is you before we act, and we will not treat you differently for asking.`,
              ],
              [
                'For homeowner or claim records',
                'Ask an owner or admin at your company. They control that information; we act on their instruction.',
              ],
              [
                'For your microphone',
                'Revoke the permission in your browser at any time. Practice still works typed.',
              ],
            ]}
          />
          <p>
            Where you live may give you additional rights — California, the EU and UK, and a growing
            number of US states all do. We apply the rights above to everyone rather than checking
            your address first.
          </p>
        </Section>

        <Section title="9. Security">
          <p>
            Each company&rsquo;s data is isolated at the database level, by rules the database
            enforces on every query, rather than by filters written into application code that can be
            forgotten. Traffic is encrypted in transit. Our provider keys stay on the server and are
            never sent to your browser.
          </p>
          <p>
            No system is perfect, and we will not pretend otherwise. If a breach affects your
            information, we will tell you and your company promptly.
          </p>
        </Section>

        <Section title="10. Children">
          <p>
            TRUSS is a tool for working adults. It is not directed to children, and we do not
            knowingly collect information from anyone under 16.
          </p>
        </Section>

        <Section title="11. Changes">
          <p>
            When this changes, the effective date at the top changes with it. If a change materially
            affects what we do with your information, we will tell you in the product before it takes
            effect.
          </p>
        </Section>

        <Section title="12. Contact us">
          <p>
            Questions about this policy, or a request about your information:{' '}
            <a className="font-bold text-gold-600 underline" href={`mailto:${ORG.contact}`}>
              {ORG.contact}
            </a>
            .
          </p>
          <p>
            Enterprise agreements, data processing terms, and security review start on{' '}
            <Link className="font-bold text-gold-600 underline" href="/enterprise">
              the enterprise page
            </Link>
            .
          </p>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="text-xl font-bold tracking-tight">{title}</h2>
      <div className="mt-3 space-y-3 leading-relaxed text-ink-600">{children}</div>
    </section>
  );
}

function List({ items }: { items: [string, string][] }) {
  return (
    <ul className="space-y-3">
      {items.map(([term, detail]) => (
        <li key={term}>
          <strong className="text-ink-800">{term}.</strong> {detail}
        </li>
      ))}
    </ul>
  );
}
