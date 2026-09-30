# TRUSS

**Sales intelligence for the Trades.**

TRUSS is a sales coaching and training platform for roofers, restoration contractors, and
home-services sales reps. It is built around a methodology of the same name.

> **T**rust · **R**elate · **U**nderstand · **S**olve · **S**ecure

The platform is designed for a workforce whose business is largely insurance-driven,
weather-dependent, and sold directly to homeowners — and for people who did not choose a
career in software. It is mobile-first, high-contrast, English and Spanish throughout, and
it never coaches a rep to do something that would cost them their license.

---

## What it does

**TRUSS Coach** is the centerpiece. A conversational coach that knows insurance claims,
deductibles, adjusters, and storm chasers, and that diagnoses which TRUSS stage actually
broke before answering. Enterprise tenants get a Coach grounded in their own playbook.

**Practice** is spoken roleplay. A rep talks out loud to a virtual homeowner, adjuster, or
property manager over a live voice connection, then gets a scorecard grading all five TRUSS
stages against what they actually said, with verbatim evidence and one thing to change.

**Research** briefs an area before it is worked: current conditions and a seven-day forecast
from Google, go/no-go calls for crews and canvassers, storm history from NOAA with a read on
whether damage is still claimable, and nearby commercial properties from Google Places.

**Campaigns** writes outreach anchored to a TRUSS stage, in English and Spanish.

**Accounts** tracks properties by the fields that actually decide a trades deal: carrier,
deductible, claim status, decision maker, and which stage the rep is in — and what it sold for,
or why it was lost.

**Program** runs the TRUSS Eight-Week Training Program in cohorts: weekly pre-work and field
evidence, practice targets, a manager's check each week, and a verifiable credential issued
against the program's own criteria.

**Field review** scores a real, recorded conversation — with everyone's consent — against the
same rubric as practice. The audio is deleted once transcribed.

**Team** is the manager's side: stage-by-stage scores for every rep, ramp time, the compliance
report, scenario authoring, the company knowledge base, outcomes from the CRM, the roster, and
the audit log. **Portfolio** rolls operating companies up for the holding company that owns them.

## Two distribution models

**Subscription.** Self-serve plans with metered AI usage. Free, Pro, and Team tiers are
defined as data in `plan_entitlements`, enforced in the database by `within_quota`.

**Enterprise.** A tenant uploads their training material, playbook, pricing rules, and
policies. Those are chunked, embedded, and retrieved into their Coach's context at question
time, with citations. Managers author custom roleplay scenarios drawn from their real market.
Isolation is enforced by Row Level Security, not by application filtering.

---

## Stack

| Concern | Choice |
| --- | --- |
| App | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4 |
| Data + auth | Supabase (Postgres, RLS, pgvector) |
| AI | OpenAI — chat, Realtime voice, transcription, speech, embeddings |
| Maps and places | Google Geocoding + Places API (New) |
| Weather | Google Maps Platform Weather API |
| Severe weather | NOAA / NWS and the Iowa Environmental Mesonet (free, keyless) |
| Billing | Stripe |
| i18n | next-intl, English and Spanish |

No Azure or Microsoft services are used anywhere in the stack.

---

## Getting started

```bash
npm install
cp .env.example .env.local     # then fill in your keys
npm run dev
```

Apply the migrations in `supabase/migrations/` in numeric order, either through the Supabase
SQL editor or with `supabase db push`. `0005` requires the `vector` extension, which Supabase
provides.

Visiting the app without configuration lands on `/setup`, which shows which environment
variables are still missing.

## Layout

```
src/
  app/
    (marketing)/     Public site: landing, pricing, enterprise, auth
    (app)/           The platform: coach, practice, research, campaigns, accounts
    api/             Server routes. All secrets stay here.
  components/        UI, grouped by feature
  lib/
    truss/           The methodology, scoring rubric, and scenarios — the domain model
    ai/              Prompt construction, OpenAI access, knowledge retrieval
    google/          Geocoding, Places, Weather, storm signal
    supabase/        Server, browser, and session/org resolution
    voice/           WebRTC realtime roleplay and the push-to-talk fallback
    i18n/            Locale resolution
  messages/          en.json, es.json
supabase/migrations/ Schema, RLS policies, and database functions
docs/                Methodology, architecture, deployment, enterprise
```

The methodology lives in `src/lib/truss/methodology.ts` and is the single source of truth.
Coach prompts, the scoring rubric, and the progress UI are all generated from it, so they
cannot drift apart.

## Tests

```bash
npm test            # unit tests, then every migration and RLS policy against in-process Postgres
npm run knowledge:check
```

The database suite (`tests/db`) needs no Supabase project and no Docker: it applies every
migration to PGlite and exercises the policies as each role. CI runs it on every push.

## Documentation

- [`docs/TRUSS-METHODOLOGY.md`](docs/TRUSS-METHODOLOGY.md) — the methodology in full
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — how it fits together and why
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — deploying to trusscoach.com
- [`docs/ENTERPRISE.md`](docs/ENTERPRISE.md) — onboarding an Enterprise tenant or a portfolio
- [`docs/INTEGRATIONS.md`](docs/INTEGRATIONS.md) — connecting a CRM for outcomes
- [`docs/SECURITY-COMPLIANCE.md`](docs/SECURITY-COMPLIANCE.md) — controls in place and SOC 2 readiness
- [`docs/CONTENT-RIGHTS.md`](docs/CONTENT-RIGHTS.md) — what TRUSS owns, and what to settle before an exit
