#!/usr/bin/env python3
"""Validate and score SKILL.md trigger evaluation cases."""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
CASES_PATH = HERE / "trigger_queries.json"
SKILL_PATH = ROOT / "SKILL.md"
DESCRIPTION_MAX_LENGTH = 1024
VALID_SPLITS = {"train", "validation"}


def fail(message: str) -> None:
    print(f"FAIL: {message}", file=sys.stderr)
    raise SystemExit(1)


def load_suite() -> dict[str, Any]:
    try:
        data = json.loads(CASES_PATH.read_text(encoding="utf-8"))
    except OSError as exc:
        fail(f"could not read {CASES_PATH}: {exc}")
    except json.JSONDecodeError as exc:
        fail(f"{CASES_PATH} is not valid JSON: {exc}")
    if not isinstance(data, dict):
        fail("suite root must be an object")
    return data


def skill_description() -> str:
    text = SKILL_PATH.read_text(encoding="utf-8")
    if not text.startswith("---\n"):
        fail("SKILL.md must start with YAML frontmatter")
    end = text.find("\n---", 4)
    if end == -1:
        fail("SKILL.md frontmatter must end with ---")
    for line in text[4:end].splitlines():
        if line.startswith("description:"):
            return line.split(":", 1)[1].strip().strip('"')
    fail("SKILL.md frontmatter is missing description")


def validate_suite(data: dict[str, Any]) -> list[dict[str, Any]]:
    cases = data.get("cases")
    if not isinstance(cases, list):
        fail("suite must contain a cases array")
    if len(cases) != 20:
        fail(f"expected 20 trigger cases, found {len(cases)}")

    ids: set[str] = set()
    split_counts: Counter[str] = Counter()
    polarity_counts: dict[str, Counter[bool]] = defaultdict(Counter)
    for idx, case in enumerate(cases, 1):
        if not isinstance(case, dict):
            fail(f"case {idx} must be an object")
        case_id = case.get("id")
        if not isinstance(case_id, str) or not case_id:
            fail(f"case {idx} has missing id")
        if case_id in ids:
            fail(f"duplicate case id: {case_id}")
        ids.add(case_id)

        split = case.get("split")
        if split not in VALID_SPLITS:
            fail(f"{case_id} has invalid split: {split!r}")
        expected = case.get("expected_trigger")
        if not isinstance(expected, bool):
            fail(f"{case_id} expected_trigger must be boolean")
        query = case.get("query")
        if not isinstance(query, str) or len(query.strip()) < 20:
            fail(f"{case_id} query must be a realistic non-empty string")
        tags = case.get("tags")
        if not isinstance(tags, list) or not tags:
            fail(f"{case_id} must include at least one tag")

        split_counts[split] += 1
        polarity_counts[split][expected] += 1

    if split_counts["train"] != 12 or split_counts["validation"] != 8:
        fail(f"expected train=12 and validation=8, found {dict(split_counts)}")
    for split in VALID_SPLITS:
        expected_true = 6 if split == "train" else 4
        expected_false = 6 if split == "train" else 4
        if polarity_counts[split][True] != expected_true:
            fail(f"{split} should-trigger count must be {expected_true}")
        if polarity_counts[split][False] != expected_false:
            fail(f"{split} should-not-trigger count must be {expected_false}")

    description = skill_description()
    if len(description) > DESCRIPTION_MAX_LENGTH:
        fail(
            "SKILL.md description exceeds "
            f"{DESCRIPTION_MAX_LENGTH} characters ({len(description)})"
        )
    return cases


def selected_cases(cases: list[dict[str, Any]], split: str | None) -> list[dict[str, Any]]:
    if split is None:
        return cases
    return [case for case in cases if case["split"] == split]


def init_results(cases: list[dict[str, Any]], path: Path) -> None:
    payload = {
        "suite": str(CASES_PATH.relative_to(ROOT)),
        "description": skill_description(),
        "results": [
            {
                "id": case["id"],
                "split": case["split"],
                "expected_trigger": case["expected_trigger"],
                "actual_trigger": None,
                "notes": ""
            }
            for case in cases
        ],
    }
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote results template: {path}")


def load_results(path: Path) -> dict[str, bool]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except OSError as exc:
        fail(f"could not read results file {path}: {exc}")
    except json.JSONDecodeError as exc:
        fail(f"results file is not valid JSON: {exc}")
    rows = payload.get("results")
    if not isinstance(rows, list):
        fail("results file must contain a results array")
    actual: dict[str, bool] = {}
    for row in rows:
        if not isinstance(row, dict):
            fail("each result row must be an object")
        case_id = row.get("id")
        value = row.get("actual_trigger")
        if not isinstance(case_id, str):
            fail("each result row must include an id")
        if not isinstance(value, bool):
            fail(f"{case_id} actual_trigger must be true or false")
        actual[case_id] = value
    return actual


def score_results(data: dict[str, Any], cases: list[dict[str, Any]], path: Path) -> int:
    actual = load_results(path)
    by_split: dict[str, list[dict[str, Any]]] = {
        split: selected_cases(cases, split) for split in sorted(VALID_SPLITS)
    }
    criteria = data.get("pass_criteria", {})
    failed = False
    print("Trigger eval results")
    print("====================")
    for split, split_cases in by_split.items():
        missing = [case["id"] for case in split_cases if case["id"] not in actual]
        if missing:
            fail(f"results missing {split} cases: {', '.join(missing)}")
        total = len(split_cases)
        correct = 0
        fp = 0
        fn = 0
        misses: list[str] = []
        for case in split_cases:
            expected = case["expected_trigger"]
            got = actual[case["id"]]
            if got == expected:
                correct += 1
            elif got and not expected:
                fp += 1
                misses.append(f"{case['id']} false positive")
            else:
                fn += 1
                misses.append(f"{case['id']} false negative")
        accuracy = correct / total
        split_criteria = criteria.get(split, {})
        min_accuracy = split_criteria.get("minimum_accuracy", 1.0)
        max_fp = split_criteria.get("maximum_false_positives", 0)
        max_fn = split_criteria.get("maximum_false_negatives", 0)
        ok = accuracy >= min_accuracy and fp <= max_fp and fn <= max_fn
        failed = failed or not ok
        status = "PASS" if ok else "FAIL"
        print(
            f"{split}: {status} accuracy={accuracy:.2%} "
            f"false_positives={fp} false_negatives={fn}"
        )
        for miss in misses:
            print(f"  - {miss}")
    return 1 if failed else 0


def print_prompts(cases: list[dict[str, Any]]) -> None:
    for case in cases:
        expected = "TRIGGER" if case["expected_trigger"] else "NO TRIGGER"
        print(f"[{case['split']}] {case['id']} expected={expected}")
        print(case["query"])
        print()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--split", choices=sorted(VALID_SPLITS))
    parser.add_argument("--print-prompts", action="store_true")
    parser.add_argument("--init-results", type=Path)
    parser.add_argument("--results", type=Path)
    args = parser.parse_args()

    data = load_suite()
    cases = validate_suite(data)
    cases_to_show = selected_cases(cases, args.split)

    if args.print_prompts:
        print_prompts(cases_to_show)
    if args.init_results:
        init_results(cases, args.init_results)
    if args.results:
        return score_results(data, cases, args.results)
    if not (args.print_prompts or args.init_results or args.results):
        print(
            "PASS: trigger suite structure is valid "
            f"({len(cases)} cases; SKILL.md description <= 1024 chars)"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
