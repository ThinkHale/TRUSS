/**
 * TRUSS training data, made usable by every AI surface.
 *
 * The TRUSS AI Knowledge Base and the Sales Intelligence Repository are the
 * authority for what TRUSS teaches. This module is the only way prompts reach
 * them, and it follows the repository's own deployment guidance
 * (docs/07_implementation):
 *
 *   1. Behavioral rules, the method, the router, and the mode contract are
 *      always in the prompt — `coreDoctrine(mode)`.
 *   2. Doctrine sections, trade packs, and structured records are retrieved
 *      per request — `retrieve()`.
 *   3. Guardrail units for high-sensitivity topics (insurance, financing,
 *      safety claims, consent) are retrieved unconditionally when the topic
 *      appears, before anything ranked by relevance.
 *
 * Retrieval is lexical and in-process. The corpus is small (a few hundred
 * units), so BM25 over it is sub-millisecond, needs no database or embedding
 * call, and cannot silently fail the way a network lookup can — which matters
 * because an ungrounded answer is the failure this module exists to prevent.
 */

import { CORPUS } from './corpus.generated';
import type {
  Beam,
  CampaignPattern,
  DoctrineSection,
  KnowledgeUnit,
  LibraryScenario,
  Metric,
  Objection,
  TrussMode,
} from './types';

export type { Beam, TrussMode, LibraryScenario, Objection } from './types';

export const KNOWLEDGE_VERSION = CORPUS.version;
export const KNOWLEDGE_BUNDLE = CORPUS.bundle;

// ─── Lookups ──────────────────────────────────────────────────────────────────

const sectionsByFile = new Map<string, DoctrineSection[]>();
for (const s of CORPUS.sections) {
  const list = sectionsByFile.get(s.file) ?? [];
  list.push(s);
  sectionsByFile.set(s.file, list);
}

function fileSections(file: string, headings?: string[]): DoctrineSection[] {
  const all = sectionsByFile.get(file) ?? [];
  if (!headings) return all;
  return headings
    .map((h) => all.find((s) => s.heading.toLowerCase() === h.toLowerCase()))
    .filter((s): s is DoctrineSection => Boolean(s));
}

const unitById = new Map(CORPUS.knowledgeUnits.map((u) => [u.id, u]));
const objectionById = new Map(CORPUS.objections.map((o) => [o.id, o]));

export function knowledgeUnit(id: string): KnowledgeUnit | undefined {
  return unitById.get(id);
}

export function libraryScenarios(): readonly LibraryScenario[] {
  return CORPUS.scenarios;
}

export function evalCases() {
  return CORPUS.evalCases;
}

/** Footnote markers `[^S040]` read as noise in a prompt; keep the source ID. */
function tidy(text: string): string {
  return text.replace(/\[\^(S\d+)\]/g, '[$1]').trim();
}

function renderSection(s: DoctrineSection, withTitle = true): string {
  const head = withTitle ? `### ${s.title} › ${s.heading}` : `### ${s.heading}`;
  return `${head}\n${tidy(s.text)}`;
}

// ─── Always-on doctrine ───────────────────────────────────────────────────────

const MODE_FILES: Record<TrussMode, string> = {
  coach: 'docs/03_modes/coach.md',
  practice: 'docs/03_modes/practice.md',
  campaign_creation: 'docs/03_modes/campaign_creation.md',
  account_review: 'docs/03_modes/account_review.md',
  market_research: 'docs/03_modes/market_research.md',
};

/** Sections that are always in the prompt, so retrieval never returns them. */
const CORE_SECTION_IDS = new Set<string>();

const CORE_PARTS: { label: string; sections: DoctrineSection[] }[] = [
  {
    label: 'OPERATING RULES',
    sections: [
      ...fileSections('docs/07_implementation/prompt_and_output_contracts.md', [
        'Shared developer rules',
        'Refusal and uncertainty patterns',
        'Style',
      ]),
      ...fileSections('README.md', ['Core product rule', 'Non-negotiable guardrails', 'Evidence labels']),
      ...fileSections('docs/07_implementation/ingestion_retrieval_and_versioning.md', ['Precedence']),
    ],
  },
  {
    label: 'THE TRUSS METHOD (authoritative definition and scoring anchors)',
    sections: fileSections('docs/01_method/truss_method.md'),
  },
  {
    label: 'SALES CONTEXT ROUTER (classify the motion before advising)',
    sections: fileSections('docs/01_method/context_router.md', [
      'Primary motions',
      'Decision rules',
      'Confidence behavior',
      'Harmful-mode errors',
    ]),
  },
];

for (const part of CORE_PARTS) for (const s of part.sections) CORE_SECTION_IDS.add(s.id);
for (const file of Object.values(MODE_FILES)) {
  for (const s of fileSections(file)) CORE_SECTION_IDS.add(s.id);
}

// A renamed heading in the repository would otherwise drop a rule silently.
if (CORE_PARTS.some((p) => p.sections.length === 0)) {
  throw new Error('TRUSS knowledge base: a core doctrine section is missing. Rebuild the corpus.');
}

/**
 * The doctrine every prompt in a mode carries, verbatim from the knowledge
 * base: operating rules and guardrails, the method, the router, and the
 * contract for this mode.
 */
export function coreDoctrine(mode: TrussMode): string {
  const parts = CORE_PARTS.map(
    (p) => `## ${p.label}\n\n${p.sections.map((s) => renderSection(s, false)).join('\n\n')}`,
  );
  const contract = fileSections(MODE_FILES[mode]);
  parts.push(
    `## ${contract[0]?.title.toUpperCase() ?? mode.toUpperCase()} CONTRACT\n\n` +
      contract.map((s) => renderSection(s, false)).join('\n\n'),
  );
  return parts.join('\n\n');
}

/** Specific sections by file and heading, e.g. the practice simulation rules. */
export function doctrine(file: string, headings: string[]): string {
  return fileSections(file, headings)
    .map((s) => renderSection(s, false))
    .join('\n\n');
}

// ─── Context detection ────────────────────────────────────────────────────────

/**
 * Trade packs and the repository's trade tags, keyed by the words a rep uses.
 * The repository routes by trade after motion; this is how free text finds it.
 */
const TRADES: { pack: string; tags: string[]; pattern: RegExp }[] = [
  {
    pack: 'docs/04_trades/hvac.md',
    tags: ['hvac', 'mechanical'],
    pattern: /\b(hvac|furnace|heat pump|a\/?c|air ?condition\w*|no[- ]cool|no[- ]heat|cooling|heating|duct\w*|iaq|mechanical|thermostat|calefacci[oó]n|aire acondicionado)\b/i,
  },
  {
    pack: 'docs/04_trades/plumbing.md',
    tags: ['plumbing'],
    pattern: /\b(plumb\w*|drain\w*|sewer|water heater|leak\w*|pipe\w*|backup|clog\w*|fontaner\w*|plomer\w*|drenaje)\b/i,
  },
  {
    pack: 'docs/04_trades/electrical.md',
    tags: ['electrical'],
    pattern: /\b(electric\w*|panel|breaker\w*|wiring|outlet\w*|generator|ev charger|el[eé]ctric\w*)\b/i,
  },
  {
    pack: 'docs/04_trades/roofing_and_exteriors.md',
    tags: ['roofing', 'restoration', 'windows_siding', 'exteriors', 'gutters'],
    pattern: /\b(roof\w*|shingle\w*|hail|storm\w*|siding|gutter\w*|window\w*|exterior\w*|restoration|adjuster|deductible|techo\w*|granizo|tormenta\w*|deducible|ajustador)\b/i,
  },
  {
    pack: 'docs/04_trades/remodeling_and_general_contracting.md',
    tags: ['remodeling', 'general_contracting', 'painting'],
    pattern: /\b(remodel\w*|renovat\w*|kitchen|bath\w*|addition|general contract\w*|design[- ]build|painting|cocina|remodelaci[oó]n)\b/i,
  },
  {
    pack: 'docs/04_trades/recurring_property_services.md',
    tags: ['pest', 'landscaping', 'lawn_care', 'cleaning', 'pool_service'],
    pattern: /\b(pest\w*|termite\w*|ants?|lawn\w*|landscap\w*|clean\w*|janitorial|pool\w*|recurring|maintenance plan|membership\w*)\b/i,
  },
  {
    pack: 'docs/04_trades/commercial_specialty_contracting.md',
    tags: ['general_contracting', 'mechanical'],
    pattern: /\b(commercial|bid\w*|rfp|plan[- ]and[- ]spec|subcontract\w*|gc|general contractor|facilit\w*|property manager\w*|procurement|owner rep\w*)\b/i,
  },
];

const MOTIONS: { motion: string; pattern: RegExp }[] = [
  { motion: 'canvassing_storm', pattern: /\b(door\w*|knock\w*|canvass\w*|storm\w*|hail|puerta|granizo|tormenta)\b/i },
  { motion: 'urgent_service', pattern: /\b(emergenc\w*|urgent|no[- ]cool|no[- ]heat|outage|leak\w*|backup|flood\w*|burst|lockout|urgencia)\b/i },
  { motion: 'technician_recommendation', pattern: /\b(technician|tech|during (a|the) (service|repair|maintenance)|while (i was|we were) there|upsell|add[- ]on)\b/i },
  { motion: 'planned_replacement', pattern: /\b(replace\w*|replacement|new system|estimate\w*|quote\w*|proposal|three bids|reemplaz\w*)\b/i },
  { motion: 'remodeling', pattern: /\b(remodel\w*|renovat\w*|kitchen|bath\w*|design|allowance\w*|change order\w*)\b/i },
  { motion: 'commercial_service', pattern: /\b(service agreement|maintenance contract|renewal|multi[- ]site|property manager\w*|facilit\w*|account)\b/i },
  { motion: 'commercial_project', pattern: /\b(bid\w*|rfp|plan[- ]and[- ]spec|go[- ]no[- ]go|no[- ]bid|subcontract\w*|general contractor|gc|pursuit)\b/i },
];

/**
 * High-sensitivity topics and the guardrail units they must pull in.
 * "Retrieve mandatory guardrails for the trade, channel, and jurisdiction"
 * comes before relevance ranking in the repository's retrieval order.
 */
const GUARDRAIL_TRIGGERS: { pattern: RegExp; refs: string[] }[] = [
  {
    pattern: /\b(insur\w*|claim\w*|deductib\w*|adjuster\w*|carrier\w*|seguro\w*|reclam\w*|deducible\w*|ajustador\w*|aseguradora)\b/i,
    refs: ['KU-022', 'KU-021', 'OB-015'],
  },
  { pattern: /\b(hail|storm\w*|granizo|tormenta\w*)\b/i, refs: ['KU-021'] },
  {
    pattern: /\b(financ\w*|monthly|per month|a month|payment plan|loan\w*|credit|apr|interest rate|mensual\w*|pagos?)\b/i,
    refs: ['KU-026'],
  },
  {
    pattern: /\b(fire|burn\w*|shock\w*|hazard\w*|danger\w*|unsafe|safety|carbon monoxide|co leak|gas leak|code violation\w*|peligr\w*|incendio)\b/i,
    refs: ['KU-020', 'KU-009'],
  },
  { pattern: /\b(cancel\w*|cooling[- ]off|three[- ]day|3[- ]day|rescind\w*|cancelar)\b/i, refs: ['KU-027'] },
  { pattern: /\b(lead paint|pre[- ]1978|rrp)\b/i, refs: ['KU-028'] },
  { pattern: /\b(texts?|sms|robocall\w*|autodial\w*|voicemail\w*|drop\b|mensaje\w* de texto)\b/i, refs: ['KU-039'] },
  { pattern: /\b(e-?mails?|newsletter|correo\w*)\b/i, refs: ['KU-038'] },
  {
    pattern: /\b(benchmark\w*|close rate|closing rate|industry average|average (close|ticket)|conversion rate)\b/i,
    refs: ['KU-042', 'KU-041'],
  },
  { pattern: /\b(guarantee\w*|never (come )?back|promise\w*|garant\w*)\b/i, refs: ['KU-024', 'KU-022'] },
];

export interface KnowledgeContext {
  trades: string[];
  tradePacks: string[];
  motions: string[];
}

/** Maps a rep's words and the org's configured trades onto repository tags. */
export function detectContext(text: string, orgTrades: string[] = []): KnowledgeContext {
  const haystack = `${text}\n${orgTrades.join(' ')}`;
  const matched = TRADES.filter((t) => t.pattern.test(haystack));
  return {
    trades: [...new Set(matched.flatMap((t) => t.tags))],
    tradePacks: [...new Set(matched.map((t) => t.pack))],
    motions: MOTIONS.filter((m) => m.pattern.test(text)).map((m) => m.motion),
  };
}

// ─── Retrieval index ──────────────────────────────────────────────────────────

type Kind = 'section' | 'unit' | 'objection' | 'campaign_pattern' | 'metric';

interface Doc {
  ref: string;
  kind: Kind;
  label: string;
  body: string;
  trades: string[];
  motions: string[];
  beams: string[];
  modes: string[];
  /** Trade pack the section belongs to, if any. */
  pack?: string;
  terms: Map<string, number>;
  length: number;
}

const STOPWORDS = new Set(
  (
    'a an and are as at be but by can do does for from has have how i if in into is it its me my ' +
    'no not of on or our so that the their them then there these they this to up was we were what ' +
    'when which who why will with you your just about get got would should could than too very'
  ).split(' '),
);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t))
    .map((t) => (t.length > 4 && t.endsWith('s') && !t.endsWith('ss') ? t.slice(0, -1) : t));
}

function termCounts(tokens: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const t of tokens) counts.set(t, (counts.get(t) ?? 0) + 1);
  return counts;
}

/** Excluded from retrieval: meta material about the repository itself. */
const NOT_RETRIEVABLE = [
  /^README\.md#(truss-sales-intelligence-repository|start-here|recommended-deployment|status)$/,
  /^docs\/07_implementation\//,
  /^docs\/08_research\/practitioner_and_platform_ingestion_queue\.md/,
  /^docs\/08_research\/master_synthesis\.md#sources$/,
  /^docs\/00_governance\/evidence_rights_and_maintenance\.md#(purpose|rights-policy|privacy-and-recordings)$/,
];

function unitText(u: KnowledgeUnit): string {
  return (
    `${u.content}\n` +
    `Applies when: ${u.applies_when}\n` +
    (u.exceptions && u.exceptions !== 'None' ? `Exceptions: ${u.exceptions}\n` : '') +
    (u.prohibited ? `Prohibited: ${u.prohibited}\n` : '') +
    `Evidence grade ${u.evidence_grade}; sources ${u.source_ids.join(', ')}.`
  );
}

function objectionText(o: Objection): string {
  return (
    `Sounds like: ${o.utterances.map((u) => `"${u}"`).join('; ')}\n` +
    `Likely meanings: ${o.likely_meanings.join('; ')}\n` +
    `Clarifying questions: ${o.clarifiers.map((c) => `"${c}"`).join(' ')}\n` +
    `Response directions: ${o.response_directions.join('; ')}\n` +
    `Prohibited: ${o.prohibited.join('; ')}`
  );
}

function patternText(p: CampaignPattern): string {
  return (
    `Audience: ${p.audience}. Trades: ${p.trades.join(', ')}. Trigger: ${p.trigger}.\n` +
    `Trust: ${p.trust}\nRelate: ${p.relate}\nUnderstand: ${p.understand}\nSolve: ${p.solve}\nSecure: ${p.secure}\n` +
    `Required inputs: ${p.required_inputs.join(', ')}\nMeasure: ${p.metrics.join(', ')}\n` +
    `Prohibited: ${p.prohibited.join('; ')}`
  );
}

function metricText(m: Metric): string {
  return (
    `${m.definition}. Formula: ${m.formula}. Grain: ${m.grain}. Segment by: ${m.required_segments}. ` +
    `${m.leading_or_lagging} indicator. Guardrail: ${m.guardrail}.`
  );
}

const PACK_TRADES = new Map(TRADES.map((t) => [t.pack, t.tags]));

function buildIndex(): Doc[] {
  const docs: Omit<Doc, 'terms' | 'length'>[] = [];

  for (const s of CORPUS.sections) {
    if (CORE_SECTION_IDS.has(s.id) || NOT_RETRIEVABLE.some((r) => r.test(s.id))) continue;
    const packTrades = PACK_TRADES.get(s.file);
    docs.push({
      ref: s.id,
      kind: 'section',
      label: `${s.title} › ${s.heading}`,
      body: tidy(s.text),
      trades: packTrades ?? ['all'],
      motions: ['all'],
      beams: [s.heading.toLowerCase()].filter((h) =>
        ['trust', 'relate', 'understand', 'solve', 'secure'].includes(h),
      ),
      modes: ['all'],
      pack: packTrades ? s.file : undefined,
    });
  }

  for (const u of CORPUS.knowledgeUnits) {
    docs.push({
      ref: u.id,
      kind: 'unit',
      label: u.title,
      body: unitText(u),
      trades: u.trades,
      motions: u.motions,
      beams: u.beams,
      modes: u.modes,
    });
  }

  for (const o of CORPUS.objections) {
    docs.push({
      ref: o.id,
      kind: 'objection',
      label: `Objection family: ${o.family.replace(/_/g, ' ')}`,
      body: objectionText(o),
      trades: ['all'],
      motions: ['all'],
      beams: o.beams,
      modes: ['coach', 'practice', 'account_review'],
    });
  }

  for (const p of CORPUS.campaignPatterns) {
    docs.push({
      ref: p.id,
      kind: 'campaign_pattern',
      label: `Campaign pattern: ${p.name}`,
      body: patternText(p),
      trades: p.trades.some((t) => t.startsWith('all')) ? ['all'] : p.trades,
      motions: ['all'],
      beams: [],
      modes: ['campaign_creation'],
    });
  }

  for (const m of CORPUS.metrics) {
    docs.push({
      ref: m.metric_id,
      kind: 'metric',
      label: `Metric: ${m.name}`,
      body: metricText(m),
      trades: ['all'],
      motions: ['all'],
      beams: [],
      modes: ['coach', 'account_review', 'market_research', 'campaign_creation'],
    });
  }

  return docs.map((d) => {
    // Label and tags are indexed with the body so "hvac" finds the HVAC pack.
    const tokens = tokenize(`${d.label} ${d.label} ${d.trades.join(' ')} ${d.body}`);
    return { ...d, terms: termCounts(tokens), length: tokens.length };
  });
}

const INDEX = buildIndex();
const DOC_BY_REF = new Map(INDEX.map((d) => [d.ref, d]));
const AVG_LENGTH = INDEX.reduce((n, d) => n + d.length, 0) / INDEX.length;
const DOC_FREQ = new Map<string, number>();
for (const d of INDEX) for (const t of d.terms.keys()) DOC_FREQ.set(t, (DOC_FREQ.get(t) ?? 0) + 1);

function bm25(queryTerms: string[], d: Doc): number {
  const k1 = 1.4;
  const b = 0.7;
  let score = 0;
  for (const t of queryTerms) {
    const tf = d.terms.get(t);
    if (!tf) continue;
    const df = DOC_FREQ.get(t) ?? 0;
    const idf = Math.log(1 + (INDEX.length - df + 0.5) / (df + 0.5));
    score += (idf * tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * d.length) / AVG_LENGTH));
  }
  return score;
}

// ─── Retrieval ────────────────────────────────────────────────────────────────

export interface RetrievedKnowledge {
  /** Stable repository reference: KU-021, OB-003, CP-004, M012, or a section id. */
  ref: string;
  kind: Kind;
  label: string;
  body: string;
  /** Pulled in by a guardrail trigger rather than by relevance. */
  mandatory: boolean;
}

export interface RetrieveOptions {
  mode: TrussMode;
  /** The rep's words, the scenario, or the brief — whatever the answer is about. */
  query: string;
  /** Trades the org performs, from org settings. */
  orgTrades?: string[];
  /** Beams to favor, e.g. the stage the rep is drilling. */
  beams?: Beam[];
  /** Restrict to certain record kinds. */
  kinds?: Kind[];
  /** Maximum items, guardrails included. */
  limit?: number;
  /** Rough ceiling on retrieved characters, to keep prompts predictable. */
  budgetChars?: number;
}

export function retrieve(opts: RetrieveOptions): RetrievedKnowledge[] {
  const { mode, query, orgTrades = [], beams = [], kinds, limit = 8, budgetChars = 9000 } = opts;
  const ctx = detectContext(query, orgTrades);
  const queryTerms = [...new Set(tokenize(query))];

  const picked: RetrievedKnowledge[] = [];
  const seen = new Set<string>();
  let used = 0;

  const take = (d: Doc, mandatory: boolean) => {
    if (seen.has(d.ref) || picked.length >= limit) return;
    if (kinds && !kinds.includes(d.kind)) return;
    if (!mandatory && used + d.body.length > budgetChars) return;
    seen.add(d.ref);
    used += d.body.length;
    picked.push({ ref: d.ref, kind: d.kind, label: d.label, body: d.body, mandatory });
  };

  // 1. Guardrails for sensitive topics, regardless of rank.
  for (const trigger of GUARDRAIL_TRIGGERS) {
    if (!trigger.pattern.test(query)) continue;
    for (const ref of trigger.refs) {
      const d = DOC_BY_REF.get(ref);
      if (d) take(d, true);
    }
  }

  // 2. Everything else, ranked by relevance and weighted by fit to context.
  const tradeMatch = (d: Doc) => d.trades.some((t) => ctx.trades.includes(t));
  const tradeSpecific = (d: Doc) => !d.trades.includes('all');

  const ranked = INDEX.map((d) => {
    let score = bm25(queryTerms, d);
    if (score === 0) return { d, score };

    if (!d.modes.includes('all') && !d.modes.includes(mode)) score *= 0.55;

    if (tradeSpecific(d)) {
      if (tradeMatch(d)) score *= 1.6;
      else score *= ctx.trades.length ? 0.35 : 0.8;
    }

    if (!d.motions.includes('all') && ctx.motions.length) {
      score *= d.motions.some((m) => ctx.motions.includes(m)) ? 1.3 : 0.8;
    }

    if (beams.length && d.beams.some((b) => (beams as string[]).includes(b))) score *= 1.35;
    return { d, score };
  })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);

  // At most three sections from one file, so one long doc cannot crowd out the rest.
  const perFile = new Map<string, number>();
  for (const { d } of ranked) {
    if (picked.length >= limit) break;
    const file = d.kind === 'section' ? d.ref.split('#')[0] : d.kind;
    const n = perFile.get(file) ?? 0;
    if (d.kind === 'section' && n >= 3) continue;
    const before = picked.length;
    take(d, false);
    if (picked.length > before) perFile.set(file, n + 1);
  }

  // 3. A detected trade always brings its own pack, even when the words miss —
  //    a Spanish question about a roof should still get the roofing guardrails.
  for (const pack of ctx.tradePacks.slice(0, 2)) {
    if (picked.some((p) => p.ref.startsWith(`${pack}#`))) continue;
    if (kinds && !kinds.includes('section')) continue;
    const best =
      ranked.find((r) => r.d.pack === pack)?.d ?? DOC_BY_REF.get(`${pack}#critical-failures`);
    if (best) {
      // Makes room if needed: a trade pack outranks the weakest general item.
      if (picked.length >= limit) {
        let drop = picked.length - 1;
        while (drop >= 0 && picked[drop].mandatory) drop--;
        if (drop >= 0) {
          seen.delete(picked[drop].ref);
          used -= picked[drop].body.length;
          picked.splice(drop, 1);
        }
      }
      take(best, true);
    }
  }

  return picked;
}

/**
 * Which buyers can plausibly raise each objection family. No-bid is the
 * seller's own firm talking, so a buyer character never raises it; insurance
 * only comes up where there is a claim story to have it about.
 */
const OBJECTION_AUDIENCE: Record<string, 'residential' | 'commercial' | 'never'> = {
  'OB-005': 'residential', // repair only
  'OB-012': 'commercial', // commercial terms
  'OB-013': 'never', // no bid
  'OB-015': 'residential', // insurance
};
const INSURANCE_CONTEXT = /\b(insur\w*|claim\w*|deductib\w*|adjuster|carrier|storm|hail|water|mold|seguro|deducible|granizo)\b/i;

/** Objection records that best match what a buyer character will say. */
export function matchObjections(
  lines: string[],
  limit = 3,
  audience: 'residential' | 'commercial' = 'residential',
): Objection[] {
  const text = lines.join(' ');
  const scores = new Map<string, number>();
  for (const line of lines) {
    const terms = tokenize(line);
    for (const o of CORPUS.objections) {
      const d = DOC_BY_REF.get(o.id);
      if (!d) continue;
      const fit = OBJECTION_AUDIENCE[o.id];
      if (fit === 'never' || (fit && fit !== audience)) continue;
      if (o.id === 'OB-015' && !INSURANCE_CONTEXT.test(text)) continue;
      const s = bm25(terms, d);
      if (s > 1.5) scores.set(o.id, (scores.get(o.id) ?? 0) + s);
    }
  }
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => objectionById.get(id)!)
    .filter(Boolean);
}

// ─── Prompt rendering ─────────────────────────────────────────────────────────

/** Retrieved knowledge as a prompt block, each item tagged with its reference. */
export function renderRetrieved(items: RetrievedKnowledge[]): string {
  if (!items.length) return '(No additional knowledge base material matched this request.)';
  return items.map((i) => `[${i.ref}] ${i.label}\n${i.body}`).join('\n\n');
}

/** Short human label for the UI's source list. */
export function citationLabel(item: RetrievedKnowledge): string {
  const ref = item.kind === 'section' ? '' : `${item.ref} `;
  return `TRUSS KB · ${ref}${item.label}`;
}
