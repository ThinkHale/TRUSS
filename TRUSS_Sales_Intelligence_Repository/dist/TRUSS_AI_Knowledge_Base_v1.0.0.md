# TRUSS AI Sales Knowledge Base

Version 1.0.0 | 2026-09-09

This bundle is the single-file companion to the structured repository. Use the repository JSONL and CSV assets for filtered retrieval, simulations, analytics, and evaluations.


---

<!-- SOURCE FILE: README.md -->


# TRUSS Sales Intelligence Repository

Version 1.0.0

This repository is the initial operating knowledge system for TRUSS, an AI sales intelligence, training, and performance platform for the trades. It converts sales research, trade context, performance measurement, and practitioner knowledge into source-tagged material for five product modes:

1. Coach
2. Practice
3. Campaign Creation
4. Account Review
5. Market Research

TRUSS is built around five behaviors:

| Beam | Operating principle |
| --- | --- |
| Trust | Earn credibility before asking for commitment. |
| Relate | Understand the person, context, priorities, and stakes. |
| Understand | Diagnose the real need through disciplined discovery. |
| Solve | Connect the right solution to what the customer actually values. |
| Secure | Create clarity, resolve uncertainty, and confidently establish the next commitment. |

## Start here

- `docs/01_method/truss_method.md`: authoritative method definition and scoring anchors
- `docs/01_method/context_router.md`: sales-motion classification before coaching
- `docs/03_modes/`: operating contracts for each TRUSS mode
- `docs/04_trades/`: trade-specific discovery, proof, objection, and risk guidance
- `docs/05_metrics/`: metric dictionary and coaching scorecards
- `docs/06_training/`: eight-week training and field-practice system
- `docs/07_implementation/`: retrieval, prompting, versioning, and evaluation design
- `docs/08_research/master_synthesis.md`: detailed research synthesis with citations
- `data/`: machine-readable knowledge units, source records, metrics, scenarios, objections, campaign patterns, and evals
- `schemas/`: JSON Schemas for structured records
- `scripts/validate_repository.py`: integrity checker

## Core product rule

TRUSS must classify the sales motion before it recommends language, benchmarks performance, or scores behavior. An emergency service visit, planned replacement, technician recommendation, remodeling project, canvassing interaction, commercial service account, and commercial project pursuit are different selling environments.

## Evidence labels

- `A`: law, government guidance, standards, original data, or peer-reviewed research
- `B`: transparent industry or platform research with a defined population
- `C`: established practitioner method, book, podcast, course, or roleplay
- `D`: anecdote, promotional claim, or unverified opinion

Facts and numeric benchmarks require A or B evidence. C sources may inform language, drills, and hypotheses. D sources may identify questions, but they do not become doctrine without validation.

## Recommended deployment

Use the repository in four layers:

1. Keep behavioral rules and mode contracts in versioned application instructions.
2. Load doctrine and trade packs into retrieval.
3. Use the JSONL files as structured retrieval records and application fixtures.
4. Run the eval set before releasing a prompt, retrieval, scoring, or model change.

Changing facts belong in retrieval, not in a model's learned memory. Fine-tuning, where available, should be considered only after strong prompts, representative evals, and production examples exist.

## Non-negotiable guardrails

- Never invent hazards, diagnoses, code requirements, insurance outcomes, savings, scarcity, or competitor deficiencies.
- Never hide total price, material exclusions, financing terms, recurring obligations, or cancellation rights.
- Never score close rate alone. Include margin, cancellations, callbacks, complaints, financing fallout, and handoff quality.
- Never use a benchmark without its population, period, source, and comparability warning.
- Never treat public sales advice as technical, legal, financial, or safety authority.
- Route jurisdiction-specific questions to verified local requirements or qualified review.

## Status

Version 1.0 establishes the shared methodology, operating modes, priority trade packs, metrics, scenario library, source registry, and initial evaluation set. The next maturity step is permissioned customer call data linked to outcomes, segmented by trade, motion, lead source, ticket type, geography, season, and seller tenure.



---

<!-- SOURCE FILE: docs/00_governance/evidence_rights_and_maintenance.md -->


# Evidence, Rights, and Maintenance

## Purpose

TRUSS should be opinionated about selling behavior while remaining honest about evidence. The system must distinguish a legal requirement, a technical standard, an observed platform benchmark, an academic finding, and a practitioner's preferred method.

## Evidence hierarchy

| Grade | Suitable sources | Permitted use |
| --- | --- | --- |
| A | Statutes, regulators, government datasets, standards bodies, original datasets, peer-reviewed research | Facts, safety, compliance, durable principles, market inputs |
| B | Transparent surveys, platform datasets, trade-association research | Benchmarks with population and caveats, buyer behavior, operating patterns |
| C | Books, podcasts, videos, courses, consultants, operator interviews | Language, examples, drills, hypotheses, roleplay realism |
| D | Anonymous posts, isolated anecdotes, promotional claims without methods | Discovery queue only |

## Rights policy

The repository stores original summaries and structured doctrine, not copied books, course materials, paywalled articles, or podcast transcripts. A source record must identify rights status as one of:

- `public`: public government or freely reusable material, subject to any stated terms
- `public_summary`: public page summarized in original language
- `metadata_only`: title, creator, URL, date, and original TRUSS notes only
- `licensed`: written ingestion rights are on file
- `internal_permissioned`: owned or lawfully provided company material with defined access
- `unknown`: do not ingest until resolved

## Claim types

Every material knowledge unit should be labeled:

- `fact`: directly supported and scoped to the source
- `inference`: a reasoned application of supported facts
- `recommendation`: TRUSS doctrine or workflow choice
- `practitioner_guidance`: a technique attributed to a practice source
- `benchmark`: numeric comparison with population and period
- `compliance`: a rule or regulator guidance that requires review dates

## Benchmark rule

No benchmark is a target by default. A number becomes a coaching target only after checking:

1. Same sales motion
2. Comparable lead source
3. Comparable service mix and ticket size
4. Similar geography and season
5. Similar seller role and tenure
6. Same metric definition and denominator
7. Sufficient sample size
8. Acceptable quality outcomes

## Freshness policy

| Content | Review cadence |
| --- | --- |
| Federal or state law, regulation, regulator guidance | At least quarterly and before jurisdiction-specific release |
| Current market statistics and benchmarks | Quarterly or when the source updates |
| Trade technical references | Annually or after a standard change |
| Practitioner methods | Every two years or when a source materially changes |
| TRUSS prompts and scoring rules | Each release, with eval regression testing |

## Conflict resolution

When sources disagree, TRUSS should not average incompatible numbers. It should explain the different populations, definitions, dates, and incentives. Official or independent evidence governs facts. Practitioner material can still provide a useful drill without becoming a universal claim.

## Privacy and recordings

Permissioned sales recordings are the highest-value future data source, but they require a documented lawful basis, access controls, retention rules, redaction, and jurisdiction review. Training simulations do not create permission to record customers, employees, or bystanders.



---

<!-- SOURCE FILE: docs/01_method/truss_method.md -->


# The TRUSS Method

TRUSS is a decision-quality framework, not a memorized script. The five beams are sequential enough to guide a conversation and flexible enough to revisit when new information appears.

## T: Trust

Earn credibility before asking for commitment.

Observable behaviors:

- Respond promptly and through the buyer's preferred channel.
- Set accurate expectations about arrival, process, fees, timing, and next steps.
- Identify yourself and your role clearly.
- Respect the home, workplace, time, and privacy of the buyer.
- Separate verified facts, reasonable inferences, and unknowns.
- Use proof that matches the claim: measurements for diagnosis, credentials for capability, written scope for commitments, and references for execution history.
- Admit limits and correct mistakes.

Trust failures include false urgency, unsupported safety claims, hidden exclusions, manufactured social proof, disparaging competitors, and promises operations cannot fulfill.

## R: Relate

Understand the person, context, priorities, and stakes.

Observable behaviors:

- Recognize the buyer's emotional state without exploiting it.
- Adapt pace and depth to urgency, expertise, role, and decision complexity.
- Connect naturally without fake familiarity.
- Identify what the buyer is trying to protect or improve: comfort, uptime, schedule, cash flow, appearance, safety, convenience, tenants, family, or reputation.
- Use the buyer's language in summaries and recommendations.

Relate is not small talk volume. It is relevance and human calibration.

## U: Understand

Diagnose the real need through disciplined discovery.

TRUSS discovery covers six question families:

| Family | Purpose | Example |
| --- | --- | --- |
| Situation | Establish only relevant facts | What changed, and when did you first notice it? |
| Problem | Expose dissatisfaction or risk | Where is this causing the most disruption? |
| Implication | Clarify consequence without inflating fear | If this continues through next week, what happens? |
| Need and outcome | Define success | What would a good result look like six months from now? |
| Decision | Understand how commitment will happen | Who else needs to be comfortable with the plan? |
| Constraint | Surface real boundaries | Is timing, disruption, upfront cost, or monthly cash flow the biggest constraint? |

Strong discovery is conversational. It does not front-load a checklist, ask obvious questions already answered, or use questions to manipulate the buyer toward the highest price.

Before solving, the seller should be able to summarize:

1. What is verified
2. What remains unknown
3. The buyer's priority
4. The consequence of inaction, stated proportionately
5. The decision path and constraints

## S: Solve

Connect the right solution to what the customer actually values.

Observable behaviors:

- Recommend only technically viable, safe, legal, and deliverable work.
- Tie scope to stated outcomes and risks in plain language.
- Present genuinely different options when appropriate.
- Explain what each option solves, does not solve, costs, requires, and leaves as residual risk.
- Recommend one path and explain why it best fits the buyer's priorities.
- Make assumptions and dependencies visible.
- Confirm operations, schedule, labor, material, permitting, and financing feasibility before promising.

A premium option is not automatically the best solution. A repair should not be represented as equal to replacement, and replacement should not be pushed when a safe, reasonable repair fits the buyer's stated goal.

## S: Secure

Create clarity, resolve uncertainty, and confidently establish the next commitment.

Observable behaviors:

- Ask directly for the appropriate next step.
- Treat objections as uncertainty, constraint, or refusal to diagnose, not as combat.
- Confirm scope, price, terms, exclusions, decision makers, timing, and responsibilities.
- Document promises and handoff details.
- If the buyer is not ready, agree on a specific, useful follow-up.
- Respect a clear no and preserve the relationship.

The commitment may be an appointment, inspection, stakeholder meeting, site walk, proposal review, signed work order, pilot, service agreement, bid decision, or deliberate no-go. Secure does not always mean closing revenue on the current interaction.

## Beam scoring

| Beam | Weight | Strong performance |
| --- | ---: | --- |
| Trust | 20 | Accurate expectations, evidence, professionalism, permission, and integrity |
| Relate | 15 | Relevant human connection and adaptation to buyer context |
| Understand | 25 | Complete, proportionate discovery and accurate summary |
| Solve | 25 | Viable fit, value translation, clear options, and executable recommendation |
| Secure | 15 | Objection diagnosis, decision clarity, next step, documentation, and handoff |

Score each beam from 0 to 4. Weighted score equals `sum(beam_score / 4 * beam_weight)`.

Critical violations override the numeric score. Examples include invented hazards, discriminatory conduct, concealed financing cost, knowingly false insurance or code claims, unauthorized work, fabricated evidence, and commitments the seller knows cannot be delivered.

## Coaching priority

Coach the earliest weak beam that caused downstream failure. If the recommendation missed because discovery was incomplete, coach Understand before Solve. If the buyer would not share information because expectations were unclear, coach Trust before discovery technique.



---

<!-- SOURCE FILE: docs/01_method/context_router.md -->


# Sales Context Router

TRUSS routes by sales motion first, then trade, buyer type, funnel stage, jurisdiction, and channel.

## Primary motions

| Motion | Buyer state | Primary job | Common failure | Coaching emphasis |
| --- | --- | --- | --- | --- |
| Urgent residential service | Stressed and time-sensitive | Restore function and confidence | Fear-based pressure or premature replacement | Calm triage, evidence, immediate and durable paths |
| Planned replacement | Comparing systems and providers | Choose a long-term solution | Commodity quoting or technical overload | Outcome discovery, design proof, option clarity |
| Remodeling or planned project | High involvement and uncertain scope | Select a trustworthy execution partner | Scope ambiguity and timeline anxiety | Vision, process, allowances, milestones, change control |
| Technician-led recommendation | Expected service, not a pitch | Identify adjacent needs responsibly | Trust abuse and unnecessary work | Permission, evidence, proportional consequence, optionality |
| Canvassing or storm response | Low initial intent or event-triggered demand | Earn permission for a valid next step | Misrepresentation, pressure, insurance overclaim | Identity, consent, inspection facts, compliant follow-up |
| Commercial service account | Multi-person recurring need | Reduce operational and lifecycle risk | Selling only price or relying on one contact | Account research, stakeholders, service levels, renewal value |
| Commercial project pursuit | Formal or negotiated project | Win executable, profitable work | Bad-fit pursuit and estimating disconnect | Early positioning, go or no-go, risk, differentiation, handoff |

## Routing inputs

Required:

- `buyer_type`: homeowner, landlord, property manager, facility leader, general contractor, owner, developer, public agency, other
- `trade`
- `trigger`: failure, maintenance, replacement, project, storm, outbound prospecting, renewal, bid invitation
- `urgency`: emergency, near-term, planned, exploratory
- `channel`: inbound call, field visit, virtual meeting, door, email, phone, text, proposal, bid
- `stage`: lead, contact, appointment, discovery, inspection, proposal, decision, follow-up, won, lost, renewal
- `jurisdiction`: country, state, and locality when legal or code claims may arise

Optional but valuable:

- lead source
- ticket or project range
- decision complexity
- known stakeholders
- property or asset facts
- current provider
- financing or procurement context
- customer sentiment

## Decision rules

1. A reported outage, active leak, loss of heat or cooling, electrical symptom, lockout, or security failure routes to urgent service until safe triage is complete.
2. A replacement discussion following verified inspection remains planned replacement even if the initial appointment began as service.
3. Any additional recommendation introduced by a technician during unrelated work is technician-led and requires permission.
4. Door contact after a storm is canvassing or storm response even if damage may be real.
5. A recurring maintenance agreement for a business is commercial service, not a commercial project.
6. A plan-and-spec bid, negotiated construction project, or subcontract opportunity is commercial project pursuit.
7. Mixed cases keep a primary and secondary motion. Coach the primary buyer task and apply the stricter guardrail.

## Confidence behavior

If confidence is below 0.75, TRUSS should ask one or two routing questions before coaching. If ambiguity does not materially change the advice, it may proceed while naming the assumption.

## Harmful-mode errors

- Using canvassing urgency tactics on an inbound service customer
- Coaching a technician to close an unrequested major replacement without evidence
- Treating a commercial buying committee like a single homeowner
- Applying long-form commercial discovery targets to a five-minute dispatch call
- Using residential good-better-best language for an incomplete plan-and-spec bid
- Scoring an emergency stabilization call against replacement close rate



---

<!-- SOURCE FILE: docs/02_doctrine/residential_sales.md -->


# Residential Sales Doctrine

Residential trades sales is risk reduction under uneven technical knowledge. The homeowner is deciding whether the work is sound and whether the person and company can be trusted in the home.

## End-to-end process

### 1. Prepare

Review the lead source, stated problem, prior service history, equipment or property facts, promised arrival window, known decision makers, and any open complaint. Do not form a diagnosis from the booking note.

### 2. Set the first impression

Confirm identity, protect the home, restate the reason for the visit, disclose any diagnostic fee, explain the visit flow, and ask permission to begin. Match pace to the customer's urgency.

### 3. Discover

Learn the symptom, history, prior attempts, disruption, desired outcome, time horizon, decision path, and meaningful constraints. Ask only questions that change diagnosis, recommendation, or implementation.

### 4. Inspect and document

Gather appropriate measurements, images, equipment information, observations, and safety facts. Separate:

- observed fact
- measured fact
- professional inference
- customer report
- unknown requiring further testing

### 5. Confirm understanding

Summarize the condition and the customer's priorities in plain language. Ask for correction. Do not present a solution until both parties agree on the problem being solved.

### 6. Build options

Use multiple options only when each is safe, viable, and materially different. Differences may include scope, lifespan, performance, risk transferred, warranty, convenience, disruption, or timing. State exclusions and residual risk.

### 7. Present and recommend

Lead with the path best aligned to the buyer's stated priorities. Explain why. Use technical detail only as proof or decision support. Show full price and disclose financing terms. Monthly payment is context, not a substitute for total cost.

### 8. Check and secure

Ask what feels unresolved. Clarify the real barrier before responding. Then ask for a direct next step. A respectful pause, joint review with another decision maker, or scheduled follow-up can be a valid outcome.

### 9. Document and hand off

Record selected scope, exclusions, pricing, payment terms, permits, cancellation rights, dates, access needs, customer priorities, and every promise. Operations should not have to reinterpret the sale.

### 10. Follow through

Confirm scheduling, communicate changes, deliver progress updates, review completed work, and invite feedback at an appropriate moment. Lost proposals receive value-adding follow-up, not repetitive pressure.

## Trust evidence

Proof must match the risk:

| Buyer uncertainty | Useful proof |
| --- | --- |
| Is the diagnosis real? | Readings, images, test results, location-specific observations |
| Is this the correct design? | Measurements, calculations, product match, site constraints |
| Can this company deliver? | Relevant project examples, license and insurance status, written process |
| What happens if something goes wrong? | Warranty terms, service response, escalation path, written exclusions |
| Is the price comparable? | Itemized scope, assumptions, alternates, total cost, financing disclosures |
| Will my home be protected? | Access plan, containment, cleanup, communication, restoration scope |

Reviews and testimonials support reputation. They do not prove a specific diagnosis or technical claim.

## Options quality test

An option passes only if:

1. It is safe, legal, and technically viable.
2. The seller can explain the meaningful difference from other options.
3. Its limitations and exclusions are visible.
4. The company can deliver it as promised.
5. The price and payment structure are clear.
6. The recommendation can be traced to the buyer's priorities.
7. The buyer may pause, compare, or decline without punishment.

## Repair versus replace

TRUSS should not use a fixed age rule. The discussion should consider verified condition, safety, failure frequency, repair availability, expected remaining life, performance, customer time horizon, disruption, warranty, and total financial exposure. If the technician lacks evidence, the AI should ask for it rather than manufacture certainty.

## Financing

Financing can make necessary work feasible, but it increases the obligation to disclose. Coach representatives to explain cash price, financed amount, APR or required disclosures supplied by the finance provider, term, payment, promotional conditions, fees, and consequences of deferred-interest structures when applicable. TRUSS does not interpret a lender contract or tell a customer what credit product is best for them.

## Lost-sale learning

Use buyer language, not seller shorthand. Replace `price` as a catch-all with a verified reason such as:

- scope was not comparable
- cash flow or credit constraint
- decision maker absent
- trust or proof gap
- timing not aligned
- incumbent relationship
- project postponed
- competitor offered a better-fit solution
- no decision or unreachable
- seller follow-up failure

Unknown is acceptable when the buyer did not say. Fabrication is not.



---

<!-- SOURCE FILE: docs/02_doctrine/commercial_sales.md -->


# Commercial Sales Doctrine

Commercial trade sales is the disciplined conversion of market intelligence and relationships into profitable, executable work. Access is not qualification, and a bid invitation is not proof of a winnable opportunity.

## Choose where to play

Define an ideal client and opportunity profile before prospecting:

- geography and service radius
- facility, asset, and project types
- trade capability and licensing
- recurring service versus capital work
- minimum and maximum contract size
- labor, equipment, bonding, insurance, and safety capacity
- preferred contract terms and risk tolerance
- margin requirements
- strategic fit and reference value

## Account development process

### Research

Map locations, assets, operating hours, project pipeline, incumbent providers, safety demands, procurement rules, likely triggers, financial signals, and relevant public records. Label inference as inference.

### Stakeholders

Distinguish the user, technical evaluator, facility leader, project manager, estimator, procurement lead, finance approver, safety leader, executive sponsor, and potential blocker. Do not label a friendly contact a champion until that person is willing and able to help the decision move internally.

### Relevance

Earn attention with a specific reason for contact tied to the account, asset, project, or trigger. A capability dump is not value.

### Discovery

Translate technical conditions into business impact such as downtime, tenant disruption, safety exposure, schedule risk, energy use, lifecycle cost, labor demand, revenue interruption, reporting burden, or budget volatility.

### Qualification

Confirm fit, access, need, timing, decision method, competition, resource demand, commercial terms, contract risk, and probability of profitable delivery. Missing information reduces confidence. It does not justify optimism.

### Solution and consensus

Align scope, alternates, response levels, schedule, staffing, documentation, reporting, and risk controls to stakeholder needs. Help the buying team use the same facts and decision criteria.

### Handoff and expansion

Transfer every promise to estimating and operations. After delivery, review performance against agreed outcomes, then identify renewals, adjacent assets, sites, and services.

## Go or no-go framework

Score each criterion 0 to 4 and document evidence:

| Criterion | Weight | Key question |
| --- | ---: | --- |
| Strategic fit | 10 | Is this the kind of work the company wants? |
| Capability and capacity | 15 | Can it be delivered safely and well in the required window? |
| Customer access | 10 | Is there meaningful contact beyond the bid portal? |
| Need and timing | 10 | Is the opportunity real and funded or plausibly fundable? |
| Decision visibility | 10 | Are criteria, process, and stakeholders understood? |
| Competitive position | 10 | Is there a credible path to preference? |
| Scope quality | 10 | Is the information sufficient to estimate and control change? |
| Commercial terms | 10 | Are payment, insurance, bond, warranty, indemnity, and schedule risks acceptable? |
| Margin potential | 10 | Can the work meet risk-adjusted margin expectations? |
| Relationship and expansion value | 5 | Does the pursuit create durable strategic value? |

Use thresholds as company policy, not universal doctrine. A hard legal, safety, licensing, capacity, or unacceptable contract-risk failure can force a no-go regardless of score.

## Opportunity evidence states

- `signal`: a possible trigger or rumor
- `identified`: named need or project with a plausible account
- `engaged`: reciprocal buyer interaction
- `qualified`: fit, need, timing, decision path, and viable economics supported
- `solutioning`: scope or approach is being shaped with buyer input
- `proposed`: decision-ready offer delivered
- `committed`: documented buyer commitment, pending final conditions
- `won`, `lost`, `no_decision`, or `disqualified`

Pipeline stage must describe buyer evidence, not seller activity.

## Commercial value language

Translate capability into consequence and proof:

| Technical condition or capability | Business translation | Evidence |
| --- | --- | --- |
| Aging equipment and reactive maintenance | Downtime and budget volatility | Asset history, failure rate, repair spend, parts availability |
| Preventive maintenance program | More predictable operation and intervention | Task standard, completion reporting, inspection findings |
| Prefabrication or standardization | Less field labor and schedule variability | Production plan, quality checks, prior cycle-time data |
| Safety program | Reduced interruption and owner risk | EMR, incident data, training records, site plan |
| Coordination discipline | Lower rework and schedule exposure | Look-ahead process, clash or RFI practice, project examples |
| Multi-site service agreement | Fewer vendors and clearer accountability | Response terms, reporting cadence, escalation, renewal review |

Avoid generic claims such as better quality, great service, or cost savings without a definition and proof.

## Seller-doer model

The business developer earns access, maintains the account map, and coordinates the pursuit. Technical leaders diagnose, validate, and demonstrate delivery confidence. Ownership of the CRM record, next action, and handoff must remain explicit.



---

<!-- SOURCE FILE: docs/02_doctrine/objections_negotiation_and_decisions.md -->


# Objections, Negotiation, and Decisions

An objection is usually unresolved uncertainty, a real constraint, a competing priority, or a polite refusal. TRUSS diagnoses before responding.

## ACORN response sequence

TRUSS uses ACORN inside the Secure beam:

1. **Acknowledge** without arguing or surrendering.
2. **Clarify** what the statement means in this case.
3. **Observe** whether it is the only barrier or one of several.
4. **Respond** with relevant evidence, a viable adjustment, or a truthful limitation.
5. **Next step** by confirming resolution and asking for the appropriate commitment.

ACORN is a coaching memory aid, not a customer-facing acronym.

## Common objection families

| Statement | Diagnose | Useful direction | Prohibited response |
| --- | --- | --- | --- |
| The price is too high | Compared with another scope, expected budget, or available cash? | Reconcile scope, value, risk, and viable payment or phase options | Shame, fake discount deadline, conceal total cost |
| I need more estimates | What will another estimate help compare? | Offer a scope checklist and schedule a useful follow-up | Disparage competitors or claim all other bids are unsafe |
| I need to think | Which part feels least settled? | Resolve missing confidence, information, stakeholder, or affordability | Repeated closing questions |
| I need to ask someone | What will that person need to see? | Offer a joint review and concise recap | Pressure the present person to decide alone |
| Can you just repair it? | Is the priority immediate cost, time, or avoiding another interruption? | Explain repair viability, limits, and alternatives | Withhold a safe repair to force replacement |
| Another company is cheaper | Is the scope and protection equivalent? | Compare line by line using written facts | Invent deficiencies or attack the competitor |
| Send me information | What decision are they preparing for? | Send the smallest useful artifact and agree on a next step | Spam a generic brochure sequence |
| We already have a vendor | How is the incumbent performing, and where is coverage thin? | Position a second-source, specialty, or benchmark conversation if relevant | Manufacture dissatisfaction |
| We are not bidding this | Is the issue fit, timing, terms, capacity, or probability? | Make a deliberate no-go and preserve the relationship | Bid at a loss for visibility without approval |

## Negotiation preparation

Before negotiating, define:

- desired outcome
- walk-away conditions
- variables that can be traded
- variables that cannot be compromised
- cost and operational impact of each concession
- buyer priorities and approval boundaries
- objective evidence
- alternative paths

Concessions should be exchanged, not leaked. A concession can trade price for scope, schedule, volume, term, payment speed, access, reference rights, or risk allocation only when permitted and documented.

## Decision clarity

A good close is a clear next commitment with informed consent. TRUSS should ask:

- Does the buyer understand the condition and evidence?
- Is the solution aligned to stated priorities?
- Are price, scope, exclusions, timing, and responsibilities visible?
- Are required decision makers involved?
- Are material legal or financing disclosures complete?
- Can operations deliver every promise?

If not, return to the earliest unresolved beam.



---

<!-- SOURCE FILE: docs/02_doctrine/front_office_followup_and_handoff.md -->


# Front Office, Follow-up, and Handoff

The sales chain begins before a field representative arrives and continues after the signature.

## Lead handling

The goal is to convert qualified demand into a well-set appointment, not to diagnose technical work over the phone.

Capture:

- contact and location
- preferred channel
- problem in the customer's words
- urgency and known safety indicators
- property or equipment facts that affect dispatch
- eligibility, service area, fee, and access constraints
- appointment window and preparation
- who will be present

If a safety signal is present, follow approved safety and dispatch protocols. The call handler must not improvise technical instructions.

## Appointment setting

Strong appointment setting includes empathy, control, accurate windows, fee clarity, technician identity, and a direct booking question. Measure qualified-call booking rate, not all-call booking rate, when spam, wrong numbers, duplicates, and out-of-area calls exist.

## Pre-arrival

Confirm the appointment, arrival window, technician identity, access needs, fee, and any preparation. Update delays before the promised window expires.

## Proposal follow-up

Each follow-up should do one job:

- answer a known question
- make scope easier to compare
- involve a missing stakeholder
- provide requested proof
- clarify timing or availability truthfully
- confirm whether the project is still active

Cadence should reflect urgency, buyer preference, ticket size, and decision process. Repeated `just checking in` messages add no value.

## Handoff standard

A complete handoff includes:

- buyer's desired outcome and priority order
- verified condition and supporting evidence
- selected scope, alternates, exclusions, and residual risks
- price, deposit, financing, and payment milestones
- schedule assumptions and dependencies
- permit, inspection, access, safety, and site rules
- promised communications and named contacts
- sensitive customer concerns relevant to delivery
- change-order process
- acceptance and completion criteria

## Closed-loop quality

Sales outcomes should be linked to cancellation, financing approval and fallout, reschedule, callback, rework, complaint, review sentiment, gross margin, payment timing, and renewal or referral. A booked job that fails downstream is not a clean win.



---

<!-- SOURCE FILE: docs/03_modes/coach.md -->


# Coach Mode

## Job

Coach helps a seller decide what to do next and improve one observable behavior at a time. It can prepare, review, diagnose, rehearse, or debrief. It should not overwhelm the user with a complete sales course when one next action will help.

## Inputs

Minimum:

- user goal or problem
- trade and buyer type
- sales stage or interaction type

High-value context:

- transcript, notes, proposal, or CRM record
- sales motion
- customer language
- known evidence and unknowns
- company playbook and constraints
- prior coaching goal
- outcomes and metrics

## Process

1. Classify the context and confidence.
2. Identify the current buyer job and seller objective.
3. Separate facts, customer statements, seller interpretations, and missing information.
4. Score only observable behavior.
5. Locate the earliest weak TRUSS beam that materially affected the result.
6. Explain why it mattered using specific evidence.
7. Give one primary adjustment and no more than three supporting actions.
8. Provide natural example language appropriate to the seller's voice.
9. Assign a short practice or field target.
10. Define how improvement will be observed.

## Output contract

1. `Context`: motion, stage, buyer, confidence, assumptions
2. `Diagnosis`: the earliest weak beam and evidence
3. `Keep`: one behavior to preserve
4. `Change`: one priority behavior
5. `Try this`: example language, clearly adaptable
6. `Next action`: a concrete action tied to the live opportunity
7. `Practice target`: one drill or field behavior
8. `Measure`: observable success signal
9. `Guardrail`: only when a real risk is present

## Coaching styles

- `just_in_time`: concise, one decision or message
- `debrief`: conversation review with evidence
- `skill_building`: explanation, examples, drill, measurement
- `manager_review`: patterns across calls and metrics
- `pre_call`: research, hypotheses, questions, risk, opening, next-step goal

## Scoring rules

- Do not infer tone, emotion, or intent from text alone without uncertainty language.
- Do not score missing portions of a transcript as failures.
- Do not reward pressure because a sale closed.
- Do not penalize a deliberate no-go or customer decline when the process was strong.
- Critical violations override the numeric score.
- Compare a seller primarily with their own baseline and matched cohort.

## Example diagnostic

If a representative responded well to a price objection but never learned the customer's time horizon or whether the comparison bid included ductwork, the primary coaching opportunity is Understand, not Secure. The next drill should practice clarifying scope and decision criteria before price defense.



---

<!-- SOURCE FILE: docs/03_modes/practice.md -->


# Practice Mode

## Job

Practice creates realistic, context-specific simulations that force judgment, listening, adaptation, and clear next steps. The simulated buyer is not a cooperative script reader.

## Scenario specification

Required fields:

- trade
- sales motion
- channel
- buyer role and state
- visible situation
- hidden facts
- priorities
- constraints
- objections and triggers
- technical proof available or missing
- decision process
- acceptable outcomes
- prohibited seller behaviors
- difficulty and time pressure

## Simulation behavior

- Reveal information only when earned by relevant questions or evidence.
- Respond naturally and consistently with the buyer profile.
- Do not create arbitrary hostility to simulate difficulty.
- Do not reward keywords, acronyms, or canned lines.
- Allow multiple strong paths when they respect the facts.
- End in a sale, next step, pause, decline, or no-go based on decision quality.
- Never reveal hidden facts during the roleplay.

## Difficulty levels

| Level | Buyer behavior | Coaching goal |
| --- | --- | --- |
| 1: Guided | Cooperative, one clear concern, complete facts available | Learn sequence and summaries |
| 2: Realistic | Partial answers, two concerns, ordinary interruption | Ask focused follow-ups and adapt |
| 3: Complex | Multiple stakeholders or tradeoffs, ambiguity, comparison | Build decision clarity and consensus |
| 4: Adverse | Skepticism, incomplete evidence, competitive or compliance risk | Maintain integrity and control without pressure |

## Feedback contract

After the simulation:

1. State the outcome and why the buyer chose it.
2. Score each TRUSS beam 0 to 4 with transcript evidence.
3. Identify one critical moment.
4. Show one stronger alternative response.
5. Name one behavior to repeat and one to change.
6. Assign a focused replay from the critical moment.
7. Flag any critical violation separately.

## Scenario balance

The library should include wins, losses, no-decisions, deliberate no-gos, and good outcomes without immediate revenue. At least 20 percent of evaluation scenarios should be cases where the right behavior is to slow down, verify, refer, or decline.

## Voice roleplay notes

For voice sessions, score interruptions, long monologues, question stacking, responsiveness to buyer language, and next-step clarity. Do not treat a universal talk ratio as a hard target. Conversation type changes what balanced participation looks like.



---

<!-- SOURCE FILE: docs/03_modes/campaign_creation.md -->


# Campaign Creation Mode

## Job

Campaign Creation turns a defined audience, trigger, offer, proof set, and goal into a coordinated sequence that earns the next conversation. It does not invent customer facts, permission, scarcity, or results.

## Required brief

- B2B or D2C
- trade and service
- geography and jurisdiction
- audience segment
- known trigger or reason now
- offer and delivery capacity
- approved proof
- channel permissions and suppression rules
- desired next commitment
- brand voice
- measurement window

If the brief lacks differentiation, proof, capacity, or permission, TRUSS should surface the gap before generating copy.

## TRUSS campaign map

| Beam | Campaign function |
| --- | --- |
| Trust | Clear identity, reason for contact, proof, transparent offer and terms |
| Relate | Segment-specific language, context, season, asset, or buyer role |
| Understand | Reflect a plausible problem without pretending it is verified |
| Solve | Explain the relevant outcome and mechanism in concrete terms |
| Secure | Use one low-friction call to action and a respectful follow-up path |

## B2C patterns

- seasonal readiness based on legitimate weather or maintenance timing
- replacement planning for aging systems or home ownership changes
- abandoned estimate follow-up based on known unresolved questions
- maintenance renewal and lapse recovery
- referral or review request after completed service
- storm education and inspection permission without damage or coverage claims

## B2B patterns

- account-trigger outreach tied to a facility, asset, permit, expansion, job posting, incident, or public project
- problem-specific sequence for downtime, response coverage, compliance documentation, backlog, or coordination
- referral introduction
- dormant-account reactivation using prior relationship facts
- renewal and performance review
- project intelligence and early stakeholder meeting request

## Sequence design

Each touch should add new value. A sequence may use email, phone, text, direct mail, social, door contact, or events only where permitted. Recommended structure:

1. Relevance and permission
2. Evidence or useful insight
3. Decision support such as a checklist or benchmark
4. Specific next-step invitation
5. Respectful close-the-loop message

## Output contract

- campaign hypothesis
- audience and exclusions
- trigger and source
- offer and approved proof
- message map by TRUSS beam
- channel sequence with timing assumptions
- copy variants
- CTA
- compliance checklist
- measurement plan
- stop conditions
- A/B hypothesis limited to one major variable at a time

## Measurement

Track deliverability, contact, response, qualified conversation, appointment, opportunity, proposal, sale, unsubscribe or opt-out, complaint, and attributed gross margin. Open rate is not a business outcome and may be unreliable.

## Compliance floor

Commercial email must follow applicable CAN-SPAM requirements. Calls and texts require channel- and technology-specific TCPA and state-law review. Door-to-door, storm, financing, home-solicitation, licensing, and cancellation rules vary. TRUSS drafts for review and does not declare a campaign legally compliant.



---

<!-- SOURCE FILE: docs/03_modes/account_review.md -->


# Account Review Mode

## Job

Account Review converts CRM history, activity, opportunity, delivery, relationship, and market signals into an evidence-based account plan. It must distinguish account facts from seller belief.

## Input layers

- firmographics, locations, assets, and serviceable geography
- contacts, roles, influence, relationship strength, and last verified date
- interactions and customer language
- opportunities, stages, values, probabilities, age, and next steps
- proposals, wins, losses, and stated reasons
- service history, quality, margin, payment, complaints, and renewal dates
- external triggers with sources
- company capacity and account strategy

## Review sequence

1. Confirm identity and deduplicate related entities.
2. Summarize verified account facts.
3. Map stakeholders and identify single-thread risk.
4. Map current needs and signals to TRUSS beams.
5. Test each opportunity stage against buyer evidence.
6. Review relationship, revenue, gross margin, delivery quality, and payment health.
7. Identify gaps, risks, and expansion hypotheses.
8. Prioritize no more than three actions by impact, confidence, and urgency.
9. Assign an owner and due date.

## Account health dimensions

| Dimension | Evidence |
| --- | --- |
| Relevance | Fit with geography, capabilities, service mix, and strategy |
| Access | Active contacts across operational, technical, economic, and procurement roles |
| Need | Verified problem, project, renewal, or trigger |
| Momentum | Buyer actions, reciprocal next steps, and stage progression |
| Economics | Revenue, margin, cost to serve, payment, estimate cost, and risk |
| Delivery | Uptime, SLA, callbacks, change orders, complaints, and customer outcomes |
| Durability | Renewals, repeat work, referrals, incumbent strength, and concentration |

## Stage integrity

Opportunity stage must be supported by a buyer action or verified condition. Sending an email is activity, not progress. A stale opportunity should be requalified, nurtured, closed as no decision, or disqualified.

## Output contract

1. `Account summary`: facts and sources
2. `Health`: dimension scores and evidence freshness
3. `Stakeholder map`: role, relationship, influence, concern, next action
4. `Opportunity audit`: stage evidence, gaps, risk, and next buyer action
5. `Expansion hypotheses`: clearly labeled and testable
6. `Top actions`: owner, due date, expected evidence
7. `Data quality`: missing, stale, contradictory, or inferred fields

## Guardrails

- Never infer protected traits or personal vulnerability.
- Never create a decision-maker title from an unverified name.
- Never increase forecast probability because of seller activity alone.
- Do not recommend expansion while unresolved delivery failures threaten Trust.
- Do not celebrate revenue without margin and quality context.



---

<!-- SOURCE FILE: docs/03_modes/market_research.md -->


# Market Research Mode

## Job

Market Research helps a trade business decide where to focus, why a segment matters, what evidence supports it, and what the next validation step should be. It does not fabricate market size from search volume or convert a storm event into permission to solicit.

## Research frame

### Trust

Use current, attributable sources. State dates, geography, definitions, and limitations. Separate public fact, vendor estimate, and TRUSS inference.

### Relate

Define the actual market unit: homeowner, property type, facility type, general contractor, owner, developer, asset class, project type, or service agreement.

### Understand

Investigate demand, urgency, asset age, housing or facility stock, permits, construction spending, employment capacity, competition, pricing signals, weather, disasters, procurement, and buyer pain.

### Solve

Translate data into serviceable segments, differentiated offers, proof needs, channel strategy, and capability requirements.

### Secure

Recommend a validation action: interviews, a pilot territory, account list verification, campaign test, partner conversation, or no-go.

## Preferred public sources

| Question | Sources |
| --- | --- |
| Housing age, ownership, improvements, demographics | Census ACS and American Housing Survey |
| New residential activity | Census Building Permits Survey and New Residential Construction |
| Commercial and public construction activity | Census Value of Construction Put in Place |
| Contractor counts and local industry structure | Census County Business Patterns and Nonemployer Statistics |
| Trade labor supply and wages | BLS OEWS, QCEW, Occupational Outlook Handbook |
| Residential and commercial energy characteristics | EIA RECS and CBECS |
| Severe weather history | NOAA NCEI Storm Events Database |
| Disaster declarations | OpenFEMA |
| Local competitors and reputation | Verified search, maps, licensing boards, review profiles, company sites |
| Public projects | Agency capital plans, procurement portals, permits, planning agendas |

## Market sizing

Use three layers:

- `TAM`: total demand that could theoretically use the service
- `SAM`: demand inside geography, capability, licensing, and service constraints
- `SOM`: realistic near-term capture based on capacity, channels, competition, and conversion

Show the formula and units. Use ranges when inputs are uncertain. Do not multiply unrelated percentages to create false precision.

## Opportunity score

Score 0 to 4 with evidence:

- demand intensity
- trigger strength
- ideal-customer fit
- competitive whitespace
- access and channel viability
- operational capacity
- margin potential
- regulatory complexity
- data confidence

The output is a prioritization aid, not a forecast.

## Output contract

- research question and market definition
- executive finding
- demand and buyer evidence
- competitor and channel landscape
- trigger map
- segment attractiveness table
- TAM, SAM, and SOM with formulas and uncertainty
- risks and missing data
- recommended validation tests
- source table with access date

## Trade examples

- HVAC: housing age, climate, fuel type, equipment stock, heat exposure, labor supply, permits, replacement and repair signals
- Roofing: roof age proxies, hail and wind events, permits, insurance environment, storm-solicitation rules, local reviews
- Plumbing: housing age, water and sewer infrastructure, property density, emergency access, multifamily stock
- Electrical: housing age, panel and service characteristics, permits, EV and electrification demand, commercial construction
- Commercial service: facility density, asset types, operating hours, existing vendors, response gaps, procurement path
- Commercial projects: capital plans, permits, construction spending, developer and GC networks, labor and bonding capacity



---

<!-- SOURCE FILE: docs/04_trades/hvac.md -->


# HVAC Sales Pack

## Common contexts

- no-cool or no-heat urgent service
- repair versus replace
- planned system replacement
- indoor air quality or comfort improvement
- maintenance agreement
- commercial preventive maintenance and service
- commercial replacement or retrofit

## Trust

Confirm the visit process and diagnostic fee. Protect the home. Use model and serial information, readings, photos, load or airflow evidence, and documented equipment match where relevant. Do not use system age, nameplate size, or a rule of thumb as a complete diagnosis.

## Relate

Explore comfort, rooms affected, humidity, noise, air quality concerns, operating habits, household needs, disruption tolerance, time horizon, and prior service experience. In commercial accounts, connect to uptime, tenant complaints, process conditions, after-hours response, asset visibility, and budget control.

## Understand

Questions should establish:

- what changed and when
- whether the issue is intermittent or constant
- equipment and repair history
- affected spaces and operating conditions
- thermostat, filter, airflow, duct, and envelope observations within role boundaries
- desired comfort and ownership horizon
- decision and payment constraints

The seller must not announce replacement before the inspection supports it.

## Solve

Possible solution families include safe repair, repair plus identified correction, planned replacement, system redesign, duct or airflow work, controls, maintenance, and monitoring. Each option should state what is included, what remains, expected performance basis, warranty, schedule, and total price.

For replacement, objective proof can include load calculations, airflow and duct evaluation, properly matched equipment documentation, commissioning measurements, and written model and warranty details. ENERGY STAR advises homeowners to compare cost, efficiency, warranties, and written scope, and its checklist calls for sizing and matched-system documentation.[^S010][S011][S012]

## Secure

Common unresolved issues include repair versus replace, equipment brands, efficiency payback, comfort confidence, disruption, financing, and comparison bids. Clarify the decision criterion before answering. Never guarantee utility savings without a defensible model and assumptions.

## Metrics

- qualified-call booking rate
- run rate and decision-maker participation
- diagnostic completion
- repair and replacement option rate by eligible call
- replacement lead conversion by source
- revenue and gross margin per opportunity
- maintenance attachment and renewal
- cancellation, callback, rework, complaint, financing fallout
- comfort or performance issue after installation

## Critical failures

- unsupported carbon monoxide, fire, refrigerant, mold, or code claim
- disabling equipment to create urgency
- representing a repair as impossible when it is viable
- promising a rebate, savings amount, permit outcome, or financing approval without verification
- selling equipment that is not appropriately sized or matched



---

<!-- SOURCE FILE: docs/04_trades/plumbing.md -->


# Plumbing Sales Pack

## Common contexts

- active leak, stoppage, sewer backup, or no hot water
- recurring drain or pressure issue
- fixture, water heater, line, or repipe replacement
- water quality or conditioning
- preventive maintenance
- commercial service, backflow, grease, drain, and asset programs

## Trust

Contain urgent risk within approved procedures, disclose diagnostic and access costs, and document the location and condition. Camera images, pressure readings, leak detection, material identification, and accessible component condition can support a recommendation. A symptom alone does not prove a collapsed sewer, whole-home repipe, or contamination.

## Relate

Ask about recurrence, damage, occupants, water use, shutdown impact, restoration concerns, access, prior work, and whether the customer prioritizes immediate function, reduced recurrence, water quality, or long-term replacement.

## Understand

Establish what is affected, when it occurs, what has been attempted, whether multiple fixtures are involved, accessible evidence, likely source, and what additional testing is needed. In commercial work, include operational hours, tenants, production, food service, shutdown windows, reporting, and response expectations.

## Solve

Separate stabilization, diagnostic work, repair, partial replacement, full replacement, restoration, prevention, and monitoring. State whether excavation, wall access, cleanup, permits, water shutoff, or third-party restoration is included.

## Secure

Frequent objections concern immediate cost, why broader work is recommended, property disruption, restoration, warranty, and recurrence. Respond with the actual evidence and residual risk, not catastrophe.

## Metrics

- response and booking by urgency
- diagnostic-to-option completion
- same-day stabilization rate
- repair versus replacement mix by verified condition
- average ticket and gross margin by call type
- restoration coordination quality
- callback, recurrence, water-damage complaint, cancellation, renewal

## Critical failures

- claiming structural collapse, contamination, or code violation without evidence
- using a customer's emergency to hide price or scope
- omitting restoration or excavation exclusions
- recommending water treatment from an unverified fear claim
- promising no recurrence where system conditions make that impossible



---

<!-- SOURCE FILE: docs/04_trades/electrical.md -->


# Electrical Sales Pack

## Common contexts

- outage, burning odor, heat, arcing, or repeated trip
- circuit, service, panel, generator, lighting, or controls work
- EV charging and electrification planning
- remodel or addition
- commercial service, maintenance, retrofit, and construction

## Trust

Safety communication must be factual and proportional. Use measurements, inspection findings, equipment ratings, load calculations, permit requirements, manufacturer information, and applicable code references verified for the jurisdiction. A crowded or older panel is not proof of immediate fire.

## Relate

Understand the affected use, future loads, reliability needs, occupants, home plans, outage tolerance, aesthetics, schedule, and budget. Commercial buyers may value uptime, arc-flash documentation, shutdown planning, energy, controls, tenant coordination, and inspection readiness.

## Understand

Clarify the symptom, circuit or equipment involved, recurrence, changes before the issue, planned loads, service capacity, observed condition, and what testing remains. Distinguish code currently adopted in the jurisdiction from general best practice.

## Solve

Options may include targeted repair, dedicated circuit, component or panel work, service upgrade, load management, phased electrification, monitoring, preventive maintenance, or project scope. State shutdown needs, permits, utility coordination, patching, trenching, and commissioning.

## Secure

Common concerns include urgency, panel scope, alternative designs, outage duration, wall repair, inspection, price, and future capacity. Use clear diagrams or load evidence when helpful. Never make a safety claim solely to accelerate a decision.

## Metrics

- qualified booking and emergency response
- inspection evidence completeness
- proposal cycle time
- change-order and scope-clarification rate
- gross margin and labor variance
- permit or inspection rework
- callback, safety complaint, cancellation, project delay

## Critical failures

- unsupported fire or shock claim
- declaring a specific code violation without verifying adopted code and condition
- promising utility or permit timing
- omitting shutdown, access, patching, trenching, or restoration requirements
- exceeding license or role boundaries



---

<!-- SOURCE FILE: docs/04_trades/roofing_and_exteriors.md -->


# Roofing and Exteriors Sales Pack

## Common contexts

- active leak and repair
- planned roof, gutter, siding, window, or door replacement
- storm response and inspection
- retail versus insurance-involved work
- commercial maintenance, restoration, replacement, or bid

## Trust

Use dated photos, measurements, material condition, roof age evidence when available, moisture findings, ventilation and flashing observations, and clear access limits. Credentials, insurance, manufacturer status, permits, workmanship warranty, and written scope address delivery risk. None of these replaces evidence of the condition.

## Relate

Explore leak history, interior impact, storm timing, ownership horizon, appearance, energy or comfort concerns, maintenance tolerance, insurance status, prior claims, budget, schedule, and fear of storm contractors.

## Understand

Separate observed damage, normal wear, installation defect, maintenance issue, and storm-consistent condition. TRUSS should never infer causation or insurance coverage from a photograph alone.

## Solve

Differentiate temporary mitigation, localized repair, restoration, partial replacement where viable, full replacement, ventilation or flashing correction, and accessory scope. State decking allowances, disposal, permits, landscaping protection, interior work, gutters, ventilation, warranty, and change conditions.

## Secure

Common issues include repair versus replacement, insurance, deductible, material, warranty, comparison bids, timing, and contractor trust. Explain the contractor's role separately from the insurer or adjuster. Do not promise coverage, claim approval, or deductible treatment.

## Storm and canvassing guardrails

- Identify the company and reason for contact.
- Ask permission for inspection or follow-up.
- Describe only observed facts.
- Do not claim a neighborhood, roof, or policy is covered because a storm occurred.
- Follow solicitation, licensing, cancellation, advertising, and insurance-related state rules.
- Stop contact when asked.

## Metrics

- contact-to-inspection and inspection-to-proposal by lead source
- retail and insurance-involved conversion separately
- supplement and scope revision cycle time
- gross margin after decking and change conditions
- cancellation and rescission
- production handoff defects, property damage, leak callbacks, complaint, review sentiment

## Critical failures

- manufactured damage
- false storm date or severity
- promise of insurance coverage or claim outcome
- unlawful deductible waiver or rebate
- fake urgency, permit, material, or warranty claim
- omission of known scope uncertainty



---

<!-- SOURCE FILE: docs/04_trades/remodeling_and_general_contracting.md -->


# Remodeling and General Contracting Sales Pack

## Common contexts

- kitchen, bath, basement, addition, accessibility, or whole-home project
- design-build consultation
- estimate or competitive bid
- insurance restoration requiring separate restoration controls
- light commercial renovation

## Trust

Trust comes from relevant portfolio evidence, a visible process, realistic schedule assumptions, allowance clarity, change control, communication expectations, licenses and insurance, and transparent responsibility for design, permits, selections, and trade coordination.

## Relate

Learn how the space should function, who uses it, what currently fails, style priorities, ownership horizon, disruption tolerance, must-haves, tradeoffs, budget range, target date, and how household or organizational stakeholders will decide.

## Understand

Separate concept, feasibility, design, selections, pricing, and construction. A firm date or price before enough information exists should be presented as a range with assumptions, not a promise.

## Solve

Useful alternatives can vary by layout, finish level, phasing, schedule, durability, maintenance, or design service. Allowances must state what they cover. Exclusions, unknown concealed conditions, owner-supplied items, permits, temporary facilities, protection, cleanup, and change-order process belong in the decision.

Choice complexity can increase when the task is difficult, the option set is complex, preferences are uncertain, or the buyer is trying to reduce effort. TRUSS should organize choices around priorities and stage selections instead of assuming more options are always better.[^S024]

## Secure

The next commitment may be a paid design phase, site investigation, budget alignment meeting, selections milestone, proposal review, or construction agreement. Do not force a construction decision while the buyer is still defining the project.

## Metrics

- lead qualification and consultation show rate
- design agreement conversion
- estimate and proposal cycle time
- proposal-to-contract by source and project type
- allowance and scope revision frequency
- gross margin variance and change-order quality
- schedule variance, client communication adherence, punch-list, warranty, complaint, referral

## Critical failures

- lowballing with expected future change orders
- promising dates before permits, selections, design, labor, and material are validated
- using portfolio work the company did not perform
- hiding allowances or exclusions
- treating a conceptual estimate as a fixed construction price



---

<!-- SOURCE FILE: docs/04_trades/recurring_property_services.md -->


# Recurring Property Services Sales Pack

This pack covers landscaping, lawn care, pest control, cleaning, pool service, and similar recurring residential or commercial services.

## Trust

Set expectations for visit cadence, service window, access, weather, treatment or task standard, communication, exclusions, cancellation, pets and occupants, property protection, and what requires customer participation.

## Relate

Discover the desired condition, tolerance for maintenance or chemicals, prior service, seasonal expectations, appearance standards, occupants, pets, events, access, budget, and reasons the last arrangement did or did not work.

## Understand

Identify site conditions, severity, recurrence, contributing factors, customer responsibilities, and what must be inspected. For pest and lawn care, avoid guaranteed outcomes when biology, weather, access, sanitation, or neighboring conditions materially affect control.

EPA describes integrated pest management as using pest and control information to manage damage with the least feasible hazard to people, property, and the environment. TRUSS should therefore coach inspection, prevention, exclusion, monitoring, and proportional treatment rather than chemical fear or automatic escalation.[^S032][S033]

## Solve

Compare one-time correction, recurring program, phased improvement, monitoring, and premium response or reporting where viable. State cadence, seasonal variation, included callbacks, material or chemical assumptions, customer tasks, and renewal terms.

## Secure

Common concerns include contract term, recurrence, safety, weather, missed visits, service consistency, price, and who will perform the work. Confirm the measurable service standard and how issues are corrected.

## Metrics

- quote acceptance by service type
- recurring attachment and renewal
- route density and service completion
- callback or reservice
- skip, cancellation, and churn reasons
- gross margin by route or program
- complaint, review sentiment, referral, expansion

## Critical failures

- guaranteed eradication or permanent result without qualification
- unsupported health or safety claims
- hidden auto-renewal, cancellation, or visit terms
- failure to disclose customer responsibilities
- recommendation outside licensing, label, or company procedure



---

<!-- SOURCE FILE: docs/04_trades/commercial_specialty_contracting.md -->


# Commercial Specialty Contracting Sales Pack

This pack covers mechanical, electrical, plumbing, roofing, fire protection, controls, concrete, site, and other specialty contractors selling to owners, facilities teams, developers, and general contractors.

## Trust

Commercial proof includes relevant project experience, safety performance, qualified labor, licenses, bonding and insurance, quality process, schedule reliability, reporting, financial capacity, references, and a credible project team. Use proof specific to the pursuit.

OSHA frames safety programs around management leadership, worker participation, hazard identification, prevention, education, program evaluation, and coordination with host employers and contractors. TRUSS should translate the contractor's verified system into buyer risk reduction without claiming zero risk.[^S030][S031]

## Relate

Different stakeholders value different outcomes:

- facility operations: uptime, response, visibility, and continuity
- project manager: schedule, coordination, submittals, and issue resolution
- estimator or preconstruction: scope clarity, alternates, constructability, and price reliability
- procurement: comparability, terms, documentation, and supplier risk
- safety: program evidence, training, incident management, and coordination
- finance or owner: lifecycle cost, cash flow, risk, and return
- field leadership: labor, access, sequencing, and realistic means and methods

## Understand

Research the asset or project, stakeholders, incumbent, procurement path, schedule, plans, alternates, labor assumptions, access, shutdowns, logistics, safety, bonding, insurance, payment, retainage, warranty, liquidated damages, and change process.

## Solve

Build a value case around verified project or operating outcomes. Surface clarifications early. Use alternates to isolate tradeoffs. Involve estimating and operations before committing to schedule, labor, scope, or commercial terms.

## Secure

The next commitment may be a site walk, asset review, technical meeting, prequalification, budget exercise, invited bid, shortlist interview, negotiation, service pilot, or agreement. A deliberate no-go can protect the company and strengthen credibility.

## Metrics

- target-account coverage and stakeholder breadth
- qualified meetings and opportunities
- opportunity aging by buyer evidence
- go/no-go and bid rate
- shortlist, interview, hit, and award rate
- estimate cost and cycle time
- backlog quality, expected versus realized margin
- change-order recovery, DSO, retainage, claims, safety, rework, renewal, expansion

## Critical failures

- committing unavailable labor or schedule
- ignoring contract, bond, insurance, payment, safety, or licensing risk
- hiding clarifications to remain low bidder
- bidding known loss work without authorized strategic rationale
- using a relationship claim as evidence of award probability



---

<!-- SOURCE FILE: docs/05_metrics/metric_dictionary.md -->


# Metric Dictionary

Metrics must use explicit denominators, filters, time windows, and status rules. Report both counts and rates. Never compare unmatched cohorts without a warning.

## Funnel metrics

| Metric | Formula | Interpretation | Guardrail |
| --- | --- | --- | --- |
| Speed to first response | first human or approved automated response timestamp minus lead timestamp | Responsiveness | Segment business hours, channel, and lead source |
| Contact rate | unique leads with two-way contact / contactable unique leads | Ability to reach demand | Exclude spam and invalid contacts using a fixed rule |
| Qualified booking rate | booked qualified appointments / qualified two-way calls | Front-office conversion | Define qualified and cancellation handling |
| Show rate | appointments run / appointments scheduled | Scheduling quality | Separate customer cancellation, company cancellation, and reschedule |
| Run rate | completed sales visits / assigned viable opportunities | Field execution | Do not count unserviceable or duplicate leads |
| Proposal rate | decision-ready proposals / completed qualified visits | Diagnostic and estimating completion | A rough range is not always a proposal |
| Close or win rate | won opportunities / decisioned opportunities | Outcome conversion | Show no-decision and still-open separately |
| Lead close rate | won opportunities / unique qualified leads | Full-funnel conversion | Do not compare with proposal close rate |
| Revenue per lead | booked revenue / unique qualified leads | Funnel economics | Pair with gross margin and quality |
| Gross profit per lead | expected gross profit / unique qualified leads | Economic quality | Reconcile to realized margin later |

## Conversation metrics

| Metric | Definition | Use | Guardrail |
| --- | --- | --- | --- |
| TRUSS beam score | weighted 0 to 100 behavior score | Coaching and calibration | Score only observable behavior |
| Discovery coverage | applicable discovery families addressed with useful information / applicable families | Diagnose gaps | Coverage does not measure question quality alone |
| Verified fact ratio | material diagnostic claims supported by evidence / material diagnostic claims | Accuracy | Define materiality by trade |
| Assumption correction | incorrect assumptions corrected during conversation | Learning and honesty | Never reward initial guessing |
| Buyer participation | buyer contribution by turns and substance | Detect monologue or interrogation | Do not use one universal talk ratio |
| Summary accuracy | customer-confirmed priorities and facts accurately reflected | Listening quality | Human or calibrated grader review preferred |
| Recommendation alignment | proposal elements traceable to verified need and priority | Solve quality | More expensive is not more aligned |
| Next-step clarity | owner, action, timing, and purpose confirmed | Momentum | Seller-only action is weaker than reciprocal action |

## Proposal and economic metrics

| Metric | Formula | Guardrail |
| --- | --- | --- |
| Time to proposal | proposal delivery timestamp minus qualified inspection or discovery completion | Segment standard versus complex work |
| Option validity rate | proposals where every option passes viability test / multi-option proposals | Requires review, not option count |
| Average sold ticket | booked revenue / won jobs | Segment repair, replacement, project, and agreement |
| Expected gross margin | expected gross profit / booked revenue | Use consistent cost policy |
| Realized gross margin | realized gross profit / recognized revenue | Link back to seller and estimator assumptions |
| Discount leakage | unplanned discount dollars / list or approved price basis | Distinguish approved strategy and scope reduction |
| Financing usage | financed won jobs / financing-eligible won jobs | Never treat higher use as inherently better |
| Financing fallout | financed jobs cancelled or unfunded / financed booked jobs | Quality and disclosure indicator |

## Quality metrics

| Metric | Formula | Interpretation |
| --- | --- | --- |
| Cancellation or rescission | cancelled won jobs / won jobs | Decision and expectation quality |
| Callback or reservice | jobs requiring unplanned return for related issue / completed jobs | Diagnosis and execution quality |
| Rework cost rate | attributable rework cost / recognized revenue | Cost of quality |
| Complaint rate | substantiated complaints / completed jobs | Customer harm signal |
| Promise variance | documented commitments missed / audited jobs | Sales-to-operations alignment |
| Review sentiment | coded themes and rating after completed service | Relationship outcome, not absolute truth |
| Referral rate | new customers attributed to customer referral / eligible completed customers | Durable trust |

## Recurring and commercial metrics

| Metric | Formula | Use |
| --- | --- | --- |
| Agreement attachment | new agreements / eligible completed transactions | Recurring value creation |
| Renewal rate | renewed agreements / renewable agreements | Retention |
| Gross revenue retention | retained recurring revenue / beginning renewable recurring revenue | Excludes expansion |
| Net revenue retention | retained plus expansion minus contraction / beginning recurring revenue | Account durability |
| Target-account coverage | target accounts with current research and action / target accounts | Prospecting quality |
| Stakeholder breadth | active verified stakeholder roles per qualified account | Single-thread risk |
| Stage evidence compliance | open opportunities with required buyer evidence / open opportunities | CRM integrity |
| Qualified pipeline coverage | risk-adjusted qualified value / period target | Capacity planning, not guarantee |
| Go/no-go rate | formal go decisions / screened pursuits | Pursuit discipline |
| Shortlist rate | shortlisted pursuits / submitted pursuits | Positioning and proposal quality |
| Hit rate | awards / decisioned bids or proposals | Segment negotiated and hard bid |
| Estimate cost per pursuit | internal estimate and proposal cost / pursuits | Cost of sale |
| Backlog quality | scored mix of margin, risk, schedule, customer, and capacity | Better than backlog dollars alone |
| Days sales outstanding | accounts receivable / credit sales * days | Payment health |

## Diagnostic sequence

When a result metric changes, diagnose upstream in this order:

1. Definition or data-quality change
2. Demand volume and mix
3. Contact and appointment conversion
4. Sales-motion and opportunity quality
5. Conversation behavior
6. Proposal and pricing process
7. Decision and follow-up
8. Delivery, financing, cancellation, and margin outcome

Do not coach a behavior from correlation alone. Use transcripts, call reviews, CRM evidence, and controlled tests to determine cause.



---

<!-- SOURCE FILE: docs/05_metrics/scorecards_and_benchmarks.md -->


# Scorecards and Benchmark Policy

## Core interaction scorecard

Score 0 to 4. Use `N/A` when evidence is unavailable or a behavior does not apply.

| Beam | Weight | 0 | 2 | 4 |
| --- | ---: | --- | --- | --- |
| Trust | 20 | Misleading, disrespectful, or unsupported | Professional but incomplete proof or expectations | Clear permission, accurate expectations, matched proof, and integrity |
| Relate | 15 | Ignores buyer context | Recognizes obvious priorities | Adapts naturally to role, state, priorities, and stakes |
| Understand | 25 | Pitches from assumptions | Covers basic facts and one need | Diagnoses facts, consequence, outcome, constraints, and decision path, then confirms |
| Solve | 25 | Misfit or unsupported solution | Viable recommendation with limited value translation | Executable fit, clear options, limitations, proof, and recommendation tied to priorities |
| Secure | 15 | Pressure or no clear next step | Answers concern and suggests action | Diagnoses uncertainty, resolves it proportionately, and confirms commitment and handoff |

## Critical override

Any of the following sets the interaction status to `critical_failure` pending review:

- fabricated or altered evidence
- knowingly false safety, code, insurance, savings, competitor, or scarcity claim
- concealed financing cost or material term
- discriminatory or harassing behavior
- unauthorized work or recording
- knowingly undeliverable promise
- intentional damage or deception

The score may still be retained for coaching analysis but cannot be labeled passing.

## Mode-specific score emphasis

| Mode or context | Emphasize | De-emphasize |
| --- | --- | --- |
| Urgent service | Trust, calm triage, evidence, immediate next step | Long discovery count, broad option menus |
| Planned replacement | Understand, Solve, decision support | Same-day close as sole success |
| Technician-led | Permission, technical evidence, proportionality | Revenue from unrequested work |
| Remodeling | Scope, assumptions, process, stakeholder alignment | Instant close |
| Canvassing | Identity, consent, factual claims, next-step permission | Pressure and door persistence |
| Commercial service | Stakeholder map, operating impact, renewal value | Contact volume alone |
| Commercial project | Go/no-go, risk, positioning, handoff, margin | Bid count alone |

## Benchmark record requirements

Every external benchmark must include:

- metric name and exact formula if available
- value or distribution
- source organization and URL
- sample size and population
- field period and publication date
- geography
- included trades and business sizes
- source incentive or platform bias
- comparability notes
- expiration or review date

## Initial research benchmarks

These are context records, not universal goals:

| Finding | Population and period | Use |
| --- | --- | --- |
| Jobber reported 69% of surveyed home-service owners said they win more than half of quotes, and 36% reported winning over 70% | 1,050 U.S. owners surveyed December 2025, plus platform data | Shows wide self-reported variation and need for local segmentation[^S017] |
| Jobber reported 60% respond to leads the same day and 20% within an hour | Same survey | Supports response-time tracking, not a mandated target[^S017] |
| Housecall Pro reported 62% of surveyed homeowners were more likely to move forward when payment plans were offered | More than 1,100 U.S. homeowners, published 2026 | Supports transparent payment-option availability, not pressure[^S019] |
| BrightLocal's research shows consumers use multiple review sources and increasingly scrutinize authenticity, recency, and business responses | U.S. consumer survey, 2025 and 2026 reports | Supports current, authentic reputation evidence[^S005][S006] |
| Gartner reported 74% of B2B buyer teams in its survey showed unhealthy conflict, and consensus correlated with higher reported decision quality | 632 B2B buyers surveyed June to November 2024, published May 2025 | Supports consensus-building in complex commercial pursuits[^S023] |

## Internal target design

Set targets from a clean baseline and matched cohorts. Use a minimum sample rule, confidence interval where practical, and rolling windows. A seller should see:

- personal baseline
- current period
- matched team cohort
- target range
- sample size
- quality-adjusted outcome
- leading behavior linked to the target

Avoid public leaderboards when opportunity mix differs or sample sizes are small. Use team calibration and private coaching before compensation or disciplinary use.



---

<!-- SOURCE FILE: docs/06_training/eight_week_curriculum.md -->


# TRUSS Eight-Week Training Program

The program uses eight 45 to 50 minute live virtual sessions, short pre-work, field application, and AI practice. The live session is for demonstration, discussion, and rehearsal. Content consumption happens before the session.

## Program outcomes

Participants will be able to:

- classify the sales motion and choose an appropriate approach
- use all five TRUSS beams without sounding scripted
- separate verified facts, inference, and unknowns
- conduct focused discovery and accurate summaries
- build viable, transparent options and recommendations
- diagnose objections and secure clear next steps
- create relevant D2C and B2B campaigns
- review accounts and markets using evidence
- use metrics without gaming the sale

## Weekly cadence

| Component | Time | Purpose |
| --- | ---: | --- |
| Pre-work | 15 to 25 minutes | Learn one concept and submit a real example |
| Live session | 45 to 50 minutes | Demonstrate, discuss, practice, commit |
| AI practice | 2 sessions of 10 minutes | Repeat the critical behavior in context |
| Field target | Normal work | Apply one behavior and capture evidence |
| Manager check | 10 minutes | Reinforce and remove a barrier |

## Week 1: Build the frame

Focus: TRUSS method, sales-motion router, evidence hierarchy, baseline.

Pre-work:

- self-assessment by beam
- classify ten short customer situations
- submit one recent win and one frustrating loss

Live:

- compare pressure selling with decision-quality selling
- route mixed scenarios
- identify the earliest weak beam in sample calls

Field target:

- classify every meaningful opportunity by motion and stage
- record one assumption that became a verified fact or remained unknown

Measure: routing accuracy and data completion.

## Week 2: Trust and Relate

Focus: first impression, permission, buyer state, relevance, matched proof.

Pre-work:

- audit one opening, appointment message, or outreach touch
- collect three approved proof items and identify what each proves

Live:

- practice urgent, skeptical, and commercial openings
- match proof to buyer uncertainty
- remove fake rapport and unsupported claims

Field target:

- use an explicit visit or meeting roadmap
- record the buyer's priority in their words

Measure: Trust and Relate rubric, booking or meeting progression, complaint signals.

## Week 3: Understand

Focus: situation, problem, implication, outcome, decision, and constraint questions.

Pre-work:

- annotate a call or opportunity for missing discovery families
- write six questions that would change the recommendation

Live:

- turn checklist questions into a natural conversation
- distinguish proportional implication from fear inflation
- practice summaries and correction

Field target:

- deliver a customer-confirmed summary before proposing
- capture the decision process on qualified opportunities

Measure: discovery coverage, summary accuracy, unsupported assumption rate.

## Week 4: Solve

Focus: technical fit, value translation, option integrity, recommendation.

Pre-work:

- bring one real proposal with scope, assumptions, and exclusions
- map each feature to a buyer outcome and proof

Live:

- repair weak option menus
- compare a recommendation with a capability dump
- practice explaining residual risk and total cost

Field target:

- connect each material recommendation to a verified priority
- state at least one meaningful exclusion or limitation clearly

Measure: option validity, recommendation alignment, revision and cancellation signals.

## Week 5: Secure

Focus: ACORN objection diagnosis, decision clarity, direct next steps, follow-up.

Pre-work:

- submit three objections with what they actually meant
- identify one opportunity stalled without a buyer-owned next step

Live:

- practice price, comparison, stakeholder, timing, and incumbent objections
- distinguish commitment from pressure
- build value-adding follow-up

Field target:

- clarify before answering every material objection
- confirm owner, action, timing, and purpose for next steps

Measure: objection clarification, reciprocal next-step rate, stage progression.

## Week 6: Campaigns and prospecting

Focus: audience, trigger, relevance, proof, channel, compliance, CTA.

Pre-work:

- define one segment and one reason now
- bring an existing email, text, door pitch, or call opening

Live:

- map a sequence to TRUSS
- rewrite generic outreach
- define one-variable A/B tests and stop conditions

Field target:

- launch or simulate one compliant micro-campaign
- tag responses by actual disposition

Measure: contact, qualified response, appointment, opt-out, complaint, gross profit.

## Week 7: Accounts, commercial pursuits, and markets

Focus: account facts, stakeholders, stage evidence, go/no-go, market signals.

Pre-work:

- build a one-page account brief
- score one opportunity's evidence and one pursuit's fit

Live:

- expose single-thread and optimism risk
- translate technical capability to business outcomes
- prioritize account actions by impact, confidence, and urgency

Field target:

- add one verified stakeholder and one buyer-owned next step
- deliberately disqualify or re-stage one unsupported opportunity

Measure: stakeholder breadth, stage evidence, qualified pipeline, pursuit quality.

## Week 8: Capstone and operating rhythm

Focus: full-cycle simulation, metrics, personal coaching plan.

Pre-work:

- repeat Week 1 self-assessment
- prepare one field case with outcome and quality data

Live:

- complete a context-specific capstone
- calibrate scores across peers and managers
- build a 30-day improvement plan

Field target:

- continue one behavior metric and one outcome metric for 30 days

Measure: pre/post beam score, critical-error rate, field adoption, quality-adjusted results.

## Certification

Certification requires:

- at least 80 percent routing accuracy
- no critical violation in the final two simulations
- at least 75 of 100 on the context-adjusted TRUSS rubric
- demonstration of one successful field behavior change
- accurate use of evidence, limitations, and next steps

Certification is a TRUSS learning credential, not proof of technical licensure, legal compliance, or job fitness.

## Manager rhythm

Managers review one interaction and one metric pattern per seller each week. Coaching ends with one behavior, one practice, one field target, and one date to review evidence. Team meetings use anonymized calibration cases to improve scoring consistency.



---

<!-- SOURCE FILE: docs/07_implementation/ingestion_retrieval_and_versioning.md -->


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



---

<!-- SOURCE FILE: docs/07_implementation/prompt_and_output_contracts.md -->


# Prompt and Output Contracts

## Shared developer rules

```text
You are TRUSS, a sales intelligence system for the trades.

Classify the sales motion before advising. Apply Trust, Relate, Understand, Solve, and Secure. Diagnose the earliest weak beam that caused the issue. Use customer decision quality, technical accuracy, ethical conduct, margin, and delivery quality alongside revenue.

Separate verified facts, user statements, inference, and unknowns. Do not invent hazards, code requirements, insurance outcomes, savings, scarcity, competitor claims, customer facts, pricing, or company capability. Ask for missing evidence when it could change the recommendation.

Use natural language, not a rigid script. Explain why advice fits this context. Offer the smallest useful next action. Respect a clear refusal. Flag jurisdiction-specific legal, financing, licensing, safety, or technical issues for verified review.

When using retrieved sources, preserve material scope, population, date, and limitations. Never present a benchmark as a universal target.
```

## Context classification output

```json
{
  "primary_motion": "urgent_service",
  "secondary_motion": "technician_led",
  "confidence": 0.86,
  "buyer_type": "homeowner",
  "trade": "hvac",
  "stage": "inspection",
  "risk_flags": ["safety_claim_requires_evidence"],
  "missing_context": ["verified_readings"],
  "assumptions": []
}
```

## Coach output

```json
{
  "context": {},
  "primary_beam": "understand",
  "diagnosis": "string",
  "evidence": [{"source": "transcript", "observation": "string"}],
  "keep": "string",
  "change": "string",
  "example_language": ["string"],
  "next_action": {"action": "string", "owner": "rep", "timing": "string"},
  "practice_target": "string",
  "measurement": "string",
  "guardrail": "string or null"
}
```

## Practice output after roleplay

```json
{
  "outcome": "won|next_step|pause|declined|no_go",
  "buyer_reason": "string",
  "beam_scores": {"trust": 0, "relate": 0, "understand": 0, "solve": 0, "secure": 0},
  "weighted_score": 0,
  "critical_violation": null,
  "critical_moment": {"quote_or_turn": "string", "why": "string"},
  "stronger_response": "string",
  "repeat": "string",
  "change": "string",
  "replay_from": "string"
}
```

## Campaign output

```json
{
  "hypothesis": "string",
  "audience": {},
  "exclusions": [],
  "trigger": {"fact": "string", "source_id": "string or null", "confidence": 0.0},
  "offer": "string",
  "approved_proof": [],
  "message_map": {"trust": "string", "relate": "string", "understand": "string", "solve": "string", "secure": "string"},
  "sequence": [],
  "compliance_review": [],
  "measurement_plan": [],
  "stop_conditions": [],
  "ab_test": {"variable": "string", "variants": []}
}
```

## Account Review output

```json
{
  "account_summary": {"facts": [], "inferences": []},
  "health": [],
  "stakeholders": [],
  "opportunity_audit": [],
  "expansion_hypotheses": [],
  "top_actions": [{"priority": 1, "owner": "string", "due": "date", "expected_evidence": "string"}],
  "data_quality": {"missing": [], "stale": [], "contradictory": []}
}
```

## Market Research output

```json
{
  "market_definition": {},
  "executive_finding": "string",
  "evidence": [],
  "segments": [],
  "competitors": [],
  "triggers": [],
  "tam_sam_som": {"formulas": [], "ranges": [], "assumptions": []},
  "risks": [],
  "validation_tests": [],
  "sources": []
}
```

## Refusal and uncertainty patterns

TRUSS should say what it can do next:

- `I cannot verify a code violation from that description. Capture the adopted code, panel condition, and measurements before using code in the recommendation.`
- `A storm record supports that hail occurred in the area. It does not establish damage to this roof or insurance coverage. Use it only as a reason to offer a factual inspection.`
- `The benchmark uses a different denominator from your close rate. I can normalize both if you provide counts for qualified leads, proposals, and decisions.`
- `I can help compare the financing disclosures, but I cannot choose a credit product for the customer or hide the cash price.`

## Style

Be experienced, practical, direct, calm, and specific. Explain the principle, then make it usable. Avoid academic padding, chest-thumping, gimmicks, canned closes, and faux empathy.



---

<!-- SOURCE FILE: docs/07_implementation/retrieval_queries_and_routing_examples.md -->


# Retrieval and routing examples

## Retrieval sequence

1. Classify mode, buyer, trade, motion, stage, and channel.
2. Detect high-sensitivity topics such as safety, code, insurance, financing, legal terms, consent, or market claims.
3. Retrieve the governing mode contract and TRUSS method first.
4. Retrieve the matching trade and motion doctrine.
5. Retrieve no more supporting knowledge units than the answer needs.
6. For factual claims, retrieve source records and preserve date, population, and limitations.
7. If inputs are incomplete, ask, label unknowns, or decline the requested conclusion.

## Example filters

| User request | Primary filters | Required companion material |
|---|---|---|
| Coach this no-cool call | coach, HVAC, urgent service, observed stage | rubric, HVAC proof rules, critical violations |
| Practice a roof inspection after hail | practice, roofing, canvassing and storm | scenario, insurance guardrail, local policy |
| Create a maintenance renewal campaign | campaign creation, recurring service | campaign pattern, approved terms, consent policy |
| Review a mechanical service account | account review, commercial service | stakeholder model, renewal metrics, service record |
| Research electrical growth in a county | market research, electrical, territory | public datasets, signal scoring, capacity facts |

## Conflict resolution

When retrieved units conflict, prefer the unit with the more specific context, stronger evidence, current review date, and stricter safety boundary. Do not silently blend incompatible advice. State the difference and route unresolved technical, legal, or policy questions to the proper owner.

## Retrieval anti-patterns

- Retrieve every objection script for a single coaching question.
- Treat a source title or excerpt as permission to ingest the entire work.
- Mix national labor growth with local consumer demand.
- Use a residential close-rate benchmark for a commercial hard-bid pursuit.
- Let a result metric override a documented critical violation.
- Surface internal scenario hidden facts to the learner during practice.

## Missing-context response

Use this structure when the system cannot safely complete the task:

1. State what can be concluded.
2. List the missing inputs that could change the answer.
3. Explain why each matters.
4. Offer the smallest safe next action.

Example: an official hail event confirms weather in the area. It does not confirm damage to a particular property. The next valid step is an evidence-based inspection, subject to local solicitation and safety policy.



---

<!-- SOURCE FILE: docs/08_research/master_synthesis.md -->


# TRUSS Trades Sales Intelligence Synthesis

## Executive conclusion

The strongest sales system for the trades is not a universal close. It is a context-sensitive method that reduces buyer uncertainty while protecting technical accuracy, margin, operational feasibility, and trust.

The evidence supports six architecture decisions:

1. Classify the sales motion before coaching.
2. Treat the entire demand-to-delivery chain as the sales system.
3. Diagnose before recommending.
4. Use proof matched to the buyer's uncertainty.
5. Measure quality-adjusted outcomes, not close rate alone.
6. Store changing knowledge in retrieval and test behavior with evals.

## Trades sales is multiple disciplines

The phrase `trades sales` hides materially different buyer jobs. A homeowner without cooling is managing stress and immediate function. A household replacing a working 18-year-old system is comparing long-term outcomes. A remodeling buyer is defining an uncertain project. A technician who notices an adjacent condition must earn permission before recommending unrequested work. A storm canvasser must establish identity and inspection facts without implying damage or insurance coverage. A facility leader is balancing uptime and budget. A general contractor is assessing whether a specialty contractor can execute safely, on schedule, and within commercial terms.

These situations require different pacing, proof, metrics, and acceptable commitments. They share the TRUSS method, but they should not share one script.

## Trust is operational, not cosmetic

Customer trust is influenced before the selling conversation. Response time, booking clarity, arrival communication, field presentation, documentation, review profile, proposal quality, and follow-through all carry information about execution risk.

Public consumer guidance provides a useful reverse view of the sale. The FTC advises homeowners to verify credentials, obtain multiple written estimates, read contracts, avoid full payment up front, and be cautious of contractors who use pressure or demand immediate decisions.[^S013] This means a credible seller should make verification easy, provide clear written scope, state payment and cancellation terms, and avoid behaviors associated with scams.

Online reputation matters, but its role should be defined carefully. BrightLocal's 2025 and 2026 consumer studies show that buyers use reviews across multiple channels and pay attention to authenticity, content, recency, and business responses.[^S005][S006] Reviews support general reputation. They do not prove a specific diagnosis, equipment design, storm cause, code violation, or savings claim.

The practical rule is simple: proof must match the claim. Technical conditions require measurements, images, tests, standards, or professional findings. Execution capacity requires relevant projects, people, process, credentials, and references. Commercial reliability requires performance, safety, reporting, and handoff evidence.

## Discovery creates decision quality

The research base for SPIN was developed from observation of more than 35,000 sales calls. Its situation, problem, implication, and need-payoff logic remains useful for complex discovery when adapted to context.[^S021] TRUSS extends this with explicit decision and constraint questions because trades decisions often involve absent household members, property managers, procurement, financing, shutdown windows, or operational limits.

The value of a question is not that it appears in a script. A question should change the diagnosis, recommendation, implementation, or next step. Strong representatives distribute relevant questions through the conversation, listen for buyer language, and confirm a summary before proposing. Gong's analysis of 519,291 discovery conversations found that successful calls tended to examine a limited number of problems in depth and distribute questions rather than front-loading an interrogation.[^S022] That dataset reflects recorded B2B web calls, so its exact counts and talk ratios are not universal targets for an in-home service visit. The behavioral implication is more durable: focused, responsive discovery is better than checklist completion.

Implication questions require an ethical boundary. The seller may help the buyer understand a plausible consequence supported by evidence. The seller may not inflate a catastrophic outcome to manufacture urgency. If the representative cannot support the claimed consequence, TRUSS should ask for evidence or recommend neutral verification.

## Options should simplify a real decision

Options can help buyers see tradeoffs, but more choice is not automatically better. A meta-analysis of 99 observations with 7,202 participants found that the effects commonly described as choice overload depend on choice complexity, task difficulty, preference uncertainty, and decision goal.[^S024] TRUSS should therefore avoid a rigid requirement that every proposal include exactly three options.

Use options when they are materially different and decision-ready. A sound option explains:

- what it solves
- what it does not solve
- expected outcome and lifespan basis
- scope and exclusions
- schedule and disruption
- warranty and responsibility
- total price and financing context
- remaining risk

The seller should recommend one path and connect it to priorities the buyer actually stated. A fake premium anchor, unsafe low-cost choice, hidden exclusion, or repair portrayed as equivalent to replacement does not qualify as customer choice.

HVAC provides a clear example of matched proof. ENERGY STAR advises that equipment selection should consider home characteristics, and its bid comparison material references load calculations, matched system documentation, duct evaluation, airflow, refrigerant charge, commissioning, written model information, warranty, and price comparison.[^S010][S011][S012] The lesson is not that every sales representative should perform engineering work. It is that technical confidence should come from the right evidence and qualified roles, not rules of thumb.

## Objections are diagnostic data

`Price is too high` can mean the customer expected a lower range, lacks cash, dislikes the financing structure, sees a different scope, does not trust the diagnosis, has an absent decision maker, or is politely declining. A rebuttal delivered before clarification can answer the wrong objection and reduce trust.

TRUSS uses Acknowledge, Clarify, Observe, Respond, Next step. This sequence is consistent with the broader research direction toward customer orientation and adaptive selling. A meta-analysis of customer-oriented selling found it to be an important predictor of salesperson performance, while a separate meta-analysis examined adaptive and customer-oriented selling together.[^S025][S026] These studies are not trade-specific and should not be treated as proof of a particular phrase. They support the principle that the seller should fit behavior to the customer rather than force the customer through a fixed pitch.

The cleanest close is informed commitment. It may be a signed job, but it may also be an inspection, stakeholder meeting, paid design phase, site walk, proposal review, pilot, deliberate pause, or no-go.

## Front office conversion is part of selling

Service businesses can lose demand before a technician is dispatched. ServiceTitan reported a 42 percent average call booking rate in its cited June 2022 platform dataset.[^S001] The number is old and platform-specific, so it is not a universal target. It demonstrates why qualified-call booking, response time, appointment clarity, and show rate belong in sales diagnosis.

Current industry surveys reinforce the need to measure response and quoting behavior while keeping caveats visible. Jobber's 2026 report used a survey of 1,050 U.S. home-service owners conducted in December 2025 and aggregated platform data. It reported that 60 percent responded to leads the same day, 20 percent within an hour, 69 percent said they won more than half their quotes, and 36 percent reported win rates above 70 percent.[^S017] The figures are self-reported, cross-trade, and affected by business maturity and quote mix. TRUSS should use them as context, not as targets.

The correct diagnostic sequence starts with lead quality and definitions, then contact, booking, appointment, conversation, proposal, decision, and delivery. Coaching a field seller for a call-center leak is inaccurate. Celebrating a high close rate created by over-discounting, narrow options, or bad qualification is equally misleading.

## Residential demand is shaped by aging assets and constrained decisions

Census American Housing Survey data offer useful grounding. The 2021 AHS reported a median age of 41 years for owner-occupied homes. Among homes built before 1950, 61 percent of owners undertook a home improvement project between 2019 and 2021, and common work included plumbing fixtures, water heaters, roofs, windows, doors, and exterior and land improvements.[^S034] A separate Census summary reported that 59 percent of homeowners made improvements and gave median spending examples across HVAC, kitchens, bathrooms, and windows or doors.[^S035]

These data support market segmentation around housing age, ownership duration, condition, and project type. They do not identify a specific homeowner as ready to buy. TRUSS should use aggregate data to select markets and create testable outreach hypotheses, never to imply knowledge of a property's condition.

Housecall Pro's 2026 homeowner survey reported that many owners were staying in place, aging homes were common in its sample, and payment plans increased stated likelihood to proceed for 62 percent of respondents.[^S019] The vendor and survey population should be visible whenever the number is used. The sales lesson is to discuss affordability transparently and offer approved options, not to hide cash price or financing cost.

## Financing is a trust test

Financing can convert a technical need into a feasible decision, but it can also create harm when total cost or fees are obscured. The CFPB reported in a 2024 solar-financing issue spotlight that some lenders included markups and fees that could raise loan principal by 30 percent or more above cash price, often without clearly identifying the markup.[^S029] TRUSS should use this as a high-sensitivity guardrail for all financed home improvements, even though the specific evidence concerns solar.

The AI should not select a credit product for a customer, interpret a lender contract as legal advice, or coach a representative to sell only the monthly payment. It should prompt for cash price, financed amount, term, APR and required disclosures, fees, promotional conditions, and qualified review.

## Compliance must be retrieved by jurisdiction and channel

The FTC Cooling-Off Rule gives consumers three days to cancel certain sales made at home or other covered locations.[^S014] State laws can add different home-solicitation, contractor, insurance, cancellation, or financing requirements. The federal rule is a baseline, not a complete state answer.

Commercial email is governed by CAN-SPAM requirements including accurate headers and subject lines and a functioning opt-out path.[^S027] Calls and texts require a technology-, purpose-, consent-, and jurisdiction-specific review under the TCPA and state law. FCC guidance states that commercial texts require written consent in the circumstances it describes and emphasizes the consumer's ability to revoke consent.[^S028] TRUSS should produce a compliance checklist and request review, not declare a campaign lawful from a few fields.

Renovation work can create additional triggers. EPA states that its Renovation, Repair and Painting Rule applies to firms disturbing painted surfaces in covered pre-1978 homes and child-occupied facilities and includes certification, training, work-practice, and pre-renovation education requirements.[^S015][S016] A salesperson should know when to pause and verify, but the AI should not substitute for qualified technical or legal judgment.

## Commercial selling is risk and consensus management

Commercial buying is nonlinear. Gartner describes B2B buyers as revisiting problem identification, solution exploration, requirements building, and supplier selection across digital and human interactions.[^S020] Its 2025 press release reported that 74 percent of the 632 B2B buyers surveyed described unhealthy conflict in their buying teams, and teams reaching consensus were more likely to report a high-quality decision.[^S023]

For commercial trades, the sales representative must help stakeholders use a shared definition of the problem, evidence, evaluation criteria, risk, and next step. The facility leader, procurement manager, finance approver, safety leader, project manager, and field operations team can support the same supplier for different reasons.

Construction business development also starts earlier than the bid. AGC materials frame business development as an organization-wide discipline, while Procore describes early opportunity tracking, qualification, go or no-go choices, preconstruction coordination, and handoff.[^S007][S008] SMPS research describes both dedicated business developers and technical seller-doers in AEC firms.[^S009] TRUSS should support a shared model: relationship owners create access and continuity, while technical and operational experts validate and shape executable work.

A commercial pipeline stage should reflect buyer evidence. An email sent is activity. A buyer-confirmed need, stakeholder meeting, site access, provided data, shortlist notice, or negotiated next step is progress.

## Market research should lead to a validation decision

The best public market stack combines multiple data types:

- Census ACS and AHS for population, housing, ownership, age, condition, and improvements[^S034][S036]
- Census Building Permits Survey for local new residential authorizations[^S037]
- Census Value of Construction Put in Place for private and public construction spending[^S038]
- Census County Business Patterns and Nonemployer Statistics for business counts and industry structure
- BLS OEWS, QCEW, and Occupational Outlook Handbook for labor supply, wages, and projections[^S044][S045][S046]
- EIA RECS and CBECS for residential and commercial energy characteristics[^S039]
- NOAA NCEI Storm Events for event history[^S047]
- OpenFEMA for official disaster declarations[^S048]
- licensing boards, procurement portals, capital plans, permits, planning agendas, company sites, and verified local search for account and competitor evidence

These sources answer different questions. Storm history does not prove roof damage. Building permits do not equal service demand. Employment growth does not equal available labor in a specific county. TRUSS should combine them into a bounded hypothesis, show uncertainty, and recommend a field validation.

Current BLS projections illustrate why date and role matter. The September 2026 Occupational Outlook Handbook projects 2025 to 2035 employment growth of 11 percent for HVAC mechanics and installers, 9 percent for electricians, 7 percent for plumbers, pipefitters, and steamfitters, and 37 percent for solar photovoltaic installers.[^S044][S045][S046][S049] These national labor projections are useful for strategic context. They are not territory demand forecasts.

## Practitioner knowledge is useful with boundaries

Books and long-form methods contribute concepts, language, and drills:

- *SPIN Selling* supports disciplined discovery for complex decisions.
- *The Challenger Sale* supports relevant commercial insight and constructive direction, but can be harmful when translated into aggressive residential pressure.
- Joe Crisara's *What Should We Do?* contributes customer-centered options thinking for home service.
- Drew Cameron's HVAC work contributes comfort and outcome language.
- Michael Stone's contractor pricing work supports margin literacy.
- Chris Voss's negotiation work contributes labels, mirrors, and calibrated questions when used truthfully.
- Jeb Blount's prospecting work contributes activity discipline, which TRUSS must constrain with ideal-customer fit, consent, and channel rules.

Podcasts and video make scenarios feel authentic. Priority sources include Service MVP, The Home Service Expert, To The Point, Service Business Mastery, Waste No Day, The Contractor Fight, Contractor Growth Network, Hook Agency, Roofing Insights, HVAC School, AGC, and SMPS. Episode claims require individual review. Transcripts and paid material should not be ingested without rights.

Practitioner content should answer `how might a strong seller say or practice this?` It should not decide legal, technical, safety, or universal performance claims.

## Metrics must protect the business and buyer

TRUSS should measure the chain:

1. Demand: lead volume, source, cost, target-account coverage
2. Contact: speed, contact, booking, cancellation
3. Appointment: show, run, decision-maker participation
4. Conversation: Trust, Relate, Understand, Solve, Secure behaviors
5. Proposal: proposal rate, option validity, cycle time, revisions
6. Outcome: close or win, revenue per lead, ticket, expected margin
7. Quality: cancellation, financing fallout, callback, rework, complaint, promise variance
8. Relationship: repeat, renewal, referral, expansion
9. Commercial pursuit: go/no-go, shortlist, hit rate, estimate cost, backlog quality

The system should diagnose the earliest causal leak. A high close rate paired with high cancellations and low realized margin is a warning. A lower close rate after deliberate disqualification may be improvement. A technician who identifies no additional need after a sound inspection should not be scored as a missed opportunity.

## Coaching should change one behavior at a time

The purpose of coaching is behavior change, not information delivery. A strong coaching response identifies the sales context, uses evidence from the interaction, finds the earliest weak beam, preserves one strength, changes one behavior, supplies natural example language, and defines a field target.

Practice should include realistic losses and no-go decisions. If every scenario is designed to close, the model will learn pressure and hallucination. At least one-fifth of the evaluation library should reward verifying, slowing down, referring, or declining.

## AI implementation

OpenAI recommends using prompt engineering, retrieval, and model optimization as different levers based on whether the failure is missing context or inconsistent behavior.[^S040] File search supports retrieval across uploaded vector-store content.[^S041] Production prompts should be versioned in application code with typed inputs, tests, and staged rollout.[^S042]

The immediate TRUSS architecture should be:

- code-managed mode instructions
- context router
- source-tagged retrieval units
- tenant-isolated company knowledge
- structured output contracts
- evaluation cases for correctness and harmful behavior
- production feedback that becomes reviewed eval data

Fine-tuning should not be the knowledge store. OpenAI's current supervised fine-tuning page says the platform is winding down for new users and stresses evals before tuning.[^S043] The repository therefore remains model-portable and retrieval-first.

## Highest-value next research

Public content can define a strong baseline, but it cannot reveal what works for TRUSS customers in their exact markets. The next collection priorities are:

1. Permissioned calls linked to lead source, trade, motion, ticket, outcome, margin, cancellation, callback, complaint, and review.
2. Buyer interviews about why they selected, delayed, or rejected a provider.
3. Estimator and operations interviews to identify promises that cause margin loss or rework.
4. State-level contractor, solicitation, insurance, financing, recording, and cancellation rules reviewed by qualified counsel.
5. Controlled tests of option count, order, proof, follow-up, and channel sequence.
6. Matched benchmark cohorts by trade, motion, geography, season, seller tenure, and service mix.

## Sources

[^S001]: ServiceTitan. [Data Report: Average Call Booking Rates](https://www.servicetitan.com/blog/data-call-booking-rates). 2022.
[^S005]: BrightLocal. [Local Consumer Review Survey 2025](https://www.brightlocal.com/research/local-consumer-review-survey-2025/). 2025.
[^S006]: BrightLocal. [Local Consumer Review Survey 2026](https://www.brightlocal.com/research/local-consumer-review-survey/). 2026.
[^S007]: Associated General Contractors of America. [Business Development Best Practices](https://www.agc.org/connect/agc-groups/business-development/business-development-best-practices). Accessed September 2026.
[^S008]: Procore. [Construction Business Development](https://www.procore.com/library/construction-business-development). 2025.
[^S009]: SMPS Foundation. [Sell. Do. Win Business](https://www.smps.org/wp-content/uploads/2023/04/Sell-Do-Win-Business-The-Report-2019-v1a.pdf). 2019.
[^S010]: ENERGY STAR. [HVAC Quality Installation](https://www.energystar.gov/saveathome/heating-cooling/hvac-quality-installation). Accessed September 2026.
[^S011]: ENERGY STAR. [Heating & Air Conditioning Installation Bid Comparison Checklist](https://www.energystar.gov/ia/products/heat_cool/HVAC_QI_bidsheet.pdf). Accessed September 2026.
[^S012]: ENERGY STAR. [10 Tips for Hiring a Heating and Cooling Contractor](https://www.energystar.gov/saveathome/heating-cooling/10-tips-hiring). Accessed September 2026.
[^S013]: Federal Trade Commission. [How To Avoid a Home Improvement Scam](https://consumer.ftc.gov/articles/how-avoid-home-improvement-scam). Accessed September 2026.
[^S014]: Federal Trade Commission. [Buyer's Remorse: The FTC's Cooling-Off Rule May Help](https://consumer.ftc.gov/articles/buyers-remorse-ftcs-cooling-rule-may-help). Accessed September 2026.
[^S015]: Environmental Protection Agency. [Lead Renovation, Repair and Painting Program](https://www.epa.gov/lead/lead-renovation-repair-and-painting-program). Updated 2026.
[^S016]: Environmental Protection Agency. [RRP Program: Contractors](https://www.epa.gov/lead/renovation-repair-and-painting-program-contractors). Updated 2026.
[^S017]: Jobber. [2026 Home Service Trends Report](https://www.getjobber.com/home-service-trends-report/). 2026.
[^S019]: Housecall Pro. [2026 State of Home Services Spending](https://www.housecallpro.com/resources/home-service-spending-report/). 2026.
[^S020]: Gartner. [B2B Buying Journey](https://www.gartner.com/en/sales/insights/b2b-buying-journey). Accessed September 2026.
[^S021]: Huthwaite International. [The SPIN Methodology](https://www.huthwaiteinternational.com/spin-methodology). Accessed September 2026.
[^S022]: Gong. [Discovery Call Research](https://www.gong.io/blog/nailing-your-sales-discovery-calls). Analysis of 519,291 recorded calls, published 2017.
[^S023]: Gartner. [Sales Survey Finds 74% of B2B Buyer Teams Demonstrate Unhealthy Conflict](https://www.gartner.com/en/newsroom/press-releases/2025-05-07-gartner-sales-survey-finds-74-percent-of-b2b-buyer-teams-demonstrate-unhealthy-conflict-during-the-decision-process). May 7, 2025.
[^S024]: Alexander Chernev, Ulf Böckenholt, and Joseph Goodman. [Choice Overload: A Conceptual Review and Meta-analysis](https://doi.org/10.1016/j.jcps.2014.08.002). Journal of Consumer Psychology 25(2), 2015.
[^S025]: Fernando Jaramillo, Daniel Ladik, and Greg Marshall. [A Meta-analysis of the Relationship Between Sales Orientation-Customer Orientation and Salesperson Job Performance](https://doi.org/10.1108/08858620710773431). Journal of Business & Industrial Marketing 22(5), 2007.
[^S026]: George Franke and Jeong-Eun Park. [Salesperson Adaptive Selling Behavior and Customer Orientation: A Meta-analysis](https://doi.org/10.1509/jmkr.43.4.693). Journal of Marketing Research 43(4), 2006.
[^S027]: Federal Trade Commission. [CAN-SPAM Act: A Compliance Guide for Business](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business). Updated 2023.
[^S028]: Federal Communications Commission. [Stop Unwanted Robocalls and Texts](https://www.fcc.gov/consumers/guides/stop-unwanted-robocalls-and-texts). Updated 2026.
[^S029]: Consumer Financial Protection Bureau. [Issue Spotlight: Solar Financing](https://www.consumerfinance.gov/data-research/research-reports/issue-spotlight-solar-financing/). August 7, 2024.
[^S030]: Occupational Safety and Health Administration. [Recommended Practices for Safety and Health Programs](https://www.osha.gov/safety-management). Accessed September 2026.
[^S031]: Occupational Safety and Health Administration. [Communication and Coordination for Host Employers, Contractors, and Staffing Agencies](https://www.osha.gov/safety-management/communication). Accessed September 2026.
[^S032]: Environmental Protection Agency. [Lawn and Garden](https://www.epa.gov/safepestcontrol/lawn-and-garden). Updated 2026.
[^S033]: Environmental Protection Agency. [Pest Control: Resources for Housing Managers](https://www.epa.gov/safepestcontrol/pest-control-resources-housing-managers). Updated 2026.
[^S034]: U.S. Census Bureau. [Cost of Improving and Maintaining Older Homes Higher for New Owners](https://www.census.gov/library/stories/2023/10/older-home-costs.html). October 12, 2023.
[^S035]: U.S. Census Bureau. [From Size of Homes to Rental Costs, Census Data Provide Economy-wide Picture](https://www.census.gov/library/stories/2023/06/owning-or-renting-the-american-dream.html). June 29, 2023.
[^S036]: U.S. Census Bureau and HUD. [American Housing Survey](https://www.census.gov/programs-surveys/ahs.html). Accessed September 2026.
[^S037]: U.S. Census Bureau. [Building Permits Survey](https://www.census.gov/construction/bps/). Accessed September 2026.
[^S038]: U.S. Census Bureau. [Construction Spending](https://www.census.gov/construction/c30/c30index.html). Accessed September 2026.
[^S039]: U.S. Energy Information Administration. [Commercial Buildings Energy Consumption Survey](https://www.eia.gov/consumption/commercial/). Accessed September 2026.
[^S040]: OpenAI. [Optimizing LLM Accuracy](https://developers.openai.com/api/docs/guides/optimizing-llm-accuracy). Accessed September 2026.
[^S041]: OpenAI. [File Search](https://developers.openai.com/api/docs/guides/tools-file-search). Accessed September 2026.
[^S042]: OpenAI. [Prompt Engineering](https://developers.openai.com/api/docs/guides/prompt-engineering). Accessed September 2026.
[^S043]: OpenAI. [Supervised Fine-tuning](https://developers.openai.com/api/docs/guides/supervised-fine-tuning). Accessed September 2026.
[^S044]: U.S. Bureau of Labor Statistics. [Heating, Air Conditioning, and Refrigeration Mechanics and Installers](https://www.bls.gov/ooh/installation-maintenance-and-repair/heating-air-conditioning-and-refrigeration-mechanics-and-installers.htm). September 2026 edition.
[^S045]: U.S. Bureau of Labor Statistics. [Electricians](https://www.bls.gov/ooh/construction-and-extraction/electricians.htm). September 2026 edition.
[^S046]: U.S. Bureau of Labor Statistics. [Plumbers, Pipefitters, and Steamfitters](https://www.bls.gov/ooh/construction-and-extraction/plumbers-pipefitters-and-steamfitters.htm). September 2026 edition.
[^S047]: NOAA National Centers for Environmental Information. [Severe Weather and Storm Events Database](https://www.ncei.noaa.gov/products/severe-weather). Accessed September 2026.
[^S048]: Federal Emergency Management Agency. [Disaster Declarations Summaries v2](https://www.fema.gov/openfema-data-page/disaster-declarations-summaries-v2). Accessed September 2026.
[^S049]: U.S. Bureau of Labor Statistics. [Solar Photovoltaic Installers](https://www.bls.gov/ooh/construction-and-extraction/solar-photovoltaic-installers.htm). September 2026 edition.



---

<!-- SOURCE FILE: docs/08_research/practitioner_and_platform_ingestion_queue.md -->


# Practitioner and platform ingestion queue

This queue identifies material worth reviewing as TRUSS expands. Inclusion is not endorsement, permission to reproduce, or proof that every claim is correct. Books, courses, podcasts, and videos should produce original, atomic summaries after rights and evidence review. Full text or transcripts should be ingested only with permission.

## Priority 1: operating and technical foundations

- ServiceTitan's KPI and field-service metric articles provide candidate definitions for close rate, revenue per lead, utilization, callback, and operational measures. Use them to compare definitions, not to import a universal benchmark.[^S002][^S003]
- Modernize and Housecall Pro survey material can inform homeowner trust, communication, selection, repeat, and referral hypotheses. Preserve sample, sponsor, date, and question wording whenever a number is used.[^S004][^S018]
- HVAC School provides a technical learning path that can help reviewers distinguish technical evidence from sales assertion. It is not itself a sales methodology, and episode rights vary.[^S064]
- Markup and Profit can improve margin and pricing literacy, subject to accounting definitions and local economics.[^S053]
- GAO's subcontractor report supplies a narrow public-procurement view of subcontractor selection and oversight. Its federal context and age must remain visible.[^S068]

## Priority 2: trade sales patterns to test

- What Should We Do and Selling HVAC Comfort Solutions offer practitioner approaches to customer-centered options, comfort discovery, and field language. Extract behaviors as hypotheses, test them against TRUSS, and obtain permission before ingesting protected text.[^S050][^S051]
- Service MVP, The Home Service Expert, To The Point, Service Business Mastery, Waste No Day, The Contractor Fight, Contractor Growth Network, and Hook Agency provide a large scenario pool for call handling, objections, options, follow-up, management, and roleplay. Review at the episode level because guest claims, promotional incentives, and evidence quality differ.[^S056][^S057][^S058][^S059][^S060][^S061][^S062][^S063]
- Roofing Insights can generate canvassing, inspection, and business-development scenarios. Insurance, legal, technical, and performance claims require independent verification.[^S065]
- Qualified Remodeler's sales-presentation article provides practitioner funnel arithmetic and process ideas. Treat the examples as cases rather than general benchmarks.[^S066]
- ServiceTitan's commercial contract material supplies account renewal, expansion, and agreement-management hypotheses. Validate definitions against TRUSS data.[^S067]

## Priority 3: general selling methods requiring adaptation

- Never Split the Difference contributes listening labels, mirrors, and calibrated questions. Retain only uses that increase understanding and buyer agency. Reject theatrical or manipulative deployment.[^S054]
- Fanatical Prospecting contributes activity planning and channel-mix discipline. Add ideal-customer-profile, capacity, consent, suppression, and jurisdiction controls before use.[^S055]
- Home Service Millionaire contributes call-handling systems and management accountability. Separate scalable operating routines from personality-led advice and claims lacking comparable data.[^S052]

## Priority 4: buyer and trade-publication evidence refresh

- ArcSite's 2022 homeowner report can contribute dated research, budgeting, and contractor-evaluation signals, but it is an older vendor-sponsored survey.[^S069]
- Roofing Contractor's 2025 homeowner survey can contribute roofing referral and review signals after its sample and methodology are checked.[^S070]

## Episode and chapter review record

For each selected item, capture:

1. exact episode, chapter, or page URL;
2. publication date, speaker, role, and commercial relationship;
3. the smallest useful claim or behavior in original words;
4. evidence grade and corroborating or conflicting sources;
5. TRUSS beam, trade, motion, stage, buyer, and intended mode;
6. boundary conditions and prohibited use;
7. a scenario or eval that could disprove overgeneralization;
8. rights status and next review date.

## Acceptance threshold

A practitioner tactic enters core doctrine only when it is transparent, buyer-centered, context-specific, operationally deliverable, and consistent with verified technical and legal constraints. Popularity, charisma, or a revenue anecdote is not enough.

[^S002]: [ServiceTitan, HVAC Key Performance Indicators](https://www.servicetitan.com/blog/hvac-key-performance-indicators), vendor guidance.
[^S003]: [ServiceTitan, Field Service Metrics](https://www.servicetitan.com/blog/field-service-metrics), vendor guidance.
[^S004]: [Modernize, Homeowner Insights: Contractor Selection](https://modernize.com/homeowner-insights/2025-homeowner-insights-contractor-selection), 2025.
[^S018]: [Housecall Pro, 2025 Home Service Customer Service Report](https://www.housecallpro.com/resources/home-service-customer-service-report/), vendor survey.
[^S050]: [Joe Crisara, What Should We Do?](https://www.amazon.com/What-Should-We-Do-Extraordinary/dp/1736020602), book metadata.
[^S051]: [Drew Cameron, Selling HVAC Comfort Solutions](https://www.egia.org/store/selling-hvac-comfort-solutions), practitioner book metadata.
[^S052]: [Tommy Mello, Home Service Millionaire](https://homeservicemillionaire.com/book/), practitioner book metadata.
[^S053]: [Michael Stone, Markup and Profit](https://www.markupandprofit.com/), contractor economics resource.
[^S054]: [Chris Voss, Never Split the Difference](https://www.harpercollins.com/products/never-split-the-difference-chris-voss), publisher page.
[^S055]: [Jeb Blount, Fanatical Prospecting](https://jebblount.com/books/fanatical-prospecting/), author page.
[^S056]: [Service MVP, Sales Training Podcast](https://servicemvp.com/podcast), podcast index.
[^S057]: [Tommy Mello, The Home Service Expert](https://homeserviceexpert.com/podcast/), podcast index.
[^S058]: [RYNO Strategic Solutions, To The Point Home Services Podcast](https://rynoss.com/podcast/), podcast index.
[^S059]: [Service Business Mastery](https://www.servicebusinessmastery.com/podcast), podcast index.
[^S060]: [Waste No Day](https://wastenoday.com/), podcast site.
[^S061]: [The Contractor Fight](https://thecontractorfight.com/podcast/), podcast index.
[^S062]: [Contractor Growth Network](https://www.contractorgrowthnetwork.com/podcast), podcast index.
[^S063]: [Hook Agency, Home Service Sales Roleplays](https://www.youtube.com/@HookAgency), video channel.
[^S064]: [HVAC School](https://hvacrschool.com/), technical education library.
[^S065]: [Roofing Insights](https://www.youtube.com/@RoofingInsights), video channel.
[^S066]: [Qualified Remodeler, Developing Sales Presentations](https://www.qualifiedremodeler.com/yoho-developing-sales-presentations/), 2024.
[^S067]: [ServiceTitan, Commercial Service Contract Revenue](https://www.servicetitan.com/blog/commercial-service-maximize-profit), vendor guidance.
[^S068]: [U.S. Government Accountability Office, Insight into Subcontractor Selection Is Limited](https://www.gao.gov/products/gao-15-230), 2015.
[^S069]: [ArcSite, 2022 Homeowner Survey Report](https://1608094.fs1.hubspotusercontent-na1.net/hubfs/1608094/2022HomeownerSurvey.pdf), vendor-sponsored report.
[^S070]: [Roofing Contractor, 2025 Homeowner Roofing Survey](https://www.roofingcontractor.com/articles/100649-2025-homeowner-roofing-survey-tracking-the-journey), trade publication.

