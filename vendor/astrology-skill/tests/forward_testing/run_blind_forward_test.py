#!/usr/bin/env python3
"""Blind forward-test harness for the astrology skill.

Runs each structured reading prompt in a FRESH, ISOLATED agent context so that
sibling contexts' scratch files are not visible to any context's file listings.
This is "isolation by construction": each context gets its own private copy of
the sanitized mirror as its working directory, so a stray `find`/`ls`/`cat` in
one context can never surface another context's NDJSON trace or extracted
reading.

What this script does
---------------------
1. Builds a sanitized mirror containing ONLY `SKILL.md`, `references/`, and
   `assets/` from the source repo. Everything else (`tests/`, `AGENTS.md`,
   `ROADMAP.md`, `quick_validate.py`, `agents/`, `.git/`, `.todos/`, prior
   findings) is excluded, so no expected-answer artifact is reachable.
2. For each prompt parsed from the prompt set, copies the mirror into a
   per-context isolated cwd at `<runs-dir>/<slug>/cwd/` and spawns
   `pi -p --no-context-files --no-session --mode json --skill <cwd>` with that
   cwd, piping the prompt via stdin and capturing the NDJSON trace.
3. Mechanically extracts, per context, the reading text (concatenated
   `text_delta` events), the retrieval set (de-duplicated `read` paths from
   `tool_execution_start` events), and the bash-command audit log.

Sibling isolation: every per-context `cwd/` contains only the mirror. The
`<runs-dir>/<slug>/` siblings (which hold each context's own trace and
extracted artifacts) live OUTSIDE every other context's cwd, so they are
invisible to `find`/`ls` run from within any context.

This is a test-hygiene tool. It makes no changes to the skill corpus.

Usage
-----
    # Full run (builds mirror, runs pi per prompt, extracts artifacts):
    ./run_blind_forward_test.py

    # Re-extract readings/retrieval sets from existing traces without re-running pi:
    ./run_blind_forward_test.py --extract-only

    # Print the plan (slugs, cwds, pi commands) without spawning pi:
    ./run_blind_forward_test.py --dry-run

    # Override locations / model:
    ./run_blind_forward_test.py --repo /path/to/repo --runs-dir /tmp/runs \\
        --model sonnet:high

See tests/forward_testing/README.md for the full methodology.
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
from datetime import datetime
from pathlib import Path

# Only these entries from the repo root are copied into the sanitized mirror.
# Anything else (tests/, AGENTS.md, ROADMAP.md, quick_validate.py, agents/,
# .git/, .todos/, prior findings) is excluded so no expected-answer artifact
# is reachable by a blind context.
MIRROR_ENTRIES: tuple[str, ...] = ("SKILL.md", "references", "assets")

# One-line steering instruction prepended to every raw chart-data prompt.
# Faithful to the td-e68ad8 / td-06b45e method: no rubric, no expected answers,
# no clarifying questions.
PREAMBLE = (
    "Follow the loaded astrology skill's workflow and produce a complete "
    "reading from the chart data below. Do not ask clarifying questions; "
    "proceed from the supplied factors and name any limits explicitly.\n\n"
)


# --------------------------------------------------------------------------- #
# Prompt parsing
# --------------------------------------------------------------------------- #

_HEADING_RE = re.compile(r"^##\s+(.+?)\s*$")
_FENCE_RE = re.compile(r"^```(json)?\s*$")


class Prompt:
    """A single structured reading prompt parsed from the prompt-set file."""

    def __init__(self, title: str, body: str) -> None:
        self.title = title.strip()
        self.body = body.strip()
        self.slug = self._slugify(self.title)

    @staticmethod
    def _slugify(title: str) -> str:
        # "Natal Vocation Prompt" -> "natal_vocation" (drop trailing "prompt")
        words = [w for w in re.split(r"\s+", title.lower()) if w]
        if words and words[-1] == "prompt":
            words = words[:-1]
        slug = re.sub(r"[^a-z0-9]+", "_", " ".join(words)).strip("_")
        return slug or "prompt"

    def full_text(self) -> str:
        return PREAMBLE + self.body + "\n"


def parse_prompts(path: Path) -> list[Prompt]:
    """Parse ```json fenced blocks paired with their nearest `##` heading."""
    prompts: list[Prompt] = []
    current_title: str | None = None
    in_fence = False
    body_lines: list[str] = []

    for raw in path.read_text(encoding="utf-8").splitlines():
        if not in_fence:
            m = _HEADING_RE.match(raw)
            if m:
                current_title = m.group(1)
            fm = _FENCE_RE.match(raw)
            if fm and fm.group(1) == "json":
                in_fence = True
                body_lines = []
        else:
            if _FENCE_RE.match(raw):
                # Closing fence
                if current_title and body_lines:
                    prompts.append(Prompt(current_title, "\n".join(body_lines)))
                in_fence = False
                body_lines = []
                current_title = None  # avoid re-pairing the same heading
            else:
                body_lines.append(raw)

    if not prompts:
        raise SystemExit(
            f"FAIL: no ```json fenced prompt blocks paired with a ## heading "
            f"were found in {path}"
        )
    return prompts


# --------------------------------------------------------------------------- #
# Sanitized mirror
# --------------------------------------------------------------------------- #

def build_mirror(repo_root: Path, dest: Path) -> None:
    """Copy only MIRROR_ENTRIES from repo_root into dest (cleaned first)."""
    if dest.exists():
        shutil.rmtree(dest)
    dest.mkdir(parents=True)

    missing = [e for e in MIRROR_ENTRIES if not (repo_root / e).exists()]
    if missing:
        raise SystemExit(
            f"FAIL: expected skill entries not found under {repo_root}: "
            f"{', '.join(missing)}"
        )

    for entry in MIRROR_ENTRIES:
        src = repo_root / entry
        shutil.copy2(src, dest / entry) if src.is_file() else shutil.copytree(
            src, dest / entry
        )

    # Sanity check: the mirror must NOT leak any excluded entry.
    leaked = [
        e for e in os.listdir(dest)
        if e not in MIRROR_ENTRIES
    ]
    if leaked:
        raise SystemExit(
            f"FAIL: sanitized mirror leaked excluded entries: {', '.join(leaked)}"
        )


def default_repo_root() -> Path:
    # .../tests/forward_testing/run_blind_forward_test.py -> repo root
    return Path(__file__).resolve().parents[2]


# --------------------------------------------------------------------------- #
# Per-context run + extraction
# --------------------------------------------------------------------------- #

def run_context(
    slug: str,
    mirror: Path,
    runs_dir: Path,
    prompt: Prompt,
    pi_bin: str,
    extra_pi_args: list[str],
) -> Path:
    """Spawn one isolated pi context for a single prompt. Returns its run dir."""
    run_dir = runs_dir / slug
    cwd = run_dir / "cwd"
    trace_path = run_dir / "trace.ndjson"
    prompt_path = run_dir / "prompt.txt"

    # Fresh per-context cwd: its own private copy of the sanitized mirror.
    if cwd.exists():
        shutil.rmtree(cwd)
    cwd.mkdir(parents=True)
    for entry in MIRROR_ENTRIES:
        src = mirror / entry
        shutil.copy2(src, cwd / entry) if src.is_file() else shutil.copytree(
            src, cwd / entry
        )

    run_dir.mkdir(parents=True, exist_ok=True)
    prompt_path.write_text(prompt.full_text(), encoding="utf-8")

    # pi has no --cwd flag; it uses the process cwd. --skill loads the skill
    # deterministically (trust-independent; additive even with --no-skills),
    # so the skill is available regardless of project-trust state. Relative
    # reference paths in SKILL.md resolve against cwd (the isolated mirror).
    cmd = [
        pi_bin,
        "-p",
        "--no-context-files",
        "--no-session",
        "--mode", "json",
        "--skill", str(cwd),
        *extra_pi_args,
    ]

    print(f"  [{slug}] spawning pi in {cwd}", flush=True)
    with prompt_path.open("r", encoding="utf-8") as stdin:
        with trace_path.open("w", encoding="utf-8") as stdout:
            result = subprocess.run(
                cmd,
                cwd=str(cwd),
                stdin=stdin,
                stdout=stdout,
                stderr=subprocess.PIPE,
                text=True,
            )
    if result.returncode != 0:
        sys.stderr.write(
            f"  [{slug}] WARNING: pi exited {result.returncode}\n"
            f"  stderr tail:\n"
            + "\n".join((result.stderr or "").splitlines()[-15:])
            + "\n"
        )
    return run_dir


def extract_from_trace(trace_path: Path, slug: str) -> dict[str, Path]:
    """Mechanically derive reading, retrieval set, and bash audit from a trace."""
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
            ev = json.loads(line)
        except json.JSONDecodeError:
            continue
        etype = ev.get("type")

        if etype == "message_update":
            ame = ev.get("assistantMessageEvent") or {}
            if ame.get("type") == "text_delta" and ame.get("delta"):
                reading_parts.append(ame["delta"])
        elif etype == "tool_execution_start":
            tool = ev.get("toolName")
            args = ev.get("args") or {}
            if tool == "read":
                p = args.get("path")
                if isinstance(p, str) and p not in seen_reads:
                    seen_reads.add(p)
                    reads.append(p)
            elif tool == "bash":
                c = args.get("command")
                if isinstance(c, str):
                    bash_cmds.append(c)

    out: dict[str, Path] = {}
    if reading_parts:
        reading_path = trace_path.parent / f"{slug}.reading.md"
        reading_path.write_text("".join(reading_parts), encoding="utf-8")
        out["reading"] = reading_path
    if reads:
        retrieval_path = trace_path.parent / f"{slug}.retrieval.txt"
        retrieval_path.write_text("\n".join(reads) + "\n", encoding="utf-8")
        out["retrieval"] = retrieval_path
    if bash_cmds:
        bash_path = trace_path.parent / f"{slug}.bash.txt"
        bash_path.write_text("\n".join(bash_cmds) + "\n", encoding="utf-8")
        out["bash"] = bash_path
    return out


# --------------------------------------------------------------------------- #
# Orchestration
# --------------------------------------------------------------------------- #

def find_pi(override: str | None) -> str:
    pi_bin = override or os.environ.get("PI_BIN") or shutil.which("pi") or "pi"
    return pi_bin


def main() -> int:
    repo_default = default_repo_root()
    prompts_default = Path(__file__).resolve().parent / "structured_reading_prompts.md"

    p = argparse.ArgumentParser(
        description="Run the astrology skill's blind forward test with "
                    "per-context isolated cwds.",
    )
    p.add_argument("--repo", type=Path, default=repo_default,
                   help=f"source repo root (default: {repo_default})")
    p.add_argument("--prompts", type=Path, default=prompts_default,
                   help="prompt-set .md with ## headings + ```json blocks "
                        f"(default: {prompts_default})")
    p.add_argument("--mirror", type=Path, default=None,
                   help="pre-built sanitized mirror to copy from "
                        "(default: build into <runs-dir>/mirror)")
    p.add_argument("--runs-dir", type=Path, default=None,
                   help="output root for per-context artifacts "
                        "(default: a fresh timestamped dir under the system temp)")
    p.add_argument("--pi", type=str, default=None,
                   help="pi binary path (default: $PI_BIN or `pi` on PATH)")
    p.add_argument("--model", type=str, default=None,
                   help="model pattern passed through to pi (e.g. sonnet:high)")
    p.add_argument("--provider", type=str, default=None,
                   help="provider passed through to pi")
    p.add_argument("--extra-arg", action="append", default=[],
                   help="extra raw argument passed through to pi (repeatable)")
    p.add_argument("--extract-only", action="store_true",
                   help="skip running pi; re-extract from existing traces")
    p.add_argument("--dry-run", action="store_true",
                   help="print the plan (slugs, cwds, commands) without running pi")
    args = p.parse_args()

    if args.extract_only and args.dry_run:
        sys.stderr.write("--extract-only and --dry-run are mutually exclusive\n")
        return 2

    prompts = parse_prompts(args.prompts)
    print(f"Parsed {len(prompts)} prompt(s):")
    for pr in prompts:
        print(f"  - {pr.slug}  ({pr.title})")

    # Default runs-dir outside the repo, matching the founding hygiene that
    # scratch artifacts must not land inside the repository.
    if args.runs_dir is None:
        stamp = datetime.now().strftime("%Y%m%dT%H%M%S")
        args.runs_dir = Path(tempfile.gettempdir()) / "astrology_blind_forward" / stamp
    args.runs_dir = args.runs_dir.resolve()
    args.runs_dir.mkdir(parents=True, exist_ok=True)
    print(f"\nRuns dir: {args.runs_dir}")

    if args.extract_only:
        print("\n--extract-only: re-extracting from existing traces")
        for pr in prompts:
            trace = args.runs_dir / pr.slug / "trace.ndjson"
            if not trace.exists():
                print(f"  [{pr.slug}] no trace at {trace}; skipping")
                continue
            out = extract_from_trace(trace, pr.slug)
            print(f"  [{pr.slug}] extracted: "
                  + ", ".join(sorted(out)) if out else f"  [{pr.slug}] nothing extracted")
        return 0

    pi_bin = find_pi(args.pi)
    extra: list[str] = []
    if args.provider:
        extra += ["--provider", args.provider]
    if args.model:
        extra += ["--model", args.model]
    extra += args.extra_arg

    # Mirror: build once (or reuse a provided one).
    mirror = args.mirror.resolve() if args.mirror else (args.runs_dir / "mirror")
    if args.mirror:
        print(f"\nUsing provided mirror: {mirror}")
    else:
        print(f"\nBuilding sanitized mirror at {mirror} from {args.repo}")
        build_mirror(args.repo.resolve(), mirror)
    print(f"Mirror contents: {', '.join(sorted(os.listdir(mirror)))}")

    if args.dry_run:
        print("\n--dry-run: plan (no pi will be spawned)")
        for pr in prompts:
            run_dir = args.runs_dir / pr.slug
            cwd = run_dir / "cwd"
            print(f"\n  [{pr.slug}]")
            print(f"    cwd:     {cwd}")
            print(f"    prompt:  {run_dir / 'prompt.txt'}")
            print(f"    trace:   {run_dir / 'trace.ndjson'}")
            print(f"    command: {pi_bin} -p --no-context-files --no-session "
                  f"--mode json --skill {cwd} {' '.join(extra)} < prompt.txt")
        return 0

    # Verify pi is callable before doing the copy work.
    if not args.dry_run:
        probe = subprocess.run(
            [pi_bin, "--version"],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
        )
        if probe.returncode != 0:
            raise SystemExit(
                f"FAIL: could not run pi ({pi_bin}). Set --pi or $PI_BIN.\n"
                f"stderr: {(probe.stderr or '').strip()}"
            )
        print(f"pi: {pi_bin}  ({(probe.stdout or probe.stderr or '').strip()})")

    print("\nRunning isolated contexts:")
    for pr in prompts:
        run_context(
            slug=pr.slug,
            mirror=mirror,
            runs_dir=args.runs_dir,
            prompt=pr,
            pi_bin=pi_bin,
            extra_pi_args=extra,
        )

    print("\nExtracting artifacts:")
    for pr in prompts:
        trace = args.runs_dir / pr.slug / "trace.ndjson"
        out = extract_from_trace(trace, pr.slug)
        summary = ", ".join(sorted(out)) if out else "(no artifacts extracted)"
        print(f"  [{pr.slug}] {summary}")

    print("\nDone.")
    print(f"All per-context artifacts (isolated cwds, traces, readings, "
          f"retrieval sets, bash audits) are under:\n  {args.runs_dir}")
    print("Run the contamination audit described in "
          "tests/forward_testing/README.md against the *.retrieval.txt and "
          "*.bash.txt files.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
