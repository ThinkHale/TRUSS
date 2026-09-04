# The TRUSS methodology

TRUSS is a sales methodology for the trades. It exists because the frameworks reps are
usually handed were written for enterprise software sales — long cycles, procurement,
committees — and they do not survive contact with a homeowner's front door eleven days after
a hail storm.

Five stages, in order. A rep who is stuck is almost always stuck because they skipped one.

> **T**rust · **R**elate · **U**nderstand · **S**olve · **S**ecure

---

## T — Trust
*Earn the right to be standing there.*

A homeowner who has just had storm damage has already been approached by strangers, and may
have been warned about them. Before anything else, the rep has to be visibly legitimate,
local, and safe to talk to. Nothing else works until this does.

**Done when:** they know who you are and who you work for, they have seen proof, they know
they are not being pressured, and they know how long this will take.

**Most common failure:** leading with the pitch or a discount before establishing identity.

## R — Relate
*Connect as a person before a contractor.*

Storm damage is stressful, expensive, and disorienting. A rep who moves straight to
inspection treats the home as a job site. A rep who relates first is treated as an ally for
the rest of the process, including the hard parts of the claim.

**Done when:** you have acknowledged what they have been through, they have talked more than
you have, and you know who else weighs in on decisions.

**Most common failure:** racing to get on the roof, because the inspection feels like progress.

## U — Understand
*Diagnose the property, the claim, and the decision.*

This is where trades sales fails most often, and quietly. The rep inspects the roof but never
diagnoses the claim or the decision process, then loses the job weeks later to a deductible
surprise or a decision maker who was never in the room.

**Done when:** you have documented the damage *with* them, you know the carrier and the
deductible, you know where the claim stands and what happened on prior claims, and you know
what would stop this from moving forward.

**Most common failure:** avoiding the deductible conversation because it feels like an objection.

## S — Solve
*Make the complex simple and show the path forward.*

The homeowner is not buying a roof. They are buying a way out of a confusing, adversarial
process. The rep who explains the claim path in plain language — and is honest about what the
homeowner still owes — wins against cheaper bids.

**Done when:** they can repeat back what happens next, they have heard the deductible number
out loud, and every line of scope traces to something you documented.

**Most common failure:** offering to "eat the deductible." It is insurance fraud in most
states and it ends careers. TRUSS Coach will never suggest it, and the scorer flags it.

## S — Secure
*Lock in the commitment and the next concrete step.*

In storm work, an unsigned homeowner is an open account for every truck on the street.
Securing is not pressure — it is removing ambiguity. A specific next step with a date and a
name is what separates a signed job from a follow-up that never happens.

**Done when:** you asked directly, there is a date on the next step, they understand what
they signed including how to cancel, and they know when they will hear from you.

**Most common failure:** never actually asking. The single most common failure in the trades.

---

## Scoring

Each stage is scored 0–4 after a practice conversation:

| Score | Meaning |
| --- | --- |
| 0 | Not attempted — the stage never happened |
| 1 | Missed — attempted, objectives not met |
| 2 | Partial — some objectives met, key ones missed |
| 3 | Solid — would hold up on a real door |
| 4 | Strong — objectives met and the homeowner visibly moved |

Twenty points total. Every stage score must be justified with a verbatim quote from the
transcript, and each stage returns exactly one thing to change — reps act on one, not five.

Four findings cap a score automatically, because they are the ones that cost real money:

- Offering to waive or absorb the deductible caps **Solve** at 1
- Guaranteeing claim approval caps **Solve** at 2
- Never asking for a commitment or a dated next step caps **Secure** at 1
- Exaggerating or inventing damage caps **Understand** at 1

## Where the methodology lives in the code

`src/lib/truss/methodology.ts`. It is a typed domain model, not documentation. The Coach
prompt, the scoring rubric, the practice scenarios, and the progress UI are all generated
from it. This document and that file describe the same thing; the file is authoritative.
