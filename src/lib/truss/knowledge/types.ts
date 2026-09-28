/**
 * Shapes of the TRUSS training data, as compiled from the Sales Intelligence
 * Repository. Field names follow the repository's own schemas
 * (TRUSS_Sales_Intelligence_Repository/schemas) so a record reads the same
 * here as it does there.
 */

export type Beam = 'trust' | 'relate' | 'understand' | 'solve' | 'secure';

export type TrussMode =
  | 'coach'
  | 'practice'
  | 'campaign_creation'
  | 'account_review'
  | 'market_research';

/** One `##` section of a doctrine file in the knowledge base bundle. */
export interface DoctrineSection {
  /** `docs/04_trades/hvac.md#discovery` */
  id: string;
  file: string;
  /** The file's `#` title, e.g. "HVAC Sales Pack". */
  title: string;
  heading: string;
  text: string;
}

export interface KnowledgeUnit {
  id: string;
  title: string;
  content: string;
  beams: string[];
  modes: string[];
  trades: string[];
  motions: string[];
  buyers: string[];
  stages: string[];
  claim_type: string;
  evidence_grade: string;
  source_ids: string[];
  applies_when: string;
  exceptions: string;
  prohibited: string;
  reviewed_at: string;
  version: string;
}

export interface Objection {
  id: string;
  family: string;
  utterances: string[];
  likely_meanings: string[];
  clarifiers: string[];
  response_directions: string[];
  prohibited: string[];
  beams: string[];
}

export interface LibraryScenario {
  id: string;
  trade: string;
  motion: string;
  channel: string;
  difficulty: number;
  visible_situation: string;
  buyer_state: string;
  hidden_facts: string[];
  priorities: string[];
  constraints: string[];
  expected_behaviors: string[];
  acceptable_outcomes: string[];
  critical_failures: string[];
}

export interface CampaignPattern {
  id: string;
  name: string;
  audience: string;
  trades: string[];
  trigger: string;
  trust: string;
  relate: string;
  understand: string;
  solve: string;
  secure: string;
  required_inputs: string[];
  metrics: string[];
  prohibited: string[];
}

export interface EvalCase {
  id: string;
  mode: TrussMode;
  input: Record<string, unknown>;
  expected: Record<string, unknown>;
  must_include: string[];
  must_not: string[];
  critical: boolean;
}

export type Metric = Record<
  | 'metric_id'
  | 'name'
  | 'category'
  | 'definition'
  | 'formula'
  | 'numerator'
  | 'denominator'
  | 'grain'
  | 'required_segments'
  | 'leading_or_lagging'
  | 'guardrail',
  string
>;

export type Source = Record<
  | 'source_id'
  | 'grade'
  | 'evidence_type'
  | 'publisher'
  | 'title'
  | 'format'
  | 'trade_or_motion'
  | 'topic'
  | 'published_or_current'
  | 'url'
  | 'rights_status'
  | 'contribution'
  | 'limitation'
  | 'reviewed_at',
  string
>;

export interface Corpus {
  version: string;
  builtAt: string;
  bundle: string;
  sections: DoctrineSection[];
  knowledgeUnits: KnowledgeUnit[];
  objections: Objection[];
  scenarios: LibraryScenario[];
  campaignPatterns: CampaignPattern[];
  evalCases: EvalCase[];
  metrics: Metric[];
  sources: Source[];
}
