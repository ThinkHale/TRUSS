# Architecture

## Guiding constraints

Four constraints drove nearly every decision:

1. **No Azure or Microsoft services.** Scout ran on Azure Static Web Apps, Azure Functions,
   Azure OpenAI, Azure Maps, and Bing Search. None of that survives. Google covers maps,
   places, and weather; OpenAI covers the models; Supabase covers data and auth.
2. **Two distribution models from one codebase.** A solo roofer on a subscription and an
   enterprise with a custom deployment run the same code. The difference is data: their
   plan, their settings, and their knowledge base.
3. **The users are not technical, and many read Spanish first.** This is a UI constraint
   and an i18n constraint, but it is also an architecture constraint — it is why voice
   practice has a degraded fallback path rather than an error state.
4. **The Coach is the product.** Research, Campaigns, and Accounts exist to feed it and to
   act on what it says.

## The methodology is the domain model

`src/lib/truss/methodology.ts` defines the five stages: purpose, objectives, coachable
behaviors, failure modes, example language, and the signals that a stage has landed.

Everything downstream is generated from it:

- `coachSystemPrompt()` embeds `methodologyBriefing()`
- `scoringRubric()` builds the scorecard criteria from each stage's `behaviors`
- The progress UI and stage chips read the same `STAGES` array

Adding a behavior to a stage changes what the Coach teaches and what the scorer grades, in
one edit. The methodology cannot drift from the software because it *is* the software.

## Request flow: TRUSS Coach

```
Browser  →  POST /api/coach/chat
              ├─ getSessionContext()      resolve user + org + role + plan + locale
              ├─ within_quota()           check before spending a token
              ├─ retrieveKnowledge()      embed the question, match this org's chunks
              ├─ coachSystemPrompt(ctx)   methodology + org context + guardrails
              ├─ OpenAI stream            NDJSON back to the browser
              └─ persist + record_usage   after the stream closes
```

NDJSON rather than SSE, for two reasons: the conversation id can be delivered before the
first token, and a connection dropped mid-answer leaves the partial answer on screen instead
of erasing it. That matters when reps are on job sites.

## Request flow: voice roleplay

```
Browser                          Server                        OpenAI
   │  POST /api/practice/session   │                              │
   │ ─────────────────────────────>│  create practice_sessions    │
   │                               │  mint ephemeral credential ─>│
   │ <─── clientSecret ────────────│                              │
   │                                                              │
   │  WebRTC offer/answer + audio  ──────────────────────────────>│
   │ <──────────── character audio + transcripts ─────────────────│
   │                                                              │
   │  POST /api/practice/turns  (batched every 5s)                │
   │  POST /api/practice/score  (on end)                          │
```

The standing OpenAI key never reaches the browser — only a credential that expires in about
a minute. The character's instructions are attached server-side, so a rep cannot edit the
prompt to make the homeowner easy.

**The fallback matters.** WebRTC will not hold on two bars of signal in a truck. When the
connection fails, `PracticeRoom` switches to hold-to-talk against `/api/practice/reply`,
which transcribes a recorded clip, generates the next line, and returns synthesized speech
in one round trip. The session and its transcript survive the transition, so the scorecard
is still produced.

## Tenant isolation

Isolation is enforced in Postgres, never in application code.

- Every table carries `org_id` and has RLS enabled.
- Policies call `is_org_member()` and `org_role_of()`, which are `SECURITY DEFINER` so a
  policy on `memberships` does not recurse through itself.
- `knowledge_chunks` denormalizes `org_id` from its parent document so vector retrieval can
  filter without a join, and `match_knowledge()` is `SECURITY INVOKER` so RLS still applies
  to it. Passing another tenant's org id returns zero rows.

This was verified against a real Postgres 16 with pgvector: two orgs, two reps. Each sees
only their own accounts and knowledge chunks, cross-tenant vector retrieval returns nothing
even when explicitly targeting the other org's id, and cross-tenant writes are rejected.

**Coach conversations are private to the rep, deliberately.** Managers can read practice
sessions and scorecards — training is meant to be coachable — but not the Coach chat. A rep
will not ask an honest question if their boss is reading it.

## Metering

AI is the dominant variable cost, so usage is metered per org per month.

`plan_entitlements` holds limits as data. `record_usage()` writes an event and rolls it into
the monthly counter atomically. `within_quota()` is checked *before* the model call, not
after. A null limit means unlimited, which is how Enterprise is expressed without a code
path of its own.

Closing an Enterprise deal with custom limits is an update to one row.

## Guardrails

`GUARDRAILS` in `src/lib/ai/prompts.ts` is appended *after* org-supplied context in every
prompt. A tenant's uploaded material is presented to the model as reference data, explicitly
not as instructions, and the rules that follow it override anything above.

The rules exist for a concrete reason: coaching a rep to absorb a homeowner's deductible is
insurance fraud in most states, and the scorer treats it as an automatic finding that caps
the Solve score and names the risk in plain language.

## What was carried over from Scout

Very little, and deliberately so.

Scout's structure — a tabbed research/routes/campaign/accounts SPA over IndexedDB with no
auth or multi-tenancy — could not support subscriptions, enterprise tenants, or a coach.
Its prompts were built around Employbridge staffing verticals and were discarded entirely.

What did carry over is shape rather than code: the idea of pre-call preparation became the
account brief, territory research became area research grounded in weather and storm data,
and the campaign generator became stage-anchored bilingual outreach.
