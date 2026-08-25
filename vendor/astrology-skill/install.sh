#!/usr/bin/env bash
#
# install.sh — install the astrology skill into an Agent-Skills-standard harness.
#
# Copies the skill into a harness skills directory so the agent discovers it on
# next start. Targets any Agent-Skills-standard loader — Codex, Pi, or the
# harness-neutral ~/.agents/skills/ (scanned by Pi and any compliant loader).
#
# The skill name is read from SKILL.md frontmatter (default: astrology-skill).
#
# Idempotent: it safely REPLACES a previous install of THIS skill (matched by the
# `name:` field in the destination's SKILL.md) and REFUSES to clobber a directory
# that belongs to a DIFFERENT skill. A leftover symlink from a previous manual
# install is replaced with a real copy. Use --force to override the clobber refusal.
#
# AGPL boundary: tools/ (the pyswisseph birth-data calculator) is copied as a
# separate, opt-in support-script unit so Agent-Skills-standard harnesses can
# resolve it by relative path from the installed skill root. The MIT skill
# runtime does not import it. Install its dependencies separately, or use a
# runner that honors the script metadata:
#     python3 -m venv .venv && . .venv/bin/activate \
#       && pip install -r tools/requirements.txt -r tools/requirements-dev.txt
#
# Usage:
#   ./install.sh                      # default: install into all three targets
#   ./install.sh --target codex       # $CODEX_HOME/skills/        (default ~/.codex/skills)
#   ./install.sh --target pi          # $PI_HOME/agent/skills/     (default ~/.pi/agent/skills)
#   ./install.sh --target agents      # $AGENTS_HOME/skills/       (default ~/.agents/skills, harness-neutral)
#   ./install.sh --target all         # install into all three (default)
#   ./install.sh --dry-run            # show what would happen; copy nothing
#   ./install.sh --smoke-test         # stage the published bundle and run --check
#   ./install.sh --force              # overwrite a destination that belongs to another skill
#   ./install.sh --help
#
# Exit codes: 0 success; 1 usage/runtime error; 2 a target was refused (different skill).

set -uo pipefail

# --------------------------------------------------------------------------- #
# Globals
# --------------------------------------------------------------------------- #

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEFAULT_NAME="astrology-skill"
TARGET="all"
DRY_RUN=false
SMOKE_TEST=false
FORCE=0
OVERALL=0

# Published skill bundle profile. This is intentionally an allowlist so repo-only
# files such as AGENTS.md, ROADMAP.md, tests/, .todos, and forward-testing
# artifacts are never copied unless they are deliberately promoted here.
BUNDLE_ENTRIES=(
  'SKILL.md'
  'LICENSE'
  'README.md'
  'entry_commands.py'
  'agents/openai.yaml'
  'assets/schemas'
  'prompts/entry'
  'references'
  'tools/birth_to_chart.py'
  'tools/chart_diagram.py'
  'tools/README.md'
  'tools/NOTICE.md'
  'tools/LICENSE'
  'tools/requirements.txt'
  'tools/requirements-dev.txt'
)

BUNDLE_DOCS=(
  'docs/bundle_profile.md'
  'docs/birth_to_chart_design.md'
  'docs/entry_commands.md'
  'docs/end_to_end.md'
  'docs/report_format.md'
)

# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #

err()  { printf 'install: ERROR: %s\n' "$*" >&2; }
note() { printf 'install: %s\n' "$*"; }

read_skill_name() {
  # Print the first `name:` value from the YAML frontmatter of $1/SKILL.md.
  # Returns non-zero if the file is missing or has no frontmatter name.
  local dir="$1" file="$1/SKILL.md" name
  [ -f "$file" ] || return 1
  name="$(awk '
    /^---[[:space:]]*$/ { f++; next }
    f == 1 && /^[[:space:]]*name:[[:space:]]*/ {
      sub(/^[[:space:]]*name:[[:space:]]*/, "")
      sub(/^["'\'']/, "")
      sub(/["'\'']$/, "")
      print
      exit
    }
  ' "$file")"
  [ -n "$name" ] || return 1
  printf '%s' "$name"
}

resolve_target() {
  # Set globals T_LABEL and T_DIR for a target key.
  case "$1" in
    codex)  T_LABEL="Codex";               T_DIR="${CODEX_HOME:-$HOME/.codex}/skills" ;;
    pi)     T_LABEL="Pi";                  T_DIR="${PI_HOME:-$HOME/.pi}/agent/skills" ;;
    agents) T_LABEL="Agents (harness-neutral)"; T_DIR="${AGENTS_HOME:-$HOME/.agents}/skills" ;;
    *) err "unknown target '$1' (expected codex|pi|agents|all)"; exit 1 ;;
  esac
}

validate_paths() {
  local skills_dir="$1" dest="$2"
  [ -n "$skills_dir" ] || { err "resolved skills dir is empty for target"; exit 1; }
  case "$skills_dir" in
    /*) : ;;  # absolute — required so rm -rf targets are predictable
    *)  err "skills dir must be an absolute path: '$skills_dir'"; exit 1 ;;
  esac
  [ "$dest" = "/" ] && { err "refusing destination '/'"; exit 1; }
  case "$dest" in
    "$skills_dir/$SKILL_NAME") : ;;
    *) err "destination path mismatch: '$dest'"; exit 1 ;;
  esac
}

copy_bundle_path() {
  local src_root="$1" dest_root="$2" rel="$3"
  local src_path="$src_root/$rel" dest_path="$dest_root/$rel"

  [ -e "$src_path" ] || { err "bundle entry missing: $rel"; return 1; }
  mkdir -p "$(dirname "$dest_path")"

  if [ -d "$src_path" ]; then
    mkdir -p "$dest_path"
    if command -v rsync >/dev/null 2>&1; then
      rsync -a --exclude '__pycache__' --exclude '*.pyc' --exclude '*.pyo' --exclude '.DS_Store' \
        "$src_path/" "$dest_path/"
    else
      tar -cf - -C "$src_path" --exclude='__pycache__' --exclude='*.pyc' --exclude='*.pyo' --exclude='.DS_Store' . \
        | tar -xf - -C "$dest_path"
    fi
  else
    if command -v rsync >/dev/null 2>&1; then
      rsync -a "$src_path" "$dest_path"
    else
      cp -p "$src_path" "$dest_path"
    fi
  fi
}

copy_skill() {
  # Copy the published bundle profile from $1 (src) into $2 (dest).
  local src="$1" dest="$2"
  local rel

  mkdir -p "$dest"
  for rel in "${BUNDLE_ENTRIES[@]}" "${BUNDLE_DOCS[@]}"; do
    copy_bundle_path "$src" "$dest" "$rel" || return 1
  done
}

print_bundle_profile() {
  printf '    published bundle entries:\n'
  local rel
  for rel in "${BUNDLE_ENTRIES[@]}" "${BUNDLE_DOCS[@]}"; do
    printf '      %s\n' "$rel"
  done
}

smoke_check_bundle() {
  local bundle_dir="$1"
  [ -f "$bundle_dir/entry_commands.py" ] || { err "entry_commands.py missing from bundle"; return 1; }
  [ -f "$bundle_dir/tools/birth_to_chart.py" ] || { err "tools/birth_to_chart.py missing from bundle"; return 1; }
  [ -f "$bundle_dir/tools/chart_diagram.py" ] || { err "tools/chart_diagram.py missing from bundle"; return 1; }
  [ -f "$bundle_dir/tools/NOTICE.md" ] || { err "tools/NOTICE.md missing from bundle"; return 1; }
  [ -f "$bundle_dir/tools/requirements.txt" ] || { err "tools/requirements.txt missing from bundle"; return 1; }
  python3 "$bundle_dir/entry_commands.py" --check >/dev/null
}

run_bundle_smoke_test() {
  local tmp_root tmp_bundle
  tmp_root="$(mktemp -d "${TMPDIR:-/tmp}/astrology-skill-bundle.XXXXXX")" || return 1
  tmp_bundle="$tmp_root/$SKILL_NAME"

  copy_skill "$SCRIPT_DIR" "$tmp_bundle" || {
    rm -rf "$tmp_root"
    return 1
  }
  smoke_check_bundle "$tmp_bundle" || {
    rm -rf "$tmp_root"
    return 1
  }
  rm -rf "$tmp_root"
  note "smoke-test passed: staged published bundle passes entry_commands.py --check"
}

install_target() {
  local key="$1"
  resolve_target "$key"
  local label="$T_LABEL" skills_dir="$T_DIR"
  local dest="$skills_dir/$SKILL_NAME"

  validate_paths "$skills_dir" "$dest"
  printf '==> [%s] %s\n' "$label" "$dest"

  local action="install"
  local existing_name=""
  if [ -L "$dest" ] || [ -e "$dest" ]; then
    existing_name="$(read_skill_name "$dest" 2>/dev/null || true)"
    if [ -L "$dest" ]; then
      action="replace (previous symlink -> copy)"
    elif [ "$existing_name" = "$SKILL_NAME" ]; then
      action="replace (previous install of $SKILL_NAME)"
    elif [ "$FORCE" -eq 1 ]; then
      action="FORCE-overwrite (dest name: '${existing_name:-<none>}'; expected '$SKILL_NAME')"
    else
      if $DRY_RUN; then
        printf '    WOULD REFUSE: destination belongs to a different skill (name: %q)\n' "${existing_name:-<none>}"
        printf '    (skipped in dry-run; would exit non-zero without --force)\n'
        return 0
      fi
      printf '    REFUSED: %s belongs to a different skill.\n' "$dest"
      [ -n "$existing_name" ] && printf '      found name: %q (expected: %q)\n' "$existing_name" "$SKILL_NAME"
      printf '      Re-run with --force to overwrite.\n'
      return 2
    fi
  fi

  if $DRY_RUN; then
    printf '    (dry-run) would %s\n' "$action"
    print_bundle_profile
    return 0
  fi

  mkdir -p "$skills_dir"
  if [ -L "$dest" ] || [ -e "$dest" ]; then
    rm -rf "$dest"
  fi
  copy_skill "$SCRIPT_DIR" "$dest" || return 1
  smoke_check_bundle "$dest" || return 1
  printf '    installed (%s)\n' "$action"
  printf '    verified entry_commands.py --check\n'
  return 0
}

usage() {
  sed -n '3,/^$/p' "${BASH_SOURCE[0]}" \
    | sed 's/^# \{0,1\}//' \
    | sed -n '2,$p'  # skip the leading blank line from the # line
}

# --------------------------------------------------------------------------- #
# Arg parsing
# --------------------------------------------------------------------------- #

while [ $# -gt 0 ]; do
  case "$1" in
    --target)
      [ $# -ge 2 ] || { err "--target requires a value"; exit 1; }
      TARGET="$2"; shift 2 ;;
    --target=*) TARGET="${1#--target=}"; shift ;;
    --dry-run) DRY_RUN=true; shift ;;
    --smoke-test) SMOKE_TEST=true; shift ;;
    --force)   FORCE=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) err "unknown argument '$1' (try --help)"; exit 1 ;;
  esac
done

# --------------------------------------------------------------------------- #
# Pre-flight
# --------------------------------------------------------------------------- #

[ -f "$SCRIPT_DIR/SKILL.md" ] || { err "SKILL.md not found in $SCRIPT_DIR (run from the repo root)"; exit 1; }
SKILL_NAME="$(read_skill_name "$SCRIPT_DIR" || printf '%s' "$DEFAULT_NAME")"
note "skill: $SKILL_NAME  (from $SCRIPT_DIR/SKILL.md)"
note "source: $SCRIPT_DIR"
$DRY_RUN && note "DRY RUN — nothing will be copied."
note "published bundle profile: see docs/bundle_profile.md"

if $SMOKE_TEST; then
  run_bundle_smoke_test
  exit $?
fi

case "$TARGET" in
  all) targets="codex pi agents" ;;
  codex|pi|agents) targets="$TARGET" ;;
  *) err "--target must be codex|pi|agents|all (got '$TARGET')"; exit 1 ;;
esac

# --------------------------------------------------------------------------- #
# Run
# --------------------------------------------------------------------------- #

for t in $targets; do
  if install_target "$t"; then
    :
  else
    rc=$?
    [ "$rc" -gt "$OVERALL" ] && OVERALL=$rc
  fi
done

echo
if [ "$OVERALL" -eq 0 ]; then
  note "done."
else
  note "done with issues (exit $OVERALL)."
fi
exit "$OVERALL"
