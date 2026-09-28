#!/usr/bin/env node
/**
 * Compiles the TRUSS training data into a module the app can import.
 *
 * Inputs (both authored outside the app, versioned together):
 *   - TRUSS_AI_Knowledge_Base_v<version>.md   the doctrine bundle
 *   - TRUSS_Sales_Intelligence_Repository/    structured records, sources, evals
 *
 * Output:
 *   - src/lib/truss/knowledge/corpus.generated.ts
 *
 * The output is committed, so a deploy that does not carry the repository
 * folder still ships the knowledge the prompts were written against. When the
 * sources are present this runs before `dev` and `build` and refreshes it.
 */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO = join(ROOT, 'TRUSS_Sales_Intelligence_Repository');
const OUTPUT = join(ROOT, 'src', 'lib', 'truss', 'knowledge', 'corpus.generated.ts');

function fail(message) {
  console.error(`[truss-knowledge] ${message}`);
  process.exit(1);
}

function warn(message) {
  console.warn(`[truss-knowledge] warning: ${message}`);
}

if (!existsSync(REPO)) {
  if (existsSync(OUTPUT)) {
    warn('repository folder not found; keeping the committed corpus.');
    process.exit(0);
  }
  fail(`repository folder not found at ${REPO} and no committed corpus exists.`);
}

const read = (rel) => readFileSync(join(REPO, rel), 'utf8');
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

// ─── Integrity ────────────────────────────────────────────────────────────────

const manifest = JSON.parse(read('manifest.json'));
const version = read('VERSION').trim();
if (manifest.version !== version) {
  warn(`manifest version ${manifest.version} differs from VERSION ${version}.`);
}

const drifted = [];
for (const file of manifest.files) {
  const path = join(REPO, file.path);
  if (!existsSync(path)) {
    drifted.push(`${file.path} (missing)`);
    continue;
  }
  if (sha256(readFileSync(path)) !== file.sha256) drifted.push(file.path);
}
if (drifted.length) {
  warn(`files changed since the repository manifest was built: ${drifted.join(', ')}`);
}

// The bundle at the project root is the one people hand around; the copy in
// dist/ is what the repository built. Prefer the root copy, flag divergence.
const bundleName = `TRUSS_AI_Knowledge_Base_v${version}.md`;
const rootBundle = join(ROOT, bundleName);
const distBundle = join(REPO, 'dist', bundleName);
const bundlePath = existsSync(rootBundle) ? rootBundle : distBundle;
if (!existsSync(bundlePath)) fail(`knowledge base bundle ${bundleName} not found.`);
if (existsSync(rootBundle) && existsSync(distBundle)) {
  if (sha256(readFileSync(rootBundle)) !== sha256(readFileSync(distBundle))) {
    warn(`${bundleName} at the project root differs from the repository dist/ copy; using the root copy.`);
  }
}
const bundle = readFileSync(bundlePath, 'utf8').replace(/\r\n/g, '\n');

// ─── Doctrine sections ────────────────────────────────────────────────────────

/**
 * The bundle is the ordered doctrine files joined with SOURCE FILE markers.
 * Each file is split at its `##` headings: a section is one complete rule,
 * process, or contract, which is the unit the repository says to retrieve.
 */
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const sections = [];
const fileBlocks = bundle.split(/\n---\n\n<!-- SOURCE FILE: (.+?) -->\n\n/);
// fileBlocks = [preamble, path1, body1, path2, body2, ...]
for (let i = 1; i < fileBlocks.length; i += 2) {
  const file = fileBlocks[i].trim();
  const body = fileBlocks[i + 1].trim();
  const titleMatch = body.match(/^# (.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : file;

  const parts = body.split(/^(?=## )/m);
  for (const part of parts) {
    const headingMatch = part.match(/^## (.+)$/m);
    const heading = headingMatch ? headingMatch[1].trim() : title;
    const text = part
      .replace(/^# .+$/m, '')
      .replace(/^## .+$/m, '')
      .trim();
    if (text.length < 40) continue;
    sections.push({
      id: `${file}#${slugify(heading)}`,
      file,
      title,
      heading,
      text,
    });
  }
}
if (sections.length < 50) fail(`only ${sections.length} doctrine sections parsed; the bundle format may have changed.`);

// ─── Structured records ───────────────────────────────────────────────────────

function jsonl(rel) {
  return read(rel)
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line, n) => {
      try {
        return JSON.parse(line);
      } catch {
        fail(`${rel}:${n + 1} is not valid JSON.`);
      }
    });
}

/** RFC 4180 enough for the repository's CSVs: quoted fields, embedded commas. */
function csv(rel) {
  const text = read(rel).replace(/\r\n/g, '\n');
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [header, ...body] = rows.filter((r) => r.some((f) => f.trim()));
  return body.map((r) => Object.fromEntries(header.map((h, j) => [h.trim(), (r[j] ?? '').trim()])));
}

const corpus = {
  version,
  builtAt: manifest.built_at,
  bundle: bundleName,
  sections,
  knowledgeUnits: jsonl('data/knowledge_units.jsonl'),
  objections: jsonl('data/objections.jsonl'),
  scenarios: jsonl('data/scenarios.jsonl'),
  campaignPatterns: jsonl('data/campaign_patterns.jsonl'),
  evalCases: jsonl('data/eval_cases.jsonl'),
  metrics: csv('data/metrics.csv'),
  sources: csv('data/source_registry.csv'),
};

// Every source a knowledge unit cites must exist, or its traceability is fiction.
const sourceIds = new Set(corpus.sources.map((s) => s.source_id));
for (const unit of corpus.knowledgeUnits) {
  for (const id of unit.source_ids ?? []) {
    if (!sourceIds.has(id)) warn(`${unit.id} cites unknown source ${id}.`);
  }
}

// ─── Emit ─────────────────────────────────────────────────────────────────────

const out =
  `/**\n` +
  ` * GENERATED by scripts/build-truss-knowledge.mjs from ${bundleName} and\n` +
  ` * TRUSS_Sales_Intelligence_Repository v${version}. Do not edit by hand:\n` +
  ` * change the repository, then run \`npm run knowledge:build\`.\n` +
  ` */\n\n` +
  `import type { Corpus } from './types';\n\n` +
  `export const CORPUS: Corpus = ${JSON.stringify(corpus, null, 1)};\n`;

mkdirSync(dirname(OUTPUT), { recursive: true });
const previous = existsSync(OUTPUT) ? readFileSync(OUTPUT, 'utf8') : '';
if (previous !== out) writeFileSync(OUTPUT, out);

console.log(
  `[truss-knowledge] v${version}: ${sections.length} doctrine sections, ` +
    `${corpus.knowledgeUnits.length} knowledge units, ${corpus.objections.length} objections, ` +
    `${corpus.scenarios.length} scenarios, ${corpus.campaignPatterns.length} campaign patterns, ` +
    `${corpus.metrics.length} metrics, ${corpus.sources.length} sources, ${corpus.evalCases.length} evals` +
    (previous === out ? ' (unchanged)' : ''),
);
