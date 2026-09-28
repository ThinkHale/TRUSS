# Contributing to TRUSS Sales Intelligence

## Contribution rule

Add knowledge only when it improves a defined decision, behavior, practice scenario, metric, or research claim. Volume is not the objective. Traceability and safe usefulness are.

## Workflow

1. State the buyer, trade, motion, stage, and intended mode.
2. Record the source in `data/source_registry.csv` and assign evidence grade A, B, C, or D.
3. Write an original synthesis. Do not paste copyrighted chapters, transcripts, courses, or paywalled materials.
4. Map the unit to one or more TRUSS beams.
5. State exceptions, prohibited behavior, and conditions that require a qualified professional.
6. Add or update an eval case when the contribution changes model behavior.
7. Run `python scripts/validate_repository.py`.
8. Increment the version and record the change.

## Review questions

- Is a claimed fact directly supported?
- Is a practitioner pattern labeled as a pattern rather than a universal benchmark?
- Does the advice fit the specific sales motion?
- Could following it create safety, legal, financial, technical, or reputational harm?
- Does it teach the earliest weak TRUSS beam?
- Would a reasonable buyer recognize the recommendation as transparent and relevant?

## Change classification

- Patch: wording, metadata, source refresh, or corrected example without behavior change.
- Minor: new trade, motion, module, scenario group, or compatible data field.
- Major: changed scoring logic, renamed beams, incompatible schema, or changed safety policy.

## Required records

Substantive updates should include the changed source record, knowledge unit, affected mode document, at least one adversarial eval case, and a changelog entry.
