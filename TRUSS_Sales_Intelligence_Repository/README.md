# TRUSS Sales Intelligence Repository

Version 1.0.0

This repository is the initial operating knowledge system for TRUSS, an AI sales intelligence, training, and performance platform for the trades. It converts sales research, trade context, performance measurement, and practitioner knowledge into source-tagged material for five product modes:

1. Coach
2. Practice
3. Campaign Creation
4. Account Review
5. Market Research

TRUSS is built around five behaviors:

| Beam | Operating principle |
| --- | --- |
| Trust | Earn credibility before asking for commitment. |
| Relate | Understand the person, context, priorities, and stakes. |
| Understand | Diagnose the real need through disciplined discovery. |
| Solve | Connect the right solution to what the customer actually values. |
| Secure | Create clarity, resolve uncertainty, and confidently establish the next commitment. |

## Start here

- `docs/01_method/truss_method.md`: authoritative method definition and scoring anchors
- `docs/01_method/context_router.md`: sales-motion classification before coaching
- `docs/03_modes/`: operating contracts for each TRUSS mode
- `docs/04_trades/`: trade-specific discovery, proof, objection, and risk guidance
- `docs/05_metrics/`: metric dictionary and coaching scorecards
- `docs/06_training/`: eight-week training and field-practice system
- `docs/07_implementation/`: retrieval, prompting, versioning, and evaluation design
- `docs/08_research/master_synthesis.md`: detailed research synthesis with citations
- `data/`: machine-readable knowledge units, source records, metrics, scenarios, objections, campaign patterns, and evals
- `schemas/`: JSON Schemas for structured records
- `scripts/validate_repository.py`: integrity checker

## Core product rule

TRUSS must classify the sales motion before it recommends language, benchmarks performance, or scores behavior. An emergency service visit, planned replacement, technician recommendation, remodeling project, canvassing interaction, commercial service account, and commercial project pursuit are different selling environments.

## Evidence labels

- `A`: law, government guidance, standards, original data, or peer-reviewed research
- `B`: transparent industry or platform research with a defined population
- `C`: established practitioner method, book, podcast, course, or roleplay
- `D`: anecdote, promotional claim, or unverified opinion

Facts and numeric benchmarks require A or B evidence. C sources may inform language, drills, and hypotheses. D sources may identify questions, but they do not become doctrine without validation.

## Recommended deployment

Use the repository in four layers:

1. Keep behavioral rules and mode contracts in versioned application instructions.
2. Load doctrine and trade packs into retrieval.
3. Use the JSONL files as structured retrieval records and application fixtures.
4. Run the eval set before releasing a prompt, retrieval, scoring, or model change.

Changing facts belong in retrieval, not in a model's learned memory. Fine-tuning, where available, should be considered only after strong prompts, representative evals, and production examples exist.

## Non-negotiable guardrails

- Never invent hazards, diagnoses, code requirements, insurance outcomes, savings, scarcity, or competitor deficiencies.
- Never hide total price, material exclusions, financing terms, recurring obligations, or cancellation rights.
- Never score close rate alone. Include margin, cancellations, callbacks, complaints, financing fallout, and handoff quality.
- Never use a benchmark without its population, period, source, and comparability warning.
- Never treat public sales advice as technical, legal, financial, or safety authority.
- Route jurisdiction-specific questions to verified local requirements or qualified review.

## Status

Version 1.0 establishes the shared methodology, operating modes, priority trade packs, metrics, scenario library, source registry, and initial evaluation set. The next maturity step is permissioned customer call data linked to outcomes, segmented by trade, motion, lead source, ticket type, geography, season, and seller tenure.
