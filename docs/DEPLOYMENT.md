# Deploying TRUSS to trusscoach.com

## 1. Supabase

Create a project, then apply the migrations in `supabase/migrations/` in numeric order —
either by pasting each into the SQL editor or with `supabase db push`.

`0005_knowledge_base.sql` needs the `vector` extension. Supabase provides it; the migration
enables it with `create extension if not exists vector`.

From **Project settings → API**, collect:

- Project URL → `NEXT_PUBLIC_SUPABASE_URL`
- `anon` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server only, never in the browser)

Under **Authentication → URL configuration**, set the site URL to `https://trusscoach.com`
and add `https://trusscoach.com/**` as a redirect URL.

### Verifying isolation after migrating

Worth doing once, because it is the property the Enterprise model depends on. Create two
organizations with one user each, sign in as one, and confirm you see only your own accounts
and knowledge documents — and that calling `match_knowledge` with the other org's id returns
zero rows.

## 2. Google Maps Platform

One project, one key, three APIs enabled:

- **Geocoding API** — resolves addresses for research and accounts
- **Places API (New)** — nearby commercial properties
- **Weather API** — current conditions and the seven-day forecast

The key is used server-side only, so restrict it by **API restriction**, not by HTTP
referrer. An unrestricted key on a public deployment will be scraped and billed.

Set a budget alert. Places bills per field returned, which is why `src/lib/google/places.ts`
requests a narrow field mask.

## 3. OpenAI

One key in `OPENAI_API_KEY`. The Realtime API must be enabled on the account for voice
practice; without it the app still runs and `PracticeRoom` falls back to hold-to-talk.

Model choices live in `src/lib/ai/openai.ts` and can be overridden per environment.

Set a usage limit. Voice practice is the expensive surface — the `plan_entitlements` table
caps it per org, but an account-level limit is a second line of defense.

## 4. NOAA

No key needed. `api.weather.gov` asks that requests identify themselves, so set
`NWS_USER_AGENT` to something with a real contact address.

## 5. Stripe (optional)

Only needed for self-serve subscriptions; Enterprise tenants are billed offline and have
their plan set directly on the `organizations` row.

Create recurring prices for Pro and Team, then set `STRIPE_PRICE_PRO` and
`STRIPE_PRICE_TEAM`. Add a webhook endpoint at `https://trusscoach.com/api/stripe/webhook`
subscribed to:

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Put the signing secret in `STRIPE_WEBHOOK_SECRET`.

## 6. Hosting

The app is a standard Next.js 16 App Router deployment and runs anywhere that supports it.
Vercel is the shortest path:

```bash
vercel link
vercel env add ...        # every variable from .env.example
vercel deploy --prod
```

Add `trusscoach.com` and `www.trusscoach.com` as domains and point DNS at the host.

Note that `/api/practice/score` and `/api/research` set `maxDuration` to 90 seconds. On a
platform with a shorter function timeout, either raise the limit or move those to a queue.

## 7. Post-deploy checks

- `https://trusscoach.com/` — landing page renders
- `https://trusscoach.com/setup` — every variable shows a checkmark
- Sign up, complete onboarding, and confirm you land on `/coach`
- Send one Coach message and confirm it streams
- Start a practice session and confirm the browser asks for the microphone
- Run one research lookup on a real address and confirm weather and storm data return
- Switch to Español and confirm the interface follows

## Cost notes

The variable costs, roughly in order:

1. **Realtime voice practice** — priced per minute of audio in and out. This is why
   `practice_seconds` is metered and why the free plan allows 20 minutes.
2. **Coach messages** — ordinary chat completions, cheap individually, metered per plan.
3. **Google Places** — per request, per field. The field mask keeps this small.
4. **Google Weather** — per request. Research results are cached in `area_research` so a
   repeated lookup of the same neighborhood does not re-bill.
5. **Embeddings** — one-time per document at ingestion, then effectively free to query.

NOAA data is free.
