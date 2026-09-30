# Security and compliance readiness

The public summary is `/security`. This is the working document behind it: what is in place, where it is
enforced, and what remains before an enterprise security review or a SOC 2 examination. Nothing here is
a certification. TRUSS holds no SOC 2 report today.

## In place

| Control | Enforced in | Verified by |
| --- | --- | --- |
| Tenant isolation | RLS on every tenant table (`supabase/migrations`) | `tests/db/migrations.test.ts`, run in CI against PGlite |
| Coach privacy from managers, portfolios, and operators | `coach_conversations_own` (0002); no other read policy | `tests/db` |
| Least privilege for writes that decide pay or scores | Column grants and revoked writes (0016, 0019, 0020, 0022) | `tests/db` |
| Authority checked in the database | `SECURITY DEFINER` functions check role first (0008, 0017–0024) | `tests/db` |
| Audit trail in the same transaction as the change | `admin_audit_log` (0008), `org_audit_log` (0017) | `tests/db` |
| Tenant-visible audit log, including operator actions | `org_audit_feed()` (0017), **Team → Audit log** | — |
| SSO (SAML) with per-domain enforcement | Supabase Auth SAML; `sso_required_for()`, `ssoStatus()` | Manual — needs an IdP to test |
| Self-service provisioning and deprovisioning | `org_invite`, `org_set_member`, `org_remove_member` (0021) | `tests/db` |
| Data export (company and personal) | `/api/export` | Smoke-tested |
| Secrets never reach the browser | Service-role key server-only; ephemeral Realtime credentials | Code review |
| Integration credentials stored as hashes | `integration_endpoints.token_hash` (0022) | `tests/db` |
| Consent-gated recordings, audio not retained | `/api/field-review` deletes in `finally`; attestation stored | Code review |
| Metering cannot be forged or reversed | `record_usage` / `record_tokens` guards (0014, 0024) | `tests/db` |
| CI on every change | `.github/workflows/ci.yml` | — |

## SOC 2 Type I — what is left

SOC 2 examines whether controls are designed and in place (Type I) and then whether they operated over
a period (Type II, typically 3–12 months). The product controls above are most of the technical work.
What remains is mostly organizational, and cannot be done in code:

1. **Pick an auditor and a compliance platform** (Vanta, Drata, Secureframe, or similar). The platform
   collects evidence from GitHub, Vercel, Supabase, and the identity provider, and gives the policy
   templates below.
2. **Policies, adopted and signed:** information security, access control, change management, incident
   response, vendor management, data retention and deletion, business continuity, acceptable use.
3. **Access reviews** for GitHub, Vercel, Supabase, OpenAI, Stripe, Google Cloud — quarterly, recorded.
   Enforce MFA on all of them.
4. **Change management evidence:** protect the main branch, require a pull request with CI passing and a
   review before merge. CI exists; branch protection is a GitHub setting to turn on.
5. **Vendor review** of each subprocessor's own SOC 2 report (Supabase, Vercel, OpenAI, Stripe, and
   Google all publish one).
6. **Backups and restore test.** Supabase Pro includes daily backups; enable point-in-time recovery and
   run and record one restore.
7. **Monitoring and alerting.** Error tracking and uptime monitoring on the production deployment, with
   an on-call owner. Not yet in place.
8. **Security awareness training and background checks** for everyone with production access.
9. **Penetration test** by a third party before the first enterprise contract; many buyers ask for one
   independent of SOC 2.

## Documents enterprise buyers ask for

Each needs counsel's review before it is signed — these are not drafted here on purpose, because a
security or legal commitment that has not been reviewed is a liability rather than an asset.

- **Data processing agreement.** Use the customer's, or a standard DPA from counsel. The facts it needs
  are all in `/security` and the privacy policy: subprocessors, US processing, deletion on termination,
  breach notification window, audit rights.
- **Service-level agreement.** Base it on what the stack can actually honor: Vercel and Supabase publish
  their own SLAs, and TRUSS's cannot exceed theirs. Monitoring (item 7) has to exist first.
- **Security questionnaire answers** (SIG Lite or CAIQ). Most answers map directly to the table above.
- **Vulnerability disclosure.** `/security` names security@trusscoach.com; that mailbox has to exist and
  be watched.

## Open technical items

- The outcomes webhook has no rate limit beyond its per-delivery cap. Add an edge rule.
- There is no automated deletion of accounts inactive past a retention period; deletion is on request.
- Field-review uploads not submitted within an hour are removed on that user's next upload, not on a
  schedule. A daily sweep would close the gap for someone who never returns.
- SSO enforcement reads the `amr` claim Supabase puts in the access token. Confirm the SAML method name
  against a real identity provider before a customer depends on "SSO required".
