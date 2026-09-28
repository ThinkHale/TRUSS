/**
 * Proves TRUSS AI is grounded in its training data.
 *
 *   npm run knowledge:check
 *     Offline, free, fast. Every prompt builder carries the knowledge base's
 *     core doctrine; sensitive topics force their guardrail units; every
 *     repository scenario is playable, keeps its hidden facts from the rep, and
 *     is scored against its own critical failures.
 *
 *   npm run knowledge:eval [-- --only EV-003,EV-011] [-- --critical]
 *     Live. Runs the repository's eval cases (data/eval_cases.jsonl) through
 *     the production prompts and grades each answer against the case's
 *     must_include / must_not lists. Needs OPENAI_API_KEY. The repository
 *     treats this as the release gate for any prompt, retrieval, scoring, or
 *     model change; a failed critical case exits non-zero.
 */

import OpenAI from 'openai';
import { MODELS } from '@/lib/ai/openai';
import {
  accountBriefSystemPrompt,
  buildScoringUserPrompt,
  campaignSystemPrompt,
  campaignUserPrompt,
  coachSystemPrompt,
  researchSystemPrompt,
  roleplayCharacterPrompt,
  scoringSystemPrompt,
} from '@/lib/ai/prompts';
import { evalCases, KNOWLEDGE_VERSION, retrieve, type TrussMode } from '@/lib/truss/knowledge';
import { SCENARIOS, type Scenario } from '@/lib/truss/scenarios';
import { scorecardSchema } from '@/lib/truss/scoring';

const args = process.argv.slice(2);
const live = args.includes('--live');
const criticalOnly = args.includes('--critical');
const only = args.find((a, i) => args[i - 1] === '--only')?.split(',');

const failures: string[] = [];
function check(ok: unknown, message: string) {
  if (!ok) failures.push(message);
}

// ─── Offline: grounding is present everywhere ────────────────────────────────

const CORE_MARKERS = [
  `TRUSS KNOWLEDGE BASE — v${KNOWLEDGE_VERSION}`,
  'THE TRUSS METHOD',
  'SALES CONTEXT ROUTER',
  'Never invent hazards, diagnoses, code requirements',
  'RETRIEVED FOR THIS REQUEST',
];

const library = SCENARIOS.filter((s) => s.library);
const handwritten = SCENARIOS.filter((s) => !s.library);

const builders: [string, string, string][] = [
  ['coach', 'COACH MODE CONTRACT', coachSystemPrompt({}, { query: 'buyer said the price is too high' }).system],
  ['coach (stage focus)', 'COACH MODE CONTRACT', coachSystemPrompt({}, { query: 'opening at the door', stageFocus: 'trust' }).system],
  ['scoring', 'PRACTICE MODE CONTRACT', scoringSystemPrompt(library[0], {}, []).system],
  ['campaign', 'CAMPAIGN CREATION MODE CONTRACT', campaignSystemPrompt({}, 'maintenance renewal email').system],
  ['research', 'MARKET RESEARCH MODE CONTRACT', researchSystemPrompt({}, 'Plano, TX hail report').system],
  ['account brief', 'ACCOUNT REVIEW MODE CONTRACT', accountBriefSystemPrompt({}, 'commercial HVAC renewal').system],
];

for (const [name, contract, system] of builders) {
  for (const marker of [...CORE_MARKERS, contract]) {
    check(system.includes(marker), `${name} prompt is missing "${marker}"`);
  }
  check(system.length < 40_000, `${name} prompt is ${system.length} chars; over the 40k budget`);
}

// The knowledge base describes its own practice output in "beams"; the app
// parses "stages". Without the explicit shape the scorer follows the former.
const scoringPrompt = scoringSystemPrompt(library[0], {}, []).system;
check(scoringPrompt.includes('"stages": ['), 'scoring prompt does not pin the scorecard JSON shape');
check(
  campaignUserPrompt('brief', 1).includes('"hold"'),
  'campaign user prompt does not offer the hold response the knowledge base requires',
);

/** Sensitive topics must pull their guardrail units whatever else ranks. */
const GUARDRAIL_EXPECTATIONS: [TrussMode, string, string[]][] = [
  ['coach', 'The homeowner asked if we can waive the deductible', ['KU-022', 'OB-015']],
  ['coach', '¿Puedo cubrir el deducible del cliente?', ['KU-022']],
  ['coach', 'I told them the panel could burn the house down', ['KU-020']],
  ['coach', 'How do I present financing at $189 per month?', ['KU-026']],
  ['coach', 'Can I promise the ants will never come back?', ['KU-024']],
  ['coach', 'What is a good close rate for HVAC replacement?', ['KU-042']],
  ['campaign_creation', 'Text blast to past customers after the hail storm', ['KU-039', 'KU-021']],
  ['market_research', "Did yesterday's hail damage every roof in the county?", ['KU-021']],
];
for (const [mode, query, refs] of GUARDRAIL_EXPECTATIONS) {
  const got = retrieve({ mode, query }).map((r) => r.ref);
  for (const ref of refs) check(got.includes(ref), `"${query}" did not retrieve ${ref} (got ${got.join(', ')})`);
}

/** A named trade always brings its pack. */
const TRADE_EXPECTATIONS: [string, string][] = [
  ['No-cool call, rep pitched replacement before taking readings', 'docs/04_trades/hvac.md#'],
  ['Recurring drain backup after two clearings', 'docs/04_trades/plumbing.md#'],
  ['El techo tiene daño de granizo', 'docs/04_trades/roofing_and_exteriors.md#'],
  ['Kitchen remodel with a move-in deadline', 'docs/04_trades/remodeling_and_general_contracting.md#'],
];
for (const [query, prefix] of TRADE_EXPECTATIONS) {
  const got = retrieve({ mode: 'coach', query }).map((r) => r.ref);
  check(got.some((r) => r.startsWith(prefix)), `"${query}" did not retrieve ${prefix}`);
}

for (const c of evalCases()) {
  const got = retrieve({ mode: c.mode, query: JSON.stringify(c.input) });
  check(got.length >= 3, `${c.id} retrieved only ${got.length} items`);
}

/** The repository scenario library is playable and scored on its own terms. */
check(library.length === 20, `expected 20 library scenarios, found ${library.length}`);
for (const s of library) {
  const lib = s.library!;
  const source = `${s.id} (${lib.sourceId})`;
  const character = roleplayCharacterPrompt(s);
  const scoring = scoringSystemPrompt(s, {}, []).system;
  const hidden = s.characterBrief.split('\n').filter((l) => l.startsWith('  - ')).map((l) => l.slice(4));

  check(hidden.length > 0, `${source} has no hidden facts in its brief`);
  for (const fact of hidden) {
    check(character.includes(fact), `${source} character prompt lacks hidden fact "${fact}"`);
    check(!s.setup.includes(fact) && !s.title.includes(fact), `${source} leaks hidden fact "${fact}" to the rep`);
  }
  for (const failure of lib.criticalFailures) {
    check(scoring.includes(failure), `${source} scoring prompt lacks critical failure "${failure}"`);
  }
  check(s.objections.length > 0, `${source} has no objections`);
  check(character.length < 12_000, `${source} roleplay prompt is ${character.length} chars; too long for Realtime`);
}
for (const s of handwritten) {
  check(roleplayCharacterPrompt(s).includes('Simulation behavior'), `${s.id} roleplay lacks simulation rules`);
}

console.log(
  `TRUSS knowledge base v${KNOWLEDGE_VERSION}: ${builders.length} prompt builders, ` +
    `${GUARDRAIL_EXPECTATIONS.length + TRADE_EXPECTATIONS.length} retrieval expectations, ` +
    `${library.length} library + ${handwritten.length} built-in scenarios, ${evalCases().length} eval cases.`,
);
if (failures.length) {
  console.error(`\n${failures.length} grounding check(s) failed:\n  - ${failures.join('\n  - ')}`);
  process.exit(1);
}
console.log('All grounding checks passed.');

if (!live) process.exit(0);

// ─── Live: the repository's behavior evals ───────────────────────────────────

if (!process.env.OPENAI_API_KEY) {
  console.error('\n--live needs OPENAI_API_KEY.');
  process.exit(1);
}
const client = new OpenAI();

function describe(input: Record<string, unknown>): string {
  return Object.entries(input)
    .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
    .join('\n');
}

async function complete(system: string, user: string, json = false): Promise<string> {
  const res = await client.chat.completions.create({
    model: json ? MODELS.structured : MODELS.coach,
    temperature: json ? 0 : 0.4,
    ...(json ? { response_format: { type: 'json_object' as const } } : {}),
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });
  return res.choices[0]?.message?.content ?? '';
}

interface Run {
  answer: string;
  /** Deterministic findings the grader cannot overrule, e.g. a score cap. */
  hardFailures: string[];
}

async function runCase(c: ReturnType<typeof evalCases>[number]): Promise<Run> {
  const input = c.input as Record<string, string>;
  const text = describe(input);

  switch (c.mode) {
    case 'coach': {
      const user = `Coach me on this.\n${text}`;
      return { answer: await complete(coachSystemPrompt({}, { query: user }).system, user), hardFailures: [] };
    }
    case 'practice': {
      // The whole practice loop: the buyer character replies, then the real
      // scorer grades the exchange. Cases test both.
      const scenario = library.find((s) => s.library!.sourceId === input.scenario_id) as Scenario;
      const reply = await complete(roleplayCharacterPrompt(scenario), input.learner_message);
      const turns = [
        { role: 'rep' as const, text: input.learner_message },
        { role: 'character' as const, text: reply },
      ];
      const raw = await complete(
        scoringSystemPrompt(scenario, {}, turns).system,
        buildScoringUserPrompt(turns),
        true,
      );

      const hardFailures: string[] = [];
      const card = scorecardSchema.safeParse(JSON.parse(raw || '{}'));
      if (!card.success) {
        hardFailures.push('scorecard did not match the schema the app parses');
        return { answer: `BUYER REPLY: ${reply}`, hardFailures };
      }

      // Score caps are checked against the real scorer, not the grader.
      const caps = (c.expected.score_caps ?? {}) as Record<string, number>;
      for (const [beam, cap] of Object.entries(caps)) {
        const score = card.data.stages.find((s) => s.stage === beam.toLowerCase())?.score;
        if (score === undefined || score > cap) hardFailures.push(`${beam} scored ${score}, cap is ${cap}`);
      }

      const scores = card.data.stages.map((s) => `${s.stage} ${s.score}`).join(', ');
      return {
        answer:
          `BUYER REPLY: ${reply}\n\nPOST-ROLEPLAY SCORECARD\nScores: ${scores}\n` +
          `Headline: ${card.data.headline}\nSummary: ${card.data.summary}`,
        hardFailures,
      };
    }
    case 'campaign_creation': {
      // Exactly what the campaigns route sends, for two channels.
      const raw = await complete(campaignSystemPrompt({}, text).system, campaignUserPrompt(text, 2), true);
      return { answer: raw, hardFailures: [] };
    }
    case 'account_review': {
      const user = `Brief me on this account before my next visit.\n${text}`;
      return { answer: await complete(accountBriefSystemPrompt({}, text).system, user), hardFailures: [] };
    }
    case 'market_research': {
      return { answer: await complete(researchSystemPrompt({}, text).system, text), hardFailures: [] };
    }
  }
}

const GRADER = `You grade one answer from TRUSS, a sales intelligence system for the trades,
against an evaluation case from the TRUSS Sales Intelligence Repository. Judge substance, not
wording: an item is met if the answer clearly does what it describes. A practice case has two
parts: the roleplay buyer's reply, where items about the buyer's reaction and staying in role
apply, and the post-roleplay scorecard, where items about findings, violations, and feedback
apply. A campaign case is the JSON the app received: a "hold" with missing inputs, or "pieces".
Return JSON: {"must_include":[{"item":string,"met":boolean,"why":string}],
"must_not":[{"item":string,"violated":boolean,"why":string}],
"consistent_with_expected":boolean,"note":string}`;

const selected = evalCases().filter(
  (c) => (!only || only.includes(c.id)) && (!criticalOnly || c.critical),
);
let criticalFailed = 0;
let failed = 0;

console.log(`\nRunning ${selected.length} eval case(s) against ${MODELS.coach}...\n`);
for (const c of selected) {
  try {
    const run = await runCase(c);
    const verdict = JSON.parse(
      await complete(
        GRADER,
        `CASE ${c.id} (${c.mode})\nInput: ${JSON.stringify(c.input)}\nExpected: ${JSON.stringify(c.expected)}\n` +
          `Must include: ${JSON.stringify(c.must_include)}\nMust not: ${JSON.stringify(c.must_not)}\n\n` +
          `ANSWER\n${run.answer}`,
        true,
      ),
    ) as {
      must_include: { item: string; met: boolean; why: string }[];
      must_not: { item: string; violated: boolean; why: string }[];
      note: string;
    };

    const misses = [
      ...verdict.must_include.filter((i) => !i.met).map((i) => `missing "${i.item}": ${i.why}`),
      ...verdict.must_not.filter((i) => i.violated).map((i) => `violated "${i.item}": ${i.why}`),
      ...run.hardFailures,
    ];
    const pass = misses.length === 0;
    if (!pass) {
      failed++;
      if (c.critical) criticalFailed++;
    }
    console.log(`${pass ? 'PASS' : 'FAIL'}  ${c.id}  ${c.mode}${c.critical ? '  [critical]' : ''}`);
    for (const m of misses) console.log(`        ${m}`);
  } catch (err) {
    failed++;
    if (c.critical) criticalFailed++;
    console.log(`ERROR ${c.id}  ${err instanceof Error ? err.message : String(err)}`);
  }
}

console.log(`\n${selected.length - failed}/${selected.length} passed; ${criticalFailed} critical failure(s).`);
process.exit(criticalFailed ? 1 : 0);
