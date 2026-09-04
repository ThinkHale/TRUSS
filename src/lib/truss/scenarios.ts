/**
 * Practice scenarios for voice roleplay.
 *
 * Each scenario defines a character the Coach plays. They are written from
 * real patterns in storm-restoration and home-services selling: the skeptical
 * homeowner, the already-signed homeowner, the adjuster, the commercial
 * property manager. Difficulty controls how much resistance the character puts up.
 */

import type { StageId } from './methodology';

export type Difficulty = 'easy' | 'moderate' | 'hard';
export type Persona = 'homeowner' | 'adjuster' | 'property-manager' | 'business-owner';

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
  /** Trade vertical. Used for filtering and for enterprise scenario libraries. */
  trade: 'roofing' | 'general' | 'exterior' | 'restoration';
  /** Voice character for the Realtime session. */
  voice: 'alloy' | 'ash' | 'ballad' | 'coral' | 'echo' | 'sage' | 'shimmer' | 'verse';
  /** Character speaks Spanish. Lets reps practice bilingual doors. */
  language: 'en' | 'es';
}

export const SCENARIOS: readonly Scenario[] = [
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
    voice: 'ballad',
    language: 'en',
  },
] as const;

export function getScenario(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}

export function scenariosByDifficulty(d: Difficulty): Scenario[] {
  return SCENARIOS.filter((s) => s.difficulty === d);
}

export function scenariosForLanguage(lang: 'en' | 'es'): Scenario[] {
  return SCENARIOS.filter((s) => s.language === lang);
}
