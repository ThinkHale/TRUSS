# Operating TRUSS

There is one deployment, not two. The operator console lives at `/admin` inside the same
Next.js app, behind a role that sits above org tenancy.

That is a deliberate choice over a separate admin application. A second app would need its own
deploy, its own session handling, and — the real problem — its own copy of the authorization
rules, which is exactly the thing you never want two of. Here the rules live in Postgres, and
both the product and the console read the same ones.

The console *looks* nothing like the product: navy, dense, desk-shaped. Someone acting on
another company's tenant should never be one glance away from thinking they are in their own
account.

## How authority works

An operator is a row in `platform_admins`. That row does not unlock anything by itself. What
it does is widen three functions that migration 0001 defined and that 35 of the schema's 36
RLS policies are written in terms of:

| Function | For an operator |
| --- | --- |
| `is_org_member(org)` | true for every org |
| `is_org_admin(org)` | true for every org |
| `org_role_of(org)` | `owner` for every org |

So an operator's reach comes *through* Row Level Security, not around it. This matters more
than it sounds:

**Coach conversations stay private, even from you.** The policy on `coach_conversations` is
`user_id = auth.uid()`. An operator is not the author of anyone's Coach conversation, so
widening `is_org_member` does not open Coach history. The promise ENTERPRISE.md makes to reps
— *your manager cannot read these* — holds for the operator too. The console shows message
counts and never message contents.

That guarantee has exactly one hole: `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS entirely. The
console therefore uses the caller's own Supabase client for everything. The service-role key
appears in three places in the whole codebase — the Stripe webhook, knowledge ingestion, and
creating auth users — and never for tenant data.

## Becoming the first operator

The console requires being an operator, so the first one cannot be created inside it. Set the
bootstrap variable:

```
PLATFORM_ADMIN_EMAILS=you@yourcompany.com,cofounder@yourcompany.com
```

Anyone listed is granted operator access on their next visit to `/admin`, and the grant is
written to the audit log. This is also the way back in if `platform_admins` is ever emptied.

It grants nothing that reading `SUPABASE_SERVICE_ROLE_KEY` out of the same environment would
not already grant, so it is not a new exposure. Everyone after the first is promoted from
**People** in the console. The database refuses to remove the last operator.

## The console

| Screen | What it is for |
| --- | --- |
| `/admin` | Tenant counts, billing that needs attention, configuration gaps |
| `/admin/orgs` | Every company, searchable, with plan and billing state |
| `/admin/orgs/[id]` | One tenant: plan, grants, people, company context, usage, history |
| `/admin/orgs/new` | Create a tenant outright — the Enterprise path |
| `/admin/users` | Every account; invite people; promote operators |
| `/admin/audit` | Everything done with platform authority |

## Billed plan versus granted access

These are two different columns and the distinction is the whole point.

**Billed plan** (`organizations.plan`) is what Stripe owns. Every webhook writes it. Setting it
by hand is for offline Enterprise contracts and for repairing drift — if the org has a live
subscription, the next Stripe event will overwrite whatever you typed. The console says so on
the form.

**Granted access** (`organizations.plan_override`) is what you own. Stripe never touches it. It
outranks the billed plan while it lasts, with an optional expiry and a reason.

`effective_plan(org)` picks the override when it is live and the billed plan otherwise, and
`within_quota()` reads `effective_plan`. Since Coach, practice, and research all gate on
`within_quota`, **one save reaches every quota at once** — there is no route to update and
nothing to redeploy.

> **Giving someone full access regardless of subscription:** open their company, set
> *Granted access* to Enterprise, leave *Until* blank, write a reason. Done. Enterprise
> entitlements are null in `plan_entitlements`, and null means unlimited.

The rep sees this stated plainly in their own Settings — the plan, that TRUSS granted it, when
it ends, and why. Nobody is surprised when it expires.

## Creating and customizing an Enterprise account

Everything is data. There is no per-customer fork.

**1. Create the tenant.** `/admin/orgs/new`. Name, plan `enterprise`, seat limit blank for
unlimited, and their context if you have it already. The org exists with nobody in it, which is
the point — their first rep signs in to a TRUSS that already knows their company.

**2. Give it their context.** On the company page, *Company context*:

- **Trades** — Roofing, Siding, Gutters
- **Service area** — Dallas TX, Fort Worth TX, Oklahoma City OK
- **Playbook rules** — the highest-leverage field by a wide margin

Playbook rules are the rules a rep is held to, and the Coach cites them by name:

```
Never quote a price at the door. Scope comes after the adjuster meeting.
Every contingency agreement must be countersigned by a manager.
We do not do cash jobs under $3,000.
```

All of it is injected into every Coach, research, and campaign prompt for that tenant only.

**3. Load their material.** Still `/api/knowledge/ingest` — playbooks, claims process, pricing
rules, warranty terms, transcripts of their best reps. See ENTERPRISE.md §3. Chunks carry
`org_id` and retrieval runs as the caller with RLS applied, so one tenant's playbook cannot
surface in another's Coach.

**4. Author their scenarios.** `custom_scenarios`, still SQL. See ENTERPRISE.md §4.

**5. Add their people.** On the company page. *Add existing account* works instantly for
somebody who has already signed up. *Invite by email* creates the account and mails them, which
needs SMTP configured in Supabase Auth — without it the action tells you it failed rather than
claiming a mail was sent.

Give the first person `owner`. The database will not let you remove the last owner of an org.

**6. Brand it.** `brand_name`, `brand_logo_url`, `brand_color` on the same form, for a
white-labeled deployment.

## What is written down

Every operator mutation runs through a `SECURITY DEFINER` function that checks authority and
writes an `admin_audit_log` row **in the same transaction**. A change cannot happen without its
audit row, because they commit together. Authority is checked in the database rather than in the
route handler, so a bug in the application cannot skip it.

Actions recorded: `org.create`, `org.set_plan`, `org.set_override`, `org.clear_override`,
`member.add`, `member.set_role`, `member.remove`, `platform_admin.grant`,
`platform_admin.revoke`, `platform_admin.bootstrap`.

## Org roles, unchanged

Platform operator is a separate axis from the four org roles, which mean what they always did:

| Role | Can |
| --- | --- |
| `owner` | Everything, including billing |
| `admin` | Manage members, settings, and knowledge |
| `manager` | Curate knowledge, author scenarios, review rep scorecards |
| `rep` | Coach, practice, research, campaigns, accounts |

Only `owner` and `admin` can reach Checkout or the billing portal.
