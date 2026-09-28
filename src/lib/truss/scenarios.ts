/**
 * Practice scenarios for voice roleplay.
 *
 * Each scenario defines a character the Coach plays. They are written from
 * real patterns in storm-restoration and home-services selling: the skeptical
 * homeowner, the already-signed homeowner, the adjuster, the commercial
 * property manager. Difficulty controls how much resistance the character puts up.
 *
 * The TRUSS Sales Intelligence Repository's scenario library is appended after
 * the hand-written set, so reps can practice every trade and sales motion the
 * training data covers — HVAC, plumbing, electrical, remodeling, recurring
 * services, and commercial pursuits — scored against that library's own
 * expected behaviors and critical failures.
 */

import type { StageId } from './methodology';
import { detectContext, libraryScenarios, matchObjections, type LibraryScenario } from './knowledge';

export type Difficulty = 'easy' | 'moderate' | 'hard';
export type Persona = 'homeowner' | 'adjuster' | 'property-manager' | 'business-owner';

/** Sales motions from the TRUSS context router. */
export type Motion =
  | 'urgent_service'
  | 'planned_replacement'
  | 'remodeling'
  | 'technician_recommendation'
  | 'canvassing_storm'
  | 'commercial_service'
  | 'commercial_project';

export interface Scenario {
  id: string;
  /** i18n key suffix; copy lives in messages/{locale}.json under scenarios.* */
  slug: string;
  persona: Persona;
  title: string;
  /** Shown to the rep before they start. */
  setup: string;
  /** Never shown to the rep. Drives the character. */
  characterBrief: string;
  /** The specific resistance this character brings. */
  objections: string[];
  difficulty: Difficulty;
  /** Which stages this scenario is designed to exercise. */
  focusStages: StageId[];
  /** Trade vertical, using the repository's trade tags where one applies. */
  trade: string;
  /** Sales motion. Routes the knowledge base retrieval for roleplay and scoring. */
  motion: Motion;
  /** Voice character for the Realtime session. */
  voice: 'alloy' | 'ash' | 'ballad' | 'coral' | 'echo' | 'sage' | 'shimmer' | 'verse';
  /** Character speaks Spanish. Lets reps practice bilingual doors. */
  language: 'en' | 'es';
  /** Present on scenarios from the repository library. */
  library?: {
    /** Repository scenario ID, e.g. SC-004. */
    sourceId: string;
    /** Repository difficulty level, 1 (guided) to 4 (adverse). */
    level: number;
    channel: string;
    expectedBehaviors: string[];
    acceptableOutcomes: string[];
    criticalFailures: string[];
  };
}

/** Written in-house for storm restoration, the product's original market. */
const HANDWRITTEN: readonly Scenario[] = [
  {
    id: 'cold-door-hail',
    slug: 'coldDoorHail',
    persona: 'homeowner',
    title: 'Cold door after a hail storm',
    setup:
      'A hail storm came through this neighborhood eleven days ago. You are knocking a street where ' +
      'you have already repaired two roofs. The homeowner answers the door. They have been approached ' +
      'by three other companies this week.',
    characterBrief:
      'You are Dale Whitaker, 58, retired postal worker. You have lived in this house 22 years. ' +
      'Hail came through eleven days ago. Three contractors have already knocked and you did not like ' +
      'any of them — one of them would not give you a company name. You are polite but guarded and you ' +
      'answer the door holding it half closed. You are insured with State Farm and your deductible is ' +
      '$2,500, but you will NOT volunteer either fact until the rep has earned it by being straight ' +
      'with you and showing you actual damage. You do not know whether you have real damage. Your wife ' +
      'Marla makes financial decisions with you and is not home; you will not mention her unless asked ' +
      'who else is involved. If the rep pressures you, you get shorter and start closing the door. If ' +
      'the rep is honest, local, and low-pressure, you warm up noticeably and step outside.',
    objections: [
      'We already had someone look at it.',
      'How do I know you are not one of those storm chasers?',
      'I am not signing anything today.',
      'My roof is fine, it is only twelve years old.',
    ],
    difficulty: 'moderate',
    focusStages: ['trust', 'relate', 'understand'],
    trade: 'roofing',
    motion: 'canvassing_storm',
    voice: 'ash',
    language: 'en',
  },
  {
    id: 'deductible-objection',
    slug: 'deductibleObjection',
    persona: 'homeowner',
    title: 'The deductible objection',
    setup:
      'You inspected this roof yesterday and found clear wind and hail damage. You are back to walk ' +
      'the homeowner through the scope and ask for the agreement. The deductible is about to come up.',
    characterBrief:
      'You are Tanya Brooks, 41, single parent, works as a dental hygienist. You believe there is ' +
      'damage — the rep showed you photos and you trust them so far. The problem is money: your ' +
      'deductible is $3,000 and you do not have it. Another contractor told you last week that they ' +
      '"take care of the deductible" and you will bring that up. You are not trying to commit fraud, ' +
      'you genuinely do not know that is illegal. If the rep offers to waive or absorb the deductible, ' +
      'you accept happily — and that is a FAILED conversation. If the rep explains honestly why they ' +
      'cannot do that, you get frustrated first, then respect them for it, and you will engage if they ' +
      'give you a real path forward such as payment timing, financing, or scope phasing. You are direct ' +
      'and a little stressed.',
    objections: [
      'The other guy said he would cover my deductible.',
      'I do not have three thousand dollars.',
      'If insurance is paying, why am I paying anything?',
      'Can you just build it into the price?',
    ],
    difficulty: 'hard',
    focusStages: ['solve', 'secure'],
    trade: 'roofing',
    motion: 'canvassing_storm',
    voice: 'coral',
    language: 'en',
  },
  {
    id: 'adjuster-meeting',
    slug: 'adjusterMeeting',
    persona: 'adjuster',
    title: 'Meeting the adjuster on the roof',
    setup:
      'The carrier sent an adjuster to inspect a roof you have already documented. You are meeting ' +
      'them on site. Your job is to walk the damage professionally, not to argue.',
    characterBrief:
      'You are Ray Delgado, an independent adjuster contracted by the carrier. You are on your sixth ' +
      'inspection today and you are running behind. You are professional but brisk, and you have seen ' +
      'a lot of contractors inflate scope. Your default read is that this roof has some hail but you ' +
      'are inclined to call it cosmetic and limit the scope to a slope or two. You respond well to a ' +
      'contractor who is organized, cites test squares, references the carrier\'s own guidelines, and ' +
      'does not get emotional. You push back hard on anyone who exaggerates or gets adversarial. If ' +
      'the contractor presents clean documentation and stays factual, you will concede specific items. ' +
      'You will not approve everything.',
    objections: [
      'That looks like blistering to me, not hail.',
      'I am only seeing enough for a slope, not a full replacement.',
      'Your scope has items I am not going to pay for.',
      'I have four more of these today, walk me through it fast.',
    ],
    difficulty: 'hard',
    focusStages: ['understand', 'solve'],
    trade: 'roofing',
    motion: 'canvassing_storm',
    voice: 'echo',
    language: 'en',
  },
  {
    id: 'puerta-fria-granizo',
    slug: 'puertaFriaGranizo',
    persona: 'homeowner',
    title: 'Puerta fría después del granizo',
    setup:
      'Una tormenta de granizo pasó por este vecindario hace dos semanas. La propietaria abre la puerta. ' +
      'Habla español y prefiere que la conversación sea en español.',
    characterBrief:
      'Eres Rosa Mendoza, 47 años, dueña de casa desde hace nueve años. Hablas español y muy poco inglés. ' +
      'Hace dos semanas cayó granizo. Un contratista ya vino pero hablaba solo inglés y no entendiste ' +
      'nada de lo que te explicó, así que no firmaste. Desconfías porque una vecina fue estafada el año ' +
      'pasado. Tienes seguro con Allstate y tu deducible es de $1,500, pero NO lo dices hasta que el ' +
      'vendedor se gane tu confianza. Tu esposo Miguel trabaja de día y participa en las decisiones ' +
      'grandes. Respondes bien si el vendedor habla español con respeto y paciencia y te explica el ' +
      'proceso paso a paso. Si el vendedor te apura o usa términos técnicos sin explicarlos, te cierras. ' +
      'Responde SIEMPRE en español.',
    objections: [
      'Ya vino otra compañía pero no entendí nada.',
      '¿Cómo sé que ustedes son legítimos?',
      'Tengo que hablar con mi esposo primero.',
      'No quiero firmar nada hoy.',
    ],
    difficulty: 'moderate',
    focusStages: ['trust', 'relate', 'solve'],
    trade: 'roofing',
    motion: 'canvassing_storm',
    voice: 'sage',
    language: 'es',
  },
  {
    id: 'already-signed',
    slug: 'alreadySigned',
    persona: 'homeowner',
    title: 'Already signed with someone else',
    setup:
      'This homeowner signed a contingency agreement with another company four days ago. They are ' +
      'having second thoughts but do not know what their options are.',
    characterBrief:
      'You are Kevin Osei, 35, works in IT. You signed with a company called Summit Exteriors four days ' +
      'ago because the rep was persistent and you wanted it handled. Since then you have not heard from ' +
      'them, you cannot get anyone on the phone, and you are annoyed. You do not know whether you can ' +
      'get out of the agreement. You are testing whether this new rep will trash-talk the competitor — ' +
      'if they do, you trust them LESS, not more. If the rep is straight with you about your rights, ' +
      'tells you to give Summit a fair chance to respond first, and offers to be your second option, ' +
      'you respect that enormously. You are analytical and ask a lot of specific questions.',
    objections: [
      'I already signed with somebody.',
      'Can I even get out of it?',
      'What makes you different from them?',
      'Why should I trust the second guy any more than the first?',
    ],
    difficulty: 'hard',
    focusStages: ['trust', 'relate', 'secure'],
    trade: 'roofing',
    motion: 'canvassing_storm',
    voice: 'verse',
    language: 'en',
  },
  {
    id: 'commercial-property',
    slug: 'commercialProperty',
    persona: 'property-manager',
    title: 'Commercial property manager',
    setup:
      'You are calling on a property manager who oversees six small commercial buildings, two of which ' +
      'took wind damage. Decisions here run on budget cycles and paperwork, not emotion.',
    characterBrief:
      'You are Janet Kirkland, regional property manager for a firm managing 34 buildings. Two of your ' +
      'properties took wind damage. You are busy, transactional, and you deal with contractors constantly. ' +
      'You do not care about rapport-building small talk and you will cut it off. You care about: ' +
      'certificate of insurance, references from commercial work specifically, whether they can work ' +
      'around tenant operating hours, warranty terms, and whether they can produce documentation your ' +
      'ownership group will accept. You have a preferred vendor already but they are backed up eight ' +
      'weeks, which is the opening. You respond to competence and specifics, and you will end the call ' +
      'if the rep treats you like a residential homeowner.',
    objections: [
      'I have a vendor already.',
      'Send me something and I will look at it.',
      'Have you done commercial or just houses?',
      'I cannot have crews here during business hours.',
    ],
    difficulty: 'hard',
    focusStages: ['understand', 'solve', 'secure'],
    trade: 'general',
    motion: 'commercial_project',
    voice: 'shimmer',
    language: 'en',
  },
  {
    id: 'friendly-referral',
    slug: 'friendlyReferral',
    persona: 'homeowner',
    title: 'Warm referral from a neighbor',
    setup:
      'A previous customer referred you to their neighbor. The door is friendly. The risk here is ' +
      'coasting on the referral and skipping the work.',
    characterBrief:
      'You are Pam Rutherford, 62. Your neighbor Sharon told you this company did good work on her ' +
      'roof. You are friendly, chatty, and predisposed to like this rep. You will happily talk about ' +
      'the neighborhood for as long as they let you. Here is the trap: because you are warm, a lazy ' +
      'rep will skip the inspection details, never ask about your carrier, and never actually ask you ' +
      'to sign. You will NOT volunteer your deductible, your carrier (Farmers), or the fact that you ' +
      'filed a claim two years ago for the same roof — all of which matter. You will say yes if asked ' +
      'directly, and you will politely let the rep leave without asking if they never do.',
    objections: [
      'Sharon said you all were great, so whatever you think.',
      'Do I really need to do anything right now?',
      'Just tell me what to do.',
    ],
    difficulty: 'easy',
    focusStages: ['understand', 'secure'],
    trade: 'roofing',
    motion: 'canvassing_storm',
    voice: 'ballad',
    language: 'en',
  },
];

// ─── Repository scenario library ──────────────────────────────────────────────

const TRADE_LABELS: Record<string, string> = {
  hvac: 'HVAC',
  plumbing: 'Plumbing',
  electrical: 'Electrical',
  roofing: 'Roofing',
  remodeling: 'Remodeling',
  pest: 'Pest control',
  landscaping: 'Landscaping',
  mechanical: 'Mechanical',
  cleaning: 'Commercial cleaning',
  solar: 'Solar',
  general_contracting: 'General contracting',
  windows_siding: 'Windows and siding',
  restoration: 'Restoration',
};

const MOTION_LABELS: Record<Motion, string> = {
  urgent_service: 'urgent service call',
  planned_replacement: 'planned purchase',
  remodeling: 'planned project',
  technician_recommendation: 'technician recommendation',
  canvassing_storm: 'storm canvassing',
  commercial_service: 'commercial service account',
  commercial_project: 'commercial project pursuit',
};

const CHANNELS: Record<string, { label: string; scene: string }> = {
  field_visit: { label: 'on site', scene: 'You are on site with the buyer.' },
  door: { label: 'at the door', scene: 'You are at the front door.' },
  meeting: { label: 'meeting', scene: 'You are in a scheduled meeting with the buyer.' },
  phone: { label: 'phone', scene: 'You are on the phone with the buyer.' },
  pre_call: { label: 'first call', scene: 'You are making a first call to the only contact you have.' },
  bid_invitation: { label: 'bid invitation', scene: 'You are talking with the contractor who sent the invitation.' },
  proposal_review: { label: 'proposal review', scene: 'You are reviewing your proposal with the buyer.' },
  go_no_go: { label: 'go or no-go', scene: 'You are talking with the owner representative who wants your firm to bid.' },
  renewal_review: { label: 'renewal review', scene: 'You are in the renewal review with the client.' },
};

/** Where each motion's conversations usually break, per the context router. */
const MOTION_FOCUS: Record<Motion, StageId[]> = {
  urgent_service: ['trust', 'understand', 'solve'],
  planned_replacement: ['understand', 'solve', 'secure'],
  remodeling: ['understand', 'solve', 'secure'],
  technician_recommendation: ['trust', 'understand', 'solve'],
  canvassing_storm: ['trust', 'relate', 'understand'],
  commercial_service: ['relate', 'understand', 'secure'],
  commercial_project: ['understand', 'solve', 'secure'],
};

const LEVEL_NAMES = ['', 'guided', 'realistic', 'complex', 'adverse'];
const VOICES: Scenario['voice'][] = ['ash', 'coral', 'echo', 'sage', 'verse', 'shimmer', 'ballad', 'alloy'];

function fromLibrary(sc: LibraryScenario, index: number): Scenario {
  const motion = (sc.motion in MOTION_LABELS ? sc.motion : 'planned_replacement') as Motion;
  const channel = CHANNELS[sc.channel] ?? { label: sc.channel.replace(/_/g, ' '), scene: '' };
  const trade = TRADE_LABELS[sc.trade] ?? sc.trade.replace(/_/g, ' ');
  const level = Math.min(Math.max(sc.difficulty, 1), 4);
  const commercial = motion.startsWith('commercial');

  return {
    id: `library-${sc.id.toLowerCase()}`,
    slug: 'library',
    persona: motion === 'commercial_project' ? 'business-owner' : commercial ? 'property-manager' : 'homeowner',
    title: `${trade}: ${MOTION_LABELS[motion]}${sc.channel === 'field_visit' ? '' : ` (${channel.label})`}`,
    setup: `${sc.visible_situation} ${channel.scene}`.trim(),
    characterBrief:
      `You are the buyer in this situation: ${sc.visible_situation}\n` +
      `${channel.scene ? `Setting: ${channel.scene.replace(/^You are/, 'The seller is')}\n` : ''}` +
      `Your state of mind: ${sc.buyer_state}.\n` +
      `What you care about most: ${sc.priorities.join('; ')}.\n` +
      `Your constraints: ${sc.constraints.join('; ')}.\n` +
      `Private facts. These are true, but you reveal each one only when the seller earns it with a ` +
      `relevant question or real evidence:\n${sc.hidden_facts.map((f) => `  - ${f}`).join('\n')}\n` +
      (commercial
        ? `Pick the role the seller would realistically be speaking with here — a facilities lead, ` +
          `operations director, property manager, estimator, or owner representative — and hold it.\n`
        : '') +
      `Choose a first name that fits and keep it. Your realistic outcomes are: ` +
      `${sc.acceptable_outcomes.join(', ')}. Which one you reach depends on how well the seller handles you.`,
    // The repository's objection records that fit this buyer, in its words.
    // A commercial buyer's stakeholder objection is the boss, not the spouse.
    objections: matchObjections(
      [sc.visible_situation, sc.buyer_state, ...sc.priorities, ...sc.constraints, ...sc.hidden_facts],
      3,
      commercial ? 'commercial' : 'residential',
    ).map((o) => (commercial && o.family === 'stakeholder' ? o.utterances[1] : o.utterances[0])),
    difficulty: level <= 1 ? 'easy' : level === 2 ? 'moderate' : 'hard',
    focusStages: MOTION_FOCUS[motion],
    trade: sc.trade,
    motion,
    voice: VOICES[index % VOICES.length],
    language: 'en',
    library: {
      sourceId: sc.id,
      level,
      channel: sc.channel,
      expectedBehaviors: sc.expected_behaviors,
      acceptableOutcomes: sc.acceptable_outcomes,
      criticalFailures: sc.critical_failures,
    },
  };
}

export const SCENARIOS: readonly Scenario[] = [
  ...HANDWRITTEN,
  ...libraryScenarios().map(fromLibrary),
];

/**
 * Shapes an org-authored `custom_scenarios` row like a built-in scenario.
 * Trade and motion are inferred from its text so retrieval and scoring still
 * route it to the right part of the knowledge base.
 */
export function customScenario(row: {
  id: string;
  persona: Persona;
  title: string;
  setup: string;
  character_brief: string;
  objections: string[] | null;
  difficulty: Difficulty;
  focus_stages: StageId[] | null;
  voice: Scenario['voice'];
  language: 'en' | 'es';
}): Scenario {
  const context = detectContext(`${row.title} ${row.setup} ${row.character_brief}`);
  return {
    id: row.id,
    slug: 'custom',
    persona: row.persona,
    title: row.title,
    setup: row.setup,
    characterBrief: row.character_brief,
    objections: row.objections ?? [],
    difficulty: row.difficulty,
    focusStages: row.focus_stages ?? [],
    trade: context.trades[0] ?? 'general',
    motion: (context.motions[0] as Motion | undefined) ?? 'planned_replacement',
    voice: row.voice,
    language: row.language,
  };
}

/** The repository's name for a difficulty level, for the character prompt. */
export function levelName(level: number): string {
  return LEVEL_NAMES[level] ?? 'realistic';
}

export function getScenario(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}

export function scenariosByDifficulty(d: Difficulty): Scenario[] {
  return SCENARIOS.filter((s) => s.difficulty === d);
}

export function scenariosForLanguage(lang: 'en' | 'es'): Scenario[] {
  return SCENARIOS.filter((s) => s.language === lang);
}
