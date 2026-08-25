#!/usr/bin/env python3
"""Comparative benchmark runner for astrology reading conditions.

This runner is intentionally separate from
``tests/forward_testing/run_blind_forward_test.py``. It reuses the same core
ideas (fresh per-cell cwd, prompt files, NDJSON trace extraction), but adds a
condition/model matrix so we can compare skill-loaded readings against no-skill
baselines.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
DEFAULT_CONFIG = HERE / "config.example.json"
DEFAULT_CONDITIONS = HERE / "conditions.json"
DEFAULT_PROMPTS = HERE.parent / "forward_testing" / "structured_reading_prompts.md"

_HEADING_RE = re.compile(r"^##\s+(.+?)\s*$")
_FENCE_RE = re.compile(r"^```(json)?\s*$")


@dataclass(frozen=True)
class Prompt:
    title: str
    body: str
    slug: str

    def text_with_preamble(self, preamble: str) -> str:
        return preamble.rstrip() + "\n\n" + self.body.strip() + "\n"


@dataclass(frozen=True)
class ModelCell:
    provider: str
    model: str

    @property
    def slug(self) -> str:
        raw = f"{self.provider}_{self.model}"
        return re.sub(r"[^a-zA-Z0-9._-]+", "_", raw).strip("_") or "model"


@dataclass(frozen=True)
class MatrixCell:
    model: ModelCell
    condition: str
    prompt: Prompt
    replicate: int

    @property
    def slug(self) -> str:
        return (
            f"{self.model.slug}__{self.condition}__"
            f"{self.prompt.slug}__rep{self.replicate}"
        )


def slugify(title: str) -> str:
    words = [w for w in re.split(r"\s+", title.lower()) if w]
    if words and words[-1] == "prompt":
        words = words[:-1]
    return re.sub(r"[^a-z0-9]+", "_", " ".join(words)).strip("_") or "prompt"


def parse_prompts(path: Path) -> list[Prompt]:
    prompts: list[Prompt] = []
    current_title: str | None = None
    in_fence = False
    body_lines: list[str] = []

    for raw in path.read_text(encoding="utf-8").splitlines():
        if not in_fence:
            match = _HEADING_RE.match(raw)
            if match:
                current_title = match.group(1)
            fence = _FENCE_RE.match(raw)
            if fence and fence.group(1) == "json":
                in_fence = True
                body_lines = []
        else:
            if _FENCE_RE.match(raw):
                if current_title and body_lines:
                    body = "\n".join(body_lines)
                    prompts.append(Prompt(current_title, body, slugify(current_title)))
                current_title = None
                in_fence = False
                body_lines = []
            else:
                body_lines.append(raw)

    if not prompts:
        raise SystemExit(f"FAIL: no prompt JSON blocks found in {path}")
    return prompts


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as fh:
        data = json.load(fh)
    if not isinstance(data, dict):
        raise SystemExit(f"FAIL: expected object in {path}")
    return data


def models_from_config(config: dict[str, Any]) -> list[ModelCell]:
    out: list[ModelCell] = []
    for item in config.get("models", []):
        if not isinstance(item, dict):
            continue
        provider = str(item.get("provider", "")).strip()
        model = str(item.get("model", "")).strip()
        if provider and model:
            out.append(ModelCell(provider, model))
    return out


def parse_model_arg(raw: str) -> ModelCell:
    if ":" not in raw:
        raise SystemExit("--model values must use provider:model format")
    provider, model = raw.split(":", 1)
    provider = provider.strip()
    model = model.strip()
    if not provider or not model:
        raise SystemExit("--model values must use provider:model format")
    return ModelCell(provider, model)


def select_prompts(prompts: list[Prompt], slugs: list[str]) -> list[Prompt]:
    by_slug = {p.slug: p for p in prompts}
    missing = [slug for slug in slugs if slug not in by_slug]
    if missing:
        raise SystemExit(f"FAIL: unknown prompt slug(s): {', '.join(missing)}")
    return [by_slug[slug] for slug in slugs]


def repo_commit() -> str:
    try:
        proc = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            cwd=ROOT,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            text=True,
            check=False,
        )
    except OSError:
        return "unknown"
    return proc.stdout.strip() or "unknown"


def default_runs_dir() -> Path:
    stamp = datetime.now().strftime("%Y%m%dT%H%M%S")
    return Path(tempfile.gettempdir()) / "astrology_comparative_benchmark" / stamp


def ensure_condition_known(name: str, conditions: dict[str, Any]) -> dict[str, Any]:
    table = conditions.get("conditions")
    if not isinstance(table, dict) or name not in table:
        raise SystemExit(f"FAIL: unknown benchmark condition {name!r}")
    spec = table[name]
    if not isinstance(spec, dict):
        raise SystemExit(f"FAIL: condition {name!r} is not an object")
    return spec


def copy_entries(entries: list[str], dest: Path) -> None:
    for entry in entries:
        src = ROOT / entry
        if not src.exists():
            raise SystemExit(f"FAIL: condition entry does not exist: {entry}")
        target = dest / entry
        target.parent.mkdir(parents=True, exist_ok=True)
        if src.is_file():
            shutil.copy2(src, target)
        else:
            shutil.copytree(src, target)


def prepare_cell_cwd(cell_dir: Path, condition: str, spec: dict[str, Any]) -> Path:
    cwd = cell_dir / "cwd"
    if cwd.exists():
        shutil.rmtree(cwd)
    cwd.mkdir(parents=True)
    entries = spec.get("mirror_entries", [])
    if not isinstance(entries, list):
        raise SystemExit(f"FAIL: {condition} mirror_entries must be a list")
    copy_entries([str(e) for e in entries], cwd)
    return cwd


def pi_command(pi_bin: str, cwd: Path, cell: MatrixCell, spec: dict[str, Any]) -> list[str]:
    cmd = [
        pi_bin,
        "-p",
        "--no-context-files",
        "--no-session",
        "--mode",
        "json",
        "--provider",
        cell.model.provider,
        "--model",
        cell.model.model,
    ]
    if spec.get("skill_loaded"):
        cmd.extend(["--skill", str(cwd)])
    return cmd


def write_metadata(
    cell_dir: Path,
    cell: MatrixCell,
    status: str,
    degraded_run: bool,
    retry_count: int,
    artifacts: dict[str, str],
) -> None:
    metadata = {
        "benchmark_version": 1,
        "condition": cell.condition,
        "prompt_slug": cell.prompt.slug,
        "prompt_title": cell.prompt.title,
        "provider": cell.model.provider,
        "model_requested": cell.model.model,
        "model_resolved": None,
        "replicate": cell.replicate,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "repo_commit": repo_commit(),
        "prompt_set_path": str(DEFAULT_PROMPTS.relative_to(ROOT)),
        "rubric_path": f"tests/benchmark/rubrics/{cell.prompt.slug}.json",
        "runner": "tests/benchmark/run_comparative_benchmark.py",
        "runner_version": 1,
        "status": status,
        "retry_count": retry_count,
        "degraded_run": degraded_run,
        "artifact_paths": artifacts,
    }
    (cell_dir / "metadata.json").write_text(
        json.dumps(metadata, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def extract_from_trace(trace_path: Path) -> dict[str, str]:
    if not trace_path.exists():
        return {}

    reading_parts: list[str] = []
    reads: list[str] = []
    seen_reads: set[str] = set()
    bash_cmds: list[str] = []

    for line in trace_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or not line.startswith("{"):
            continue
        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            continue
        etype = event.get("type")
        if etype == "message_update":
            ame = event.get("assistantMessageEvent") or {}
            if ame.get("type") == "text_delta" and ame.get("delta"):
                reading_parts.append(ame["delta"])
        elif etype == "tool_execution_start":
            tool = event.get("toolName")
            args = event.get("args") or {}
            if tool == "read":
                path = args.get("path")
                if isinstance(path, str) and path not in seen_reads:
                    seen_reads.add(path)
                    reads.append(path)
            elif tool == "bash":
                command = args.get("command")
                if isinstance(command, str):
                    bash_cmds.append(command)

    artifacts: dict[str, str] = {}
    if reading_parts:
        reading_path = trace_path.parent / "reading.md"
        reading_path.write_text("".join(reading_parts), encoding="utf-8")
        artifacts["reading"] = str(reading_path)
    if reads:
        retrieval_path = trace_path.parent / "retrieval.txt"
        retrieval_path.write_text("\n".join(reads) + "\n", encoding="utf-8")
        artifacts["retrieval"] = str(retrieval_path)
    if bash_cmds:
        bash_path = trace_path.parent / "bash.txt"
        bash_path.write_text("\n".join(bash_cmds) + "\n", encoding="utf-8")
        artifacts["bash"] = str(bash_path)
    return artifacts


def build_matrix(
    models: list[ModelCell],
    conditions: list[str],
    prompts: list[Prompt],
    replicates: int,
) -> list[MatrixCell]:
    cells: list[MatrixCell] = []
    for model in models:
        for condition in conditions:
            for prompt in prompts:
                for replicate in range(1, replicates + 1):
                    cells.append(MatrixCell(model, condition, prompt, replicate))
    return cells


def write_manifest(runs_dir: Path, cells: list[MatrixCell], config_path: Path) -> None:
    manifest = {
        "benchmark_version": 1,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "repo_commit": repo_commit(),
        "config_path": str(config_path),
        "cell_count": len(cells),
        "cells": [
            {
                "slug": cell.slug,
                "provider": cell.model.provider,
                "model": cell.model.model,
                "condition": cell.condition,
                "prompt_slug": cell.prompt.slug,
                "prompt_title": cell.prompt.title,
                "replicate": cell.replicate,
            }
            for cell in cells
        ],
    }
    (runs_dir / "manifest.json").write_text(
        json.dumps(manifest, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def run_cell(
    cell: MatrixCell,
    runs_dir: Path,
    condition_spec: dict[str, Any],
    pi_bin: str,
) -> None:
    cell_dir = runs_dir / cell.slug
    cell_dir.mkdir(parents=True, exist_ok=True)
    cwd = prepare_cell_cwd(cell_dir, cell.condition, condition_spec)

    preamble = str(condition_spec.get("preamble", "")).strip()
    prompt_path = cell_dir / "prompt.txt"
    prompt_path.write_text(cell.prompt.text_with_preamble(preamble), encoding="utf-8")

    trace_path = cell_dir / "trace.ndjson"
    cmd = pi_command(pi_bin, cwd, cell, condition_spec)

    with prompt_path.open("r", encoding="utf-8") as stdin:
        with trace_path.open("w", encoding="utf-8") as stdout:
            proc = subprocess.run(
                cmd,
                cwd=str(cwd),
                stdin=stdin,
                stdout=stdout,
                stderr=subprocess.PIPE,
                text=True,
            )
    artifacts = extract_from_trace(trace_path)
    artifacts["prompt"] = str(prompt_path)
    artifacts["trace"] = str(trace_path)
    artifacts["cwd"] = str(cwd)
    status = "completed" if proc.returncode == 0 else "provider_error"
    write_metadata(
        cell_dir=cell_dir,
        cell=cell,
        status=status,
        degraded_run=proc.returncode != 0,
        retry_count=0,
        artifacts=artifacts,
    )
    if proc.returncode != 0:
        sys.stderr.write(
            f"[{cell.slug}] WARNING: pi exited {proc.returncode}\n"
            + "\n".join((proc.stderr or "").splitlines()[-10:])
            + "\n"
        )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG)
    parser.add_argument("--conditions-file", type=Path, default=DEFAULT_CONDITIONS)
    parser.add_argument("--prompts", type=Path, default=DEFAULT_PROMPTS)
    parser.add_argument("--runs-dir", type=Path, default=None)
    parser.add_argument("--condition", action="append", default=None,
                        help="condition name; repeatable. Defaults to config.")
    parser.add_argument("--prompt", action="append", default=None,
                        help="prompt slug; repeatable. Defaults to config.")
    parser.add_argument("--model", action="append", default=[],
                        help="model cell as provider:model; repeatable.")
    parser.add_argument("--replicates", type=int, default=None)
    parser.add_argument("--pi", type=str, default=None,
                        help="pi binary path (default: $PI_BIN or pi on PATH)")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--extract-only", action="store_true")
    args = parser.parse_args()

    if args.dry_run and args.extract_only:
        sys.stderr.write("--dry-run and --extract-only are mutually exclusive\n")
        return 2

    config = load_json(args.config)
    condition_data = load_json(args.conditions_file)
    all_prompts = parse_prompts(args.prompts)

    prompt_slugs = args.prompt or [str(s) for s in config.get("prompt_slugs", [])]
    if not prompt_slugs:
        prompt_slugs = [p.slug for p in all_prompts]
    prompts = select_prompts(all_prompts, prompt_slugs)

    condition_names = args.condition or [str(c) for c in config.get("conditions", [])]
    if not condition_names:
        raise SystemExit("FAIL: no conditions selected")
    for condition in condition_names:
        ensure_condition_known(condition, condition_data)

    models = [parse_model_arg(raw) for raw in args.model] or models_from_config(config)
    if not models:
        raise SystemExit("FAIL: no models selected")

    replicates = args.replicates if args.replicates is not None else int(
        config.get("replicates", 1)
    )
    if replicates < 1:
        raise SystemExit("FAIL: replicates must be >= 1")

    runs_dir = (args.runs_dir or default_runs_dir()).resolve()
    runs_dir.mkdir(parents=True, exist_ok=True)

    cells = build_matrix(models, condition_names, prompts, replicates)
    write_manifest(runs_dir, cells, args.config)

    print("Comparative benchmark matrix")
    print("=" * 56)
    print(f"Runs dir: {runs_dir}")
    print(f"Models: {len(models)}")
    print(f"Conditions: {len(condition_names)} ({', '.join(condition_names)})")
    print(f"Prompts: {len(prompts)} ({', '.join(p.slug for p in prompts)})")
    print(f"Replicates: {replicates}")
    print(f"Cells: {len(cells)}")

    if args.extract_only:
        print("\n--extract-only: deriving reading/retrieval/bash artifacts")
        for cell in cells:
            trace = runs_dir / cell.slug / "trace.ndjson"
            artifacts = extract_from_trace(trace)
            print(f"  {cell.slug}: {', '.join(sorted(artifacts)) or 'no artifacts'}")
        return 0

    if args.dry_run:
        print("\n--dry-run: no providers will be spawned")
        for cell in cells:
            spec = ensure_condition_known(cell.condition, condition_data)
            cwd = runs_dir / cell.slug / "cwd"
            cmd = pi_command(args.pi or os.environ.get("PI_BIN") or "pi", cwd, cell, spec)
            print(f"  {cell.slug}")
            print(f"    prompt: {cell.prompt.title}")
            print(f"    cwd:    {cwd}")
            print(f"    cmd:    {' '.join(cmd)}")
        return 0

    pi_bin = args.pi or os.environ.get("PI_BIN") or shutil.which("pi") or "pi"
    probe = subprocess.run(
        [pi_bin, "--version"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    if probe.returncode != 0:
        raise SystemExit(
            f"FAIL: could not run pi ({pi_bin}). Use --dry-run for planning or "
            "set --pi / $PI_BIN for provider-backed execution."
        )
    print(f"\npi: {pi_bin} ({(probe.stdout or probe.stderr).strip()})")

    for cell in cells:
        print(f"  running {cell.slug}", flush=True)
        spec = ensure_condition_known(cell.condition, condition_data)
        run_cell(cell, runs_dir, spec, pi_bin)

    print("\nDone.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
