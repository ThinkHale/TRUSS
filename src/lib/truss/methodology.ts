/**
 * The TRUSS methodology.
 *
 * TRUSS is both the platform and the sales methodology it teaches:
 *
 *   T — Trust      Earn the right to be standing there.
 *   R — Relate     Connect as a person before a contractor.
 *   U — Understand Diagnose the property, the claim, and the decision.
 *   S — Solve      Make the complex simple and show the path forward.
 *   S — Secure     Lock in the commitment and the next concrete step.
 *
 * This file is the single source of truth. The Coach prompts, the roleplay
 * scorecard, the practice scenarios, and the progress UI all read from here,
 * so the methodology stays consistent everywhere it surfaces.
 */

export type StageId = 'trust' | 'relate' | 'understand' | 'solve' | 'secure';

export interface StageSignal {
  /** What the rep did, in the rep's own language. */
  behavior: string;
  /** What it looks like when it lands. */
  evidence: string;
}

export interface Stage {
  id: StageId;
  /** The letter this stage contributes to the acronym. */
  letter: string;
  name: string;
  /** One line a rep can remember on a ladder. */
  oneLiner: string;
  /** What this stage is actually for. */
  purpose: string;
  /** Ordered objectives — the rep is not done with the stage until these are true. */
  objectives: string[];
  /** Concrete, coachable behaviors. These become scorecard criteria. */
  behaviors: StageSignal[];
  /** How reps most often blow this stage. */
  failureModes: string[];
  /** Language that works. Deliberately plain, not scripted-sounding. */
  exampleLanguage: string[];
  /** What the homeowner says or does when the stage has landed. */
  greenLights: string[];
  /** What it sounds like when the rep needs to slow down and rebuild. */
  redFlags: string[];
  /** Tailwind-friendly accent token used by the UI. */
  accent: string;
}

export const STAGES: readonly Stage[] = [
  {
    id: 'trust',
    letter: 'T',
    name: 'Trust',
    oneLiner: 'Earn the right to be standing there.',
    purpose:
      'A homeowner who has just had storm damage has already been approached by strangers, ' +
      'and may have been warned about them. Before anything else, the rep has to be visibly ' +
      'legitimate, local, and safe to talk to. Nothing else in the conversation works until this does.',
    objectives: [
      'State who you are, who you work for, and why you are on this street — in the first fifteen seconds.',
      'Give the homeowner an easy, no-pressure way to end the conversation.',
      'Show proof: license, local address, marked vehicle, badge, work in the neighborhood.',
      'Set an honest expectation for how long this will take and what happens next.',
    ],
    behaviors: [
      {
        behavior: 'Opened with name, company, and reason for being there before asking for anything',
        evidence: 'Homeowner knows who they are talking to before the first question is asked.',
      },
      {
        behavior: 'Offered proof of legitimacy without being asked',
        evidence: 'License number, local office, truck, or neighbor references surfaced early.',
      },
      {
        behavior: 'Explicitly lowered the pressure',
        evidence: 'Said some version of "you do not have to decide anything today."',
      },
      {
        behavior: 'Respected the threshold',
        evidence: 'Kept a comfortable distance, did not push toward the door or inside the home.',
      },
      {
        behavior: 'Set a time expectation and honored it',
        evidence: 'Told the homeowner how long this would take and did not run long.',
      },
    ],
    failureModes: [
      'Leading with the pitch or a discount before establishing identity.',
      'Vague about the company name, or using a name that does not match the vehicle or shirt.',
      'Manufacturing urgency ("I only have today") before any trust exists.',
      'Standing too close, or stepping toward the door when it opens.',
      'Dodging the "are you a storm chaser" question instead of answering it directly.',
    ],
    exampleLanguage: [
      '"Hi, I am ___ with ___. We are based over on ___. I am not here to sell you anything today."',
      '"We repaired the roof two doors down after the hail in April. I am checking the houses on this block."',
      '"Here is my license and my card. Look us up while we talk, I would rather you did."',
      '"This takes about ten minutes. If it is a bad time, tell me and I will leave you a card."',
    ],
    greenLights: [
      'The homeowner steps out rather than staying behind the door.',
      'They ask a question about the company instead of trying to end the conversation.',
      'Body language opens up: arms uncross, they turn toward you.',
    ],
    redFlags: [
      'The door stays mostly closed after the opening.',
      '"We are not interested" arrives before you finish your first sentence.',
      'They ask twice who you are — your opener did not land.',
    ],
    accent: 'amber',
  },
  {
    id: 'relate',
    letter: 'R',
    name: 'Relate',
    oneLiner: 'Connect as a person before a contractor.',
    purpose:
      'Storm damage is stressful, expensive, and disorienting. A rep who moves straight to ' +
      'inspection treats the home as a job site. A rep who relates first is treated as an ally ' +
      'for the rest of the process, including the hard parts of the claim.',
    objectives: [
      'Acknowledge what the homeowner has already been through.',
      'Find genuine common ground — the neighborhood, the storm, the other trucks on the street.',
      'Let the homeowner talk longer than you do in this stage.',
      'Learn who else lives here and who else weighs in on decisions.',
    ],
    behaviors: [
      {
        behavior: 'Acknowledged the disruption before talking about the roof',
        evidence: 'Named the stress, the mess, or the wait the homeowner is dealing with.',
      },
      {
        behavior: 'Asked an open question and then stopped talking',
        evidence: 'Homeowner spoke in paragraphs, not one-word answers.',
      },
      {
        behavior: 'Listened for and reflected back what mattered to them',
        evidence: 'Repeated their concern in their own words before moving on.',
      },
      {
        behavior: 'Established local roots credibly',
        evidence: 'Named streets, schools, or storms the homeowner recognizes.',
      },
      {
        behavior: 'Identified all decision makers early',
        evidence: 'Knows whether a spouse, adult child, or landlord is part of this.',
      },
    ],
    failureModes: [
      'Fake rapport — complimenting the house or the dog with nothing behind it.',
      'Talking about yourself and your company more than about them.',
      'Racing to get on the roof because the inspection feels like progress.',
      'Missing that the person at the door is not the person who decides.',
    ],
    exampleLanguage: [
      '"How did your place come through it? I have seen a lot of torn-up siding on this street."',
      '"You have probably had four of us knock this week. What have the others told you?"',
      '"Is it just you making this call, or is there someone else who should hear what I find?"',
      '"What is worrying you most about it right now?"',
    ],
    greenLights: [
      'The homeowner volunteers information you did not ask for.',
      'They mention their spouse, neighbor, or adjuster by name.',
      'They complain about another contractor — they are treating you as the trusted one.',
    ],
    redFlags: [
      'Answers stay clipped and factual after two open questions.',
      'They keep redirecting to price before you have talked about the damage.',
      'You are doing most of the talking.',
    ],
    accent: 'sky',
  },
  {
    id: 'understand',
    letter: 'U',
    name: 'Understand',
    oneLiner: 'Diagnose the property, the claim, and the decision.',
    purpose:
      'Trades sales fails most often here, quietly. The rep inspects the roof but never ' +
      'diagnoses the claim or the decision process, then loses the job weeks later to a ' +
      'deductible surprise or a decision maker who was never in the room.',
    objectives: [
      'Inspect and document the actual condition, with photos the homeowner can see.',
      'Establish the insurance picture: carrier, deductible, prior claims, policy type (RCV vs ACV).',
      'Find out where they are in the process — filed, inspected, denied, or not started.',
      'Understand the real timeline pressure and where the money is coming from.',
      'Confirm who signs and what has to be true for them to move forward.',
    ],
    behaviors: [
      {
        behavior: 'Documented damage visually and showed the homeowner',
        evidence: 'Photos or video on the phone, walked through together, not described from memory.',
      },
      {
        behavior: 'Asked about the carrier and the deductible directly',
        evidence: 'Knows the carrier name and the out-of-pocket number before proposing anything.',
      },
      {
        behavior: 'Established claim status and history',
        evidence: 'Knows whether a claim exists, when it was filed, and what happened on prior claims.',
      },
      {
        behavior: 'Distinguished storm damage from wear',
        evidence: 'Said plainly which damage is claimable and which is not.',
      },
      {
        behavior: 'Confirmed the decision process',
        evidence: 'Knows who signs, who else must agree, and what would stop this.',
      },
    ],
    failureModes: [
      'Inspecting without showing the homeowner what you found.',
      'Avoiding the deductible conversation because it feels like an objection.',
      'Promising the claim will be approved. It is not the rep\'s call and saying so damages trust later.',
      'Overstating damage to make the job bigger — the fastest way to lose a claim and a license.',
      'Skipping prior claim history and getting blindsided at the adjuster meeting.',
    ],
    exampleLanguage: [
      '"Come look at this with me. See these dark spots? That is hail bruising — the mat underneath is broken."',
      '"Who are you insured with, and do you know what your deductible is?"',
      '"Have you filed yet, or were you waiting to see what someone found?"',
      '"Some of this is storm and some of this is age. I am going to be straight with you about which is which."',
      '"If the carrier approves this, is there anything that would keep you from moving ahead?"',
    ],
    greenLights: [
      'The homeowner starts asking you process questions about the claim.',
      'They go get the policy, or call their spouse over.',
      'They tell you their deductible without being pushed.',
    ],
    redFlags: [
      'You are on the roof and they are inside — no shared understanding is being built.',
      'You still do not know the carrier after twenty minutes.',
      '"Just give me a price" — you have not earned the diagnosis yet.',
    ],
    accent: 'violet',
  },
  {
    id: 'solve',
    letter: 'S',
    name: 'Solve',
    oneLiner: 'Make the complex simple and show the path forward.',
    purpose:
      'The homeowner is not buying a roof. They are buying a way out of a confusing, ' +
      'adversarial process. The rep who explains the claim path in plain language — and is ' +
      'honest about what the homeowner still owes — wins against cheaper bids.',
    objectives: [
      'Explain what happens next, in order, in plain language.',
      'Be explicit about what the homeowner pays and what insurance covers.',
      'Match the scope to what you actually documented — nothing invented.',
      'Address the real objection behind the stated one.',
      'Give them something to hold: a written scope, photos, a one-page process sheet.',
    ],
    behaviors: [
      {
        behavior: 'Explained the claim process step by step',
        evidence: 'Homeowner can repeat back what happens next without prompting.',
      },
      {
        behavior: 'Was explicit and unflinching about the deductible',
        evidence: 'Named the number the homeowner will actually pay, out loud.',
      },
      {
        behavior: 'Tied every line of scope to documented damage',
        evidence: 'Each item traces back to a photo or a measurement.',
      },
      {
        behavior: 'Handled the objection under the objection',
        evidence: 'Addressed the real hesitation, not the surface one.',
      },
      {
        behavior: 'Left something physical or digital behind',
        evidence: 'Written scope, photo link, or process sheet in the homeowner\'s hands.',
      },
    ],
    failureModes: [
      'Offering to "eat the deductible." It is insurance fraud in most states and it ends careers.',
      'Burying the homeowner in product jargon — shingle lines, underlayment brands, warranties.',
      'Competing on price against a bid that is not scoped the same way.',
      'Answering the stated objection while the real one goes unaddressed.',
      'Guaranteeing an approval or a timeline the carrier controls.',
    ],
    exampleLanguage: [
      '"Here is how this goes: I file with you, the adjuster comes out, I meet them here, then we schedule."',
      '"Your deductible is ___. That is yours to pay no matter who does the work. I will not pretend otherwise."',
      '"You are not paying me for a roof today. You are signing that we represent you if it is approved."',
      '"That bid is cheaper because it is not the same scope. Let me show you the two side by side."',
      '"When you say you want to think about it, is it the money, the timing, or me?"',
    ],
    greenLights: [
      'The homeowner explains the process back to you correctly.',
      'They ask about scheduling or materials — they are past the decision.',
      'They bring up the deductible themselves as a planning question, not a barrier.',
    ],
    redFlags: [
      '"I need to think about it" with no specifics attached.',
      'They go quiet after you name the deductible.',
      'They keep returning to the competitor\'s number.',
    ],
    accent: 'emerald',
  },
  {
    id: 'secure',
    letter: 'S',
    name: 'Secure',
    oneLiner: 'Lock in the commitment and the next concrete step.',
    purpose:
      'In storm work, an unsigned homeowner is an open account for every truck on the street. ' +
      'Securing is not pressure — it is removing ambiguity. A specific next step with a date ' +
      'and a name attached is what separates a signed job from a follow-up that never happens.',
    objectives: [
      'Ask for the commitment directly and without apology.',
      'Put a date and a name on the very next step.',
      'Explain the agreement honestly, including how they can get out of it.',
      'Set expectations for the adjuster meeting and your role in it.',
      'Establish the follow-up rhythm before you leave.',
    ],
    behaviors: [
      {
        behavior: 'Asked for the signature plainly',
        evidence: 'A direct ask was made, not hinted at.',
      },
      {
        behavior: 'Scheduled a specific next step',
        evidence: 'A date, a time, and who is responsible — not "I will be in touch."',
      },
      {
        behavior: 'Explained the agreement in plain terms, including cancellation rights',
        evidence: 'Homeowner understands what they signed and how to back out.',
      },
      {
        behavior: 'Prepared them for the adjuster meeting',
        evidence: 'They know when it is, that you will be there, and what to expect.',
      },
      {
        behavior: 'Left contact details and set the follow-up cadence',
        evidence: 'Homeowner knows exactly when they will hear from you next.',
      },
    ],
    failureModes: [
      'Never actually asking. The single most common failure in the trades.',
      'Leaving with "I will follow up next week" and no date.',
      'Glossing over the contingency agreement, which creates cancellations later.',
      'High-pressure closing that undoes every bit of trust built in the first four stages.',
      'Not preparing the homeowner for the adjuster, then losing the claim in the meeting.',
    ],
    exampleLanguage: [
      '"If you are comfortable, I would like to get this signed so I can file with you today."',
      '"This says we represent you with the carrier. If they deny it, it costs you nothing and it is void."',
      '"You have three days to cancel, no reason needed. I want you to know that up front."',
      '"The adjuster will call within a few days. Tell me the time and I will be here for it."',
      '"I will text you Thursday either way, even if there is no news."',
    ],
    greenLights: [
      'They sign, or they name a specific time to decide.',
      'They ask what happens if the claim is denied — a buying question, not a stall.',
      'They give you the adjuster appointment when it is scheduled.',
    ],
    redFlags: [
      'You leave with no date on anything.',
      '"Let me talk to my husband" arrives here, which means Relate missed a decision maker.',
      'They will not commit to letting you attend the adjuster meeting.',
    ],
    accent: 'rose',
  },
] as const;

export const STAGE_IDS = STAGES.map((s) => s.id) as readonly StageId[];

export function getStage(id: StageId): Stage {
  const stage = STAGES.find((s) => s.id === id);
  if (!stage) throw new Error(`Unknown TRUSS stage: ${id}`);
  return stage;
}

/** "Trust · Relate · Understand · Solve · Secure" */
export const TRUSS_EXPANSION = STAGES.map((s) => s.name).join(' · ');

/**
 * Compact methodology reference injected into every Coach and scoring prompt.
 * Kept terse on purpose — the full prose above is for humans, this is for tokens.
 */
export function methodologyBriefing(): string {
  return STAGES.map((stage) => {
    const objectives = stage.objectives.map((o) => `    - ${o}`).join('\n');
    const failures = stage.failureModes.map((f) => `    - ${f}`).join('\n');
    return [
      `${stage.letter} — ${stage.name.toUpperCase()}: ${stage.oneLiner}`,
      `  Purpose: ${stage.purpose}`,
      `  Objectives:`,
      objectives,
      `  Common failures:`,
      failures,
    ].join('\n');
  }).join('\n\n');
}
