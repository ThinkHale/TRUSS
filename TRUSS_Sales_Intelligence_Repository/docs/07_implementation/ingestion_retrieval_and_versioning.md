# Ingestion, Retrieval, and Versioning

## Architecture decision

Use retrieval for changing facts and domain knowledge. Keep product behavior in versioned application instructions. Use structured datasets for scenarios, metrics, and evaluation. Consider model customization only after prompts and retrieval are measured.

OpenAI's accuracy guidance distinguishes context problems from behavior problems. Retrieval supplies proprietary, specialized, or changing knowledge. Prompting and, where available, model customization address inconsistent behavior. The guidance recommends beginning with prompts and evals, then adding the right optimization lever.[^S040]

OpenAI's file search tool uses vector stores and semantic plus keyword retrieval with the Responses API.[^S041] Current prompt guidance recommends keeping production prompts in code with typed inputs, code review, tests, and staged deployment.[^S042]

## Repository layers

| Layer | Content | Runtime use |
| --- | --- | --- |
| Instructions | Mode contracts, routing, response rules, guardrails | Stable developer instructions selected by mode |
| Doctrine | Method, residential and commercial processes, trade packs | Retrieval context |
| Structured records | Knowledge units, objections, scenarios, metrics, campaign patterns | Filtered retrieval and application UI |
| Account data | Customer-authorized CRM, proposals, products, policies, performance | Tenant-isolated retrieval and tools |
| Evals | Representative inputs, expected behaviors, prohibited failures | Release gate |

## Knowledge-unit design

Each unit should be independently useful and contain:

- stable ID and version
- title and concise content
- TRUSS beam
- mode
- trade and sales-motion tags
- buyer, stage, and jurisdiction tags
- claim type and evidence grade
- source IDs
- applicability and exceptions
- prohibited behavior where relevant
- review date

Do not chunk solely by token count. Preserve a complete rule, method, metric definition, or scenario concept. Split long prose at semantic boundaries and repeat minimal context such as trade, motion, and beam in metadata.

## Retrieval order

1. Select mode instructions.
2. Classify primary and secondary sales motion.
3. Retrieve mandatory guardrails for the trade, channel, and jurisdiction.
4. Retrieve method units for the relevant beam and stage.
5. Retrieve trade and buyer-specific units.
6. Retrieve company-specific material, respecting tenant boundaries.
7. Retrieve examples or scenarios only if they add value.
8. Limit noise and retain source IDs for traceability.

## Precedence

1. Law, regulation, and approved company safety or legal policy
2. Current verified technical standards and company capability
3. Customer-specific facts and contract terms
4. TRUSS doctrine
5. Matched benchmark or research
6. Practitioner guidance

When two items at the same level conflict, prefer the more specific and recently reviewed item, then expose the uncertainty.

## Suggested metadata filters

```json
{
  "mode": "coach",
  "primary_motion": "planned_replacement",
  "trade": "hvac",
  "buyer_type": "homeowner",
  "stage": "proposal",
  "channel": "field_visit",
  "jurisdiction_country": "US",
  "jurisdiction_state": "IL",
  "company_id": "tenant_specific",
  "evidence_minimum": "B"
}
```

## Response trace

For internal observability, store:

- prompt and repository version
- classification and confidence
- retrieved knowledge-unit IDs
- source IDs used for material factual claims
- output and user action
- grader results
- human correction
- downstream outcome where lawful and useful

Do not expose private chain-of-thought. Store concise decision labels, evidence, and correction notes.

## Update workflow

1. Add or revise the source record.
2. Update affected knowledge units and `reviewed_at`.
3. Add a changelog entry.
4. Run schema and cross-reference validation.
5. Run affected eval slices and full critical-safety suite.
6. Review regressions.
7. Deploy through staged release.
8. Monitor real failures and convert approved examples into new evals.

## Fine-tuning note

As of September 2026, OpenAI's official documentation says its supervised fine-tuning platform is winding down for new users.[^S043] TRUSS should therefore avoid making fine-tuning a dependency. The repository is designed to work with versioned prompts, retrieval, structured outputs, and evals. If another supported customization path is used later, train on representative input-output behavior, keep changing knowledge in retrieval, and maintain a holdout set.

## Upload sets

Recommended vector-store split:

- `truss_core`: method, router, doctrine, objections, guardrails
- `truss_residential_trades`: HVAC, plumbing, electrical, roofing, remodeling, recurring services
- `truss_commercial`: account development, pursuits, commercial specialty contracting
- `truss_market`: research method, source registry, market datasets
- `tenant_<id>`: approved company products, pricing rules, policies, scripts, cases, and performance definitions

Keep tenant content physically and logically isolated. Never retrieve one customer's private material for another.
