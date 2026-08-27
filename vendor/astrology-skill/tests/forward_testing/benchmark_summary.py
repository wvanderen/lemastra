#!/usr/bin/env python3
"""Summarize blind forward-test retrieval/length benchmark drift.

The normal validation path is provider-free: it reads the current clean-run
baseline from ``forward_test_findings_td-846f9a.md`` and checks that the
threshold math is sane. When a future blind run exists, pass ``--runs-dir`` to
derive words/read counts from extracted artifacts instead.
"""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path

HERE = Path(__file__).resolve().parent
PROMPTS = HERE / "structured_reading_prompts.md"
BASELINE = HERE / "forward_test_findings_td-846f9a.md"

WARN_READS_ABS = 8
WARN_READS_RATIO = 1.25
WARN_WORDS_ABS = 350
WARN_WORDS_RATIO = 1.30
SLUG_ALIASES = {
    "precision_stress_test": "aspect_precision_stress_test",
}


@dataclass(frozen=True)
class Row:
    slug: str
    prompt: str
    reading_type: str
    words: int
    reads: int
    verdict: str

    def warning_limits(self) -> tuple[int, int]:
        read_limit = max(self.reads + WARN_READS_ABS,
                         round(self.reads * WARN_READS_RATIO))
        word_limit = max(self.words + WARN_WORDS_ABS,
                         round(self.words * WARN_WORDS_RATIO))
        return read_limit, word_limit


def slugify(title: str) -> str:
    words = [w for w in re.split(r"\s+", title.lower()) if w]
    if words and words[-1] == "prompt":
        words = words[:-1]
    return re.sub(r"[^a-z0-9]+", "_", " ".join(words)).strip("_")


def prompt_types(path: Path = PROMPTS) -> dict[str, str]:
    mapping: dict[str, str] = {}
    title: str | None = None
    in_json = False
    body: list[str] = []
    for raw in path.read_text(encoding="utf-8").splitlines():
        if not in_json:
            m = re.match(r"^##\s+(.+?)\s*$", raw)
            if m:
                title = m.group(1)
            if raw.strip() == "```json":
                in_json = True
                body = []
        elif raw.strip() == "```":
            if title:
                try:
                    obj = json.loads("\n".join(body))
                except json.JSONDecodeError:
                    obj = {}
                mapping[slugify(title)] = str(obj.get("reading_type", "unknown"))
            title = None
            in_json = False
        else:
            body.append(raw)
    return mapping


def parse_baseline(path: Path = BASELINE) -> list[Row]:
    types = prompt_types()
    rows: list[Row] = []
    pattern = re.compile(
        r"^\|\s*\d+\s*\|\s*(?P<prompt>.+?)\s*\|\s*"
        r"(?P<words>[\d,]+)\s*\|\s*(?P<reads>\d+)\s*\|\s*"
        r"(?P<verdict>.+?)\s*\|"
    )
    for line in path.read_text(encoding="utf-8").splitlines():
        match = pattern.match(line)
        if not match:
            continue
        prompt = re.sub(r"\s*\*\([^)]*\)\*", "", match.group("prompt")).strip()
        slug = slugify(prompt)
        type_slug = SLUG_ALIASES.get(slug, slug)
        rows.append(Row(
            slug=slug,
            prompt=prompt,
            reading_type=types.get(type_slug, "unknown"),
            words=int(match.group("words").replace(",", "")),
            reads=int(match.group("reads")),
            verdict="pass" if "pass" in match.group("verdict").lower() else "fail",
        ))
    if not rows:
        raise SystemExit(f"FAIL: no benchmark rows parsed from {path}")
    return rows


def count_words(text: str) -> int:
    return len(re.findall(r"\b[\w'-]+\b", text))


def rows_from_runs_dir(runs_dir: Path, baseline_rows: list[Row]) -> list[Row]:
    rows: list[Row] = []
    by_slug = {r.slug: r for r in baseline_rows}
    for slug, base in sorted(by_slug.items()):
        artifact_slug = SLUG_ALIASES.get(slug, slug)
        run = runs_dir / slug
        if not run.exists() and (runs_dir / artifact_slug).exists():
            run = runs_dir / artifact_slug
        reading = run / f"{slug}.reading.md"
        retrieval = run / f"{slug}.retrieval.txt"
        if not reading.exists():
            reading = run / f"{artifact_slug}.reading.md"
        if not retrieval.exists():
            retrieval = run / f"{artifact_slug}.retrieval.txt"
        if not reading.exists() or not retrieval.exists():
            continue
        reads = [
            line.strip() for line in retrieval.read_text(encoding="utf-8").splitlines()
            if line.strip()
        ]
        rows.append(Row(
            slug=slug,
            prompt=base.prompt,
            reading_type=base.reading_type,
            words=count_words(reading.read_text(encoding="utf-8")),
            reads=len(dict.fromkeys(reads)),
            verdict=base.verdict,
        ))
    if not rows:
        raise SystemExit(f"FAIL: no extracted artifacts found under {runs_dir}")
    return rows


def reference_category(path: str) -> str:
    parts = Path(path).parts
    if not parts:
        return "unknown"
    if parts[0] == "SKILL.md":
        return "skill"
    if len(parts) >= 2 and parts[0] == "references":
        return parts[1]
    if parts[0] == "assets":
        return "assets"
    return "other"


def artifact_categories(runs_dir: Path) -> dict[str, Counter[str]]:
    out: dict[str, Counter[str]] = {}
    for retrieval in runs_dir.glob("*/*.retrieval.txt"):
        slug = retrieval.stem.removesuffix(".retrieval")
        counter: Counter[str] = Counter()
        for line in retrieval.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line:
                counter[reference_category(line)] += 1
        out[slug] = counter
    return out


def warn_rows(current: list[Row], baseline: list[Row]) -> list[str]:
    base = {r.slug: r for r in baseline}
    warnings: list[str] = []
    for row in current:
        if row.verdict != "pass":
            warnings.append(f"{row.prompt}: rubric verdict is {row.verdict}")
        old = base.get(row.slug)
        if not old:
            continue
        read_limit, word_limit = old.warning_limits()
        if row.reads > read_limit:
            warnings.append(
                f"{row.prompt}: reads {row.reads} exceeds warning limit {read_limit}"
            )
        if row.words > word_limit:
            warnings.append(
                f"{row.prompt}: words {row.words} exceeds warning limit {word_limit}"
            )
    return warnings


def print_summary(rows: list[Row], baseline: list[Row], runs_dir: Path | None) -> None:
    print("Blind forward-test retrieval/output benchmark")
    print("=" * 56)
    print(f"Source: {'artifacts at ' + str(runs_dir) if runs_dir else BASELINE.name}")
    print("Thresholds: warn above max(baseline + absolute cushion, baseline * ratio)")
    print(f"  reads: +{WARN_READS_ABS} or x{WARN_READS_RATIO:.2f}")
    print(f"  words: +{WARN_WORDS_ABS} or x{WARN_WORDS_RATIO:.2f}")
    print()
    print("| Prompt | Type | Words | Reads | Verdict | Warn at |")
    print("|---|---:|---:|---:|---|---|")
    for row in rows:
        base = {r.slug: r for r in baseline}.get(row.slug, row)
        read_limit, word_limit = base.warning_limits()
        print(
            f"| {row.prompt} | {row.reading_type} | {row.words:,} | {row.reads} | "
            f"{row.verdict} | >{word_limit:,} words / >{read_limit} reads |"
        )

    by_type: dict[str, list[Row]] = defaultdict(list)
    for row in rows:
        by_type[row.reading_type].append(row)
    print()
    print("Outlier scan by reading type:")
    for rtype, group in sorted(by_type.items()):
        max_words = max(group, key=lambda r: r.words)
        max_reads = max(group, key=lambda r: r.reads)
        print(
            f"  - {rtype}: highest words {max_words.prompt} ({max_words.words:,}); "
            f"highest reads {max_reads.prompt} ({max_reads.reads})"
        )

    if runs_dir:
        cats = artifact_categories(runs_dir)
        totals: Counter[str] = Counter()
        for counter in cats.values():
            totals.update(counter)
        print()
        print("Reference-category retrieval totals:")
        for cat, count in totals.most_common():
            print(f"  - {cat}: {count}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--runs-dir", type=Path,
                        help="optional blind-run artifact directory")
    parser.add_argument("--check", action="store_true",
                        help="deterministic validation mode")
    args = parser.parse_args()

    baseline = parse_baseline()
    rows = rows_from_runs_dir(args.runs_dir, baseline) if args.runs_dir else baseline
    warnings = warn_rows(rows, baseline)

    if not args.check:
        print_summary(rows, baseline, args.runs_dir)
        if warnings:
            print()
            print("Warnings:")
            for warning in warnings:
                print(f"  - {warning}")

    if warnings:
        if args.check:
            print("WARN: benchmark parsed, but current rows exceed warning thresholds")
            for warning in warnings:
                print(f"  - {warning}")
        return 0
    if args.check:
        print(
            f"PASS: benchmark baseline parsed ({len(rows)} prompts); "
            "warning thresholds established from current clean run"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
