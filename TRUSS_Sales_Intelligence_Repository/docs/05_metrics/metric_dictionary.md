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
