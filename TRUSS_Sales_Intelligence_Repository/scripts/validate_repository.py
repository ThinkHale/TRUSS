#!/usr/bin/env python3
"""Validate the TRUSS repository using only the Python standard library."""

from __future__ import annotations

import csv
import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
SCHEMAS = ROOT / "schemas"

DATASETS = {
    "knowledge_units.jsonl": ("KU", "knowledge_unit.schema.json"),
    "scenarios.jsonl": ("SC", "scenario.schema.json"),
    "objections.jsonl": ("OB", "objection.schema.json"),
    "campaign_patterns.jsonl": ("CP", "campaign_pattern.schema.json"),
    "eval_cases.jsonl": ("EV", "eval_case.schema.json"),
}


def load_json(path: Path):
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def load_jsonl(path: Path):
    rows = []
    with path.open(encoding="utf-8") as handle:
        for line_number, raw in enumerate(handle, start=1):
            if not raw.strip():
                continue
            try:
                rows.append((line_number, json.loads(raw)))
            except json.JSONDecodeError as exc:
                raise ValueError(f"{path.name}:{line_number}: invalid JSON: {exc}") from exc
    return rows


def validate_value(value, rule, location, errors):
    expected = rule.get("type")
    type_map = {
        "object": dict,
        "array": list,
        "string": str,
        "integer": int,
        "boolean": bool,
    }
    if expected and not isinstance(value, type_map[expected]):
        errors.append(f"{location}: expected {expected}")
        return
    if "enum" in rule and value not in rule["enum"]:
        errors.append(f"{location}: {value!r} is outside enum")
    if isinstance(value, str):
        if len(value) < rule.get("minLength", 0):
            errors.append(f"{location}: shorter than minLength")
        if "pattern" in rule and not re.match(rule["pattern"], value):
            errors.append(f"{location}: does not match {rule['pattern']}")
    if isinstance(value, int) and not isinstance(value, bool):
        if "minimum" in rule and value < rule["minimum"]:
            errors.append(f"{location}: below minimum")
        if "maximum" in rule and value > rule["maximum"]:
            errors.append(f"{location}: above maximum")
    if isinstance(value, list):
        if len(value) < rule.get("minItems", 0):
            errors.append(f"{location}: fewer than minItems")
        if rule.get("uniqueItems"):
            rendered = [json.dumps(item, sort_keys=True) for item in value]
            if len(rendered) != len(set(rendered)):
                errors.append(f"{location}: duplicate array items")
        item_rule = rule.get("items", {})
        for index, item in enumerate(value):
            validate_value(item, item_rule, f"{location}[{index}]", errors)
    if isinstance(value, dict):
        for required in rule.get("required", []):
            if required not in value:
                errors.append(f"{location}: missing {required}")
        for key, child in value.items():
            if key in rule.get("properties", {}):
                validate_value(child, rule["properties"][key], f"{location}.{key}", errors)
            elif rule.get("additionalProperties") is False:
                errors.append(f"{location}: unexpected property {key}")


def main():
    errors = []
    warnings = []

    with (DATA / "source_registry.csv").open(encoding="utf-8", newline="") as handle:
        sources = list(csv.DictReader(handle))
    source_ids = {row["source_id"] for row in sources}
    if len(source_ids) != len(sources):
        errors.append("source_registry.csv: duplicate source_id")
    for row_number, row in enumerate(sources, start=2):
        if not re.fullmatch(r"S\d{3}", row["source_id"]):
            errors.append(f"source_registry.csv:{row_number}: malformed source_id")
        if row["grade"] not in {"A", "B", "C", "D"}:
            errors.append(f"source_registry.csv:{row_number}: invalid grade")
        if not row["url"].startswith("https://"):
            errors.append(f"source_registry.csv:{row_number}: URL must use https")

    all_ids = set()
    counts = {}
    loaded = {}
    for filename, (prefix, schema_name) in DATASETS.items():
        path = DATA / filename
        schema = load_json(SCHEMAS / schema_name)
        rows = load_jsonl(path)
        loaded[filename] = [item for _, item in rows]
        counts[filename] = len(rows)
        for line_number, item in rows:
            location = f"{filename}:{line_number}"
            validate_value(item, schema, location, errors)
            item_id = item.get("id")
            if item_id in all_ids:
                errors.append(f"{location}: duplicate global id {item_id}")
            all_ids.add(item_id)
            if not str(item_id).startswith(prefix + "-"):
                errors.append(f"{location}: expected {prefix} id")
            for source_id in item.get("source_ids", []):
                if source_id not in source_ids:
                    errors.append(f"{location}: unknown source {source_id}")

    scenario_ids = {item["id"] for item in loaded["scenarios.jsonl"]}
    for item in loaded["eval_cases.jsonl"]:
        scenario_id = item.get("input", {}).get("scenario_id")
        if scenario_id and scenario_id not in scenario_ids:
            errors.append(f"eval_cases.jsonl:{item['id']}: unknown scenario {scenario_id}")

    metric_path = DATA / "metrics.csv"
    with metric_path.open(encoding="utf-8", newline="") as handle:
        metrics = list(csv.DictReader(handle))
    counts[metric_path.name] = len(metrics)
    metric_ids = [row.get("metric_id") for row in metrics]
    if len(metric_ids) != len(set(metric_ids)):
        errors.append("metrics.csv: duplicate metric_id")
    for row_number, row in enumerate(metrics, start=2):
        if not re.fullmatch(r"M\d{3}", row.get("metric_id", "")):
            errors.append(f"metrics.csv:{row_number}: malformed metric_id")
        if row.get("leading_or_lagging") not in {"leading", "lagging"}:
            errors.append(f"metrics.csv:{row_number}: invalid indicator type")

    citation_pattern = re.compile(r"\[\^(S\d{3})\]")
    for path in ROOT.glob("docs/**/*.md"):
        text = path.read_text(encoding="utf-8")
        for source_id in citation_pattern.findall(text):
            if source_id not in source_ids:
                errors.append(f"{path.relative_to(ROOT)}: unknown citation {source_id}")
        if "—" in text or "–" in text:
            errors.append(f"{path.relative_to(ROOT)}: contains prohibited dash character")

    for path in list(DATA.glob("*")) + list(SCHEMAS.glob("*.json")):
        text = path.read_text(encoding="utf-8")
        if "—" in text or "–" in text:
            errors.append(f"{path.relative_to(ROOT)}: contains prohibited dash character")

    cited = set()
    for path in ROOT.glob("docs/**/*.md"):
        cited.update(citation_pattern.findall(path.read_text(encoding="utf-8")))
    uncited = sorted(source_ids - cited)
    if uncited:
        warnings.append(f"{len(uncited)} registry sources are not directly cited in narrative docs")

    print("TRUSS repository validation")
    for filename, count in sorted(counts.items()):
        print(f"  {filename}: {count}")
    print(f"  sources: {len(sources)}")
    print(f"  narrative citations: {len(cited)} unique sources")
    for warning in warnings:
        print(f"WARNING: {warning}")
    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1
    print("PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
