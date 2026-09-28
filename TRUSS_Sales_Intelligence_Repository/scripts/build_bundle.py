#!/usr/bin/env python3
"""Build a single Markdown upload bundle from the ordered TRUSS doctrine."""

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "dist" / "TRUSS_AI_Knowledge_Base_v1.0.0.md"

ORDER = [
    "README.md",
    "docs/00_governance/evidence_rights_and_maintenance.md",
    "docs/01_method/truss_method.md",
    "docs/01_method/context_router.md",
    "docs/02_doctrine/residential_sales.md",
    "docs/02_doctrine/commercial_sales.md",
    "docs/02_doctrine/objections_negotiation_and_decisions.md",
    "docs/02_doctrine/front_office_followup_and_handoff.md",
    "docs/03_modes/coach.md",
    "docs/03_modes/practice.md",
    "docs/03_modes/campaign_creation.md",
    "docs/03_modes/account_review.md",
    "docs/03_modes/market_research.md",
    "docs/04_trades/hvac.md",
    "docs/04_trades/plumbing.md",
    "docs/04_trades/electrical.md",
    "docs/04_trades/roofing_and_exteriors.md",
    "docs/04_trades/remodeling_and_general_contracting.md",
    "docs/04_trades/recurring_property_services.md",
    "docs/04_trades/commercial_specialty_contracting.md",
    "docs/05_metrics/metric_dictionary.md",
    "docs/05_metrics/scorecards_and_benchmarks.md",
    "docs/06_training/eight_week_curriculum.md",
    "docs/07_implementation/ingestion_retrieval_and_versioning.md",
    "docs/07_implementation/prompt_and_output_contracts.md",
    "docs/07_implementation/retrieval_queries_and_routing_examples.md",
    "docs/08_research/master_synthesis.md",
    "docs/08_research/practitioner_and_platform_ingestion_queue.md",
]


def main():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    parts = [
        "# TRUSS AI Sales Knowledge Base\n",
        "Version 1.0.0 | 2026-09-09\n",
        "This bundle is the single-file companion to the structured repository. "
        "Use the repository JSONL and CSV assets for filtered retrieval, simulations, analytics, and evaluations.\n",
    ]
    for relative in ORDER:
        path = ROOT / relative
        if not path.exists():
            raise FileNotFoundError(relative)
        parts.append(f"\n---\n\n<!-- SOURCE FILE: {relative} -->\n\n")
        parts.append(path.read_text(encoding="utf-8").strip())
        parts.append("\n")
    OUTPUT.write_text("\n".join(parts), encoding="utf-8")
    print(OUTPUT)


if __name__ == "__main__":
    main()
