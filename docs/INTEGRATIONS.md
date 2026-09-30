# Connecting a CRM

TRUSS measures whether training shows up in results by setting each rep's practice against the deals
they win and lose. Those outcomes come from the company's system of record — not from reps typing them
twice. There are three ways in, all ending in the same place: `accounts.status`, `contract_value_cents`,
`signed_at`, and `lost_at` (migration 0017), credited to the rep through `owner_user_id`.

| Way in | Who sets it up | Best for |
| --- | --- | --- |
| Webhook | Owner or admin, on **Team → Outcomes** | Live updates from a CRM that can send one, directly or via Zapier/Make |
| CSV import | Any manager, on **Team → Outcomes** | A CRM that only exports, or backfilling history |
| By hand | Any rep, on the account | Small teams with no CRM |

## The webhook

Create a connection on **Team → Outcomes → Connect your CRM**. The token (`trs_` + 48 hex characters) is
shown once; TRUSS stores only its SHA-256 hash. Revoke it there at any time.

```
POST https://trusscoach.com/api/integrations/outcomes
Authorization: Bearer trs_…
Content-Type: application/json
```

The body is one record, an array of records, or `{ "source": "jobnimbus", "records": [ … ] }`. At most
500 records and 1 MB per delivery.

| Field | Required | Notes |
| --- | --- | --- |
| `external_id` | yes | The job or deal id in the CRM. Re-sending the same id updates the same account. |
| `name` | for new jobs | Customer or job name. |
| `status` | no | Free text. `Sold`, `Closed Won`, `Contract Signed` → signed; `Lost`, `Cancelled`, `Not sold` → lost; `Complete`, `Paid` → complete; `In Production`, `Scheduled` → in production; `Estimate`, `Appointment` → inspected. Unrecognized values are reported back and ignored. |
| `contract_value` | no | `18450`, `"$18,450.00"`. |
| `signed_at`, `lost_at` | no | `2026-09-14`, an ISO timestamp, or `9/14/2026`. Other formats are refused rather than guessed. When absent, TRUSS stamps the date the status changed. |
| `rep_email` | no | Credits the rep with that address **in this company**. Unknown addresses are listed back in `unmatched_rep_emails`. |
| `address`, `city`, `state`, `postal_code`, `lost_reason`, `lead_source`, `type` | no | `type` is `residential` or `commercial`. |
| `source` | no | Names the CRM (`jobnimbus`). Defaults to the connection's provider. |

Blank fields never overwrite what is already on an account, so a status-only update does not erase the
address a rep entered.

The response lists what happened to each record — `created`, `updated`, `unchanged`, or `rejected` with a
reason — and every record is also logged on the Outcomes page under **Recent deliveries**.

```json
{ "created": 1, "updated": 0, "unchanged": 0, "rejected": 0,
  "results": [{ "externalId": "J-1042", "result": "created" }],
  "warnings": [], "unmatched_rep_emails": [] }
```

## Recipes

Every CRM below can trigger on a job or deal changing stage. The action is the same in each: a webhook
POST with the fields above. Field names in the CRM vary by account configuration — map what the company
actually uses.

**Zapier (works for JobNimbus, HubSpot, Salesforce, and most others).** Trigger: the CRM's "job/deal
status changed" or "updated" event, filtered to the statuses that matter. Action: *Webhooks by Zapier →
POST*, payload type JSON, URL as above, header `Authorization: Bearer trs_…`, data mapping `external_id`,
`name`, `status`, `contract_value`, `signed_at`, `rep_email`.

**Make.** Trigger module for the CRM's watch-updated event → *HTTP → Make a request*, method POST, body
type raw JSON, same header and fields.

**CRMs with native outbound webhooks.** Point the webhook at the URL above if the CRM lets you set an
`Authorization` header and shape the JSON body. If it sends a fixed payload you cannot shape, route it
through Zapier or Make to map the fields.

## CSV import

Export jobs or deals as CSV (or tab-separated). On **Team → Outcomes → Import a spreadsheet**, TRUSS
guesses which column feeds which field from common CRM header names and shows the first rows; correct
anything it got wrong, then import. The job id column is required — it is how re-imports update instead
of duplicate. Name the source (`jobnimbus`), and use the same name each time.

## What is not built

Native, OAuth-connected integrations with individual CRMs — where TRUSS calls the CRM's API itself — do
not exist. Each needs that vendor's API access or partner program. The webhook covers the same data for
every CRM that can send one, which is why it came first. Add a native connector when a customer's volume
or security policy calls for it, starting with whichever CRM the first portfolio customer runs.

There is no request rate limit on the webhook beyond the 500-record, 1 MB delivery cap. Add one at the
edge (Vercel firewall rules) before a customer's CRM is pointed at production.
