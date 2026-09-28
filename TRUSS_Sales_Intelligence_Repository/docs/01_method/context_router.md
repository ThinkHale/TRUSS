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
