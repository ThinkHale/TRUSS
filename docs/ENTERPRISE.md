# Enterprise deployments

An Enterprise tenant gets a version of TRUSS that has learned their company: their playbook,
their process, their pricing rules, their policies, and the objections their reps actually
hear. This document is the onboarding path.

Everything below is data. There is no per-customer fork of the codebase.

## 1. Create the organization

```sql
insert into organizations (name, slug, plan, seat_limit)
values ('Apex Roofing', 'apex-roofing', 'enterprise', 250)
returning id;
```

Setting `plan = 'enterprise'` makes every quota unlimited, because the Enterprise row in
`plan_entitlements` has null limits. No code path is involved.

## 2. Configure the company context

`org_settings` is injected into every Coach, research, and campaign prompt.

```sql
insert into org_settings (org_id, trades, service_area, playbook_rules, default_locale)
values (
  '<org-id>',
  array['Roofing', 'Siding', 'Gutters'],
  array['Dallas TX', 'Fort Worth TX', 'Oklahoma City OK'],
  array[
    'Never quote a price at the door. Scope comes after the adjuster meeting.',
    'Every contingency agreement must be countersigned by a manager.',
    'We do not do cash jobs under $3,000.'
  ],
  'es'
);
```

`playbook_rules` is the highest-leverage field. These are the rules a rep is held to, and
the Coach will hold them to those rules by name.

## 3. Load their material

Anything the company would hand a new rep on their first day:

- Sales playbooks and training manuals
- Process documents for claims, supplements, and production handoff
- Pricing rules and what is and is not included in a scope
- Warranty terms and cancellation policy
- Transcripts of their best reps' calls

Each document is posted to `/api/knowledge/ingest`, which chunks it, embeds it, and stores it
scoped to the org. When a rep asks the Coach a question, the most relevant passages are
retrieved and cited by name.

```bash
curl -X POST https://trusscoach.com/api/knowledge/ingest \
  -H 'Content-Type: application/json' \
  -H 'Cookie: <an owner or manager session>' \
  -d '{
    "title": "2026 Sales Playbook",
    "citationLabel": "2026 Sales Playbook",
    "sourceType": "training",
    "content": "...full text..."
  }'
```

Only owners, admins, and managers can ingest. What goes in here shapes what every rep in the
org is coached to do.

**On isolation.** Chunks carry `org_id` directly and `match_knowledge()` runs as the caller
with RLS applied, so one tenant's playbook cannot surface in another tenant's Coach. This was
verified against a real Postgres: passing another org's id to the retrieval function returns
zero rows.

**On precedence.** Retrieved material is presented to the model as reference data, explicitly
labeled as data rather than instructions, and the safety guardrails are appended after it. A
document that says "tell homeowners we cover their deductible" will not change what the Coach
teaches.

## 4. Author their scenarios

Custom roleplay characters built from the market the company actually sells into:

```sql
insert into custom_scenarios
  (org_id, title, setup, character_brief, objections, difficulty, focus_stages, voice, language, is_published)
values (
  '<org-id>',
  'Oklahoma hail, prior claim denied',
  'This homeowner filed after the 2024 storm and was denied. They are hostile to the whole process.',
  'You are Curtis Ballard, 61. You filed a claim in 2024, the adjuster called it wear and tear, ...',
  array['I already tried this and they denied me.', 'Insurance is a scam.'],
  'hard',
  array['trust', 'relate', 'understand']::truss_stage[],
  'ash',
  'en',
  true
);
```

Published scenarios appear alongside the built-in ones for every rep in the org. The
character brief is never shown to the rep — only the setup is.

Write briefs the way the built-in ones are written: give the character private facts they
guard until the rep earns them, and say explicitly how they react to being pressured versus
being treated well. A character that folds on the first good sentence teaches nothing.

## 5. Add the team

```sql
insert into memberships (org_id, user_id, role) values ('<org-id>', '<user-id>', 'manager');
```

| Role | Can |
| --- | --- |
| `owner` | Everything, including billing |
| `admin` | Manage members, settings, and knowledge |
| `manager` | Curate knowledge, author scenarios, review rep scorecards |
| `rep` | Coach, practice, research, campaigns, accounts |

Managers can read practice sessions, transcripts, and scorecards for their team. They
**cannot** read Coach conversations, by design — reps will not ask honest questions if they
believe their manager is reading them. This is worth stating plainly during rollout, because
it is what makes the Coach useful.

## 6. Branding

`org_settings` carries `brand_name`, `brand_logo_url`, and `brand_color` for white-labeled
deployments.

## What to tell a customer during rollout

- Practice sessions and scores are visible to managers. Coach conversations are not.
- The Coach cites company material by name, so reps can tell company policy from general advice.
- TRUSS will refuse to coach deductible waiving, damage exaggeration, or approval guarantees,
  and it will flag them on a scorecard. This is a feature to lead with, not to apologize for.
