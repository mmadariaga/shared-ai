#!/usr/bin/env bash
# Shared strict credential parser for the Orca Environment.
# Sourced by the entrypoint (validation only) and by both per-CLI launchers.
# Reads KEY=VALUE lines without shell expansion or evaluation, enforces the
# per-CLI allowlist, and writes nothing.
#
# Public functions:
#   credentials_validate <file> <cli>   parse + validate, export nothing
#   credentials_load    <file> <cli>   parse + validate + export variables
set -euo pipefail

# Per-CLI allowlists — implementation-time validated set against the pinned CLI
# versions (claude-code 2.1.226, opencode-ai 1.18.15); recorded in README.
CLAUDE_ALLOWED_KEYS=(ANTHROPIC_API_KEY ANTHROPIC_AUTH_TOKEN CLAUDE_CODE_OAUTH_TOKEN)
OPENCODE_ALLOWED_KEYS=(ANTHROPIC_API_KEY OPENAI_API_KEY OPENROUTER_API_KEY)

_in_array() {
  local needle="$1" e
  shift
  for e in "$@"; do
    [[ "$e" == "$needle" ]] && return 0
  done
  return 1
}

_credentials_parse() { # _credentials_parse <file> <cli> <validate|export>
  local file="$1" cli="$2" export_mode="$3"
  local line key value auth_count k
  declare -A seen=()

  if [[ ! -r "$file" ]]; then
    printf 'load-credentials: %s is not readable by the service user. Prepare the host file so uid 1000 can read it (owner uid 1000 with mode 0600, or group/ACL-scoped mode 0640); never make it world-readable.\n' "$file" >&2
    return 1
  fi

  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ -z "$line" ]] && continue
    case "$line" in
      \#*) continue ;;
    esac
    if [[ "$line" != *"="* ]]; then
      printf 'load-credentials: %s: line without "=": %s\n' "$file" "$line" >&2
      return 1
    fi
    key="${line%%=*}"
    value="${line#*=}"
    if [[ ! "$key" =~ ^[A-Z][A-Z0-9_]*$ ]]; then
      printf 'load-credentials: %s: invalid key "%s" (must match ^[A-Z][A-Z0-9_]*$)\n' "$file" "$key" >&2
      return 1
    fi
    if [[ -n "${seen[$key]+x}" ]]; then
      printf 'load-credentials: %s: duplicate key "%s"\n' "$file" "$key" >&2
      return 1
    fi
    seen[$key]=1
    if [[ "$cli" == "claude" ]]; then
      if ! _in_array "$key" "${CLAUDE_ALLOWED_KEYS[@]}"; then
        printf 'load-credentials: %s: key "%s" is not on the Claude Code allowlist (%s). Process-control variables (PATH, LD_PRELOAD, LD_LIBRARY_PATH, NODE_OPTIONS, BASH_ENV, ...) and OpenCode-only keys are rejected.\n' "$file" "$key" "${CLAUDE_ALLOWED_KEYS[*]}" >&2
        return 1
      fi
    else
      if ! _in_array "$key" "${OPENCODE_ALLOWED_KEYS[@]}"; then
        printf 'load-credentials: %s: key "%s" is not on the OpenCode allowlist (%s). Process-control variables (PATH, LD_PRELOAD, ...) and Claude-only keys are rejected.\n' "$file" "$key" "${OPENCODE_ALLOWED_KEYS[*]}" >&2
        return 1
      fi
    fi
    if printf '%s' "$value" | LC_ALL=C grep -q '[[:cntrl:]]'; then
      printf 'load-credentials: %s: value of "%s" contains control characters\n' "$file" "$key" >&2
      return 1
    fi
    if [[ "$export_mode" == "export" ]]; then
      export "$key=$value"
    fi
  done < "$file"

  # Mutual exclusion for the Claude authentication group.
  if [[ "$cli" == "claude" ]]; then
    auth_count=0
    for k in ANTHROPIC_API_KEY ANTHROPIC_AUTH_TOKEN CLAUDE_CODE_OAUTH_TOKEN; do
      if [[ -n "${seen[$k]+x}" ]]; then
        auth_count=$((auth_count + 1))
      fi
    done
    if (( auth_count > 1 )); then
      printf 'load-credentials: %s: mutually exclusive Claude authentication variables present (%d): at most one of ANTHROPIC_API_KEY, ANTHROPIC_AUTH_TOKEN, CLAUDE_CODE_OAUTH_TOKEN may be set.\n' "$file" "$auth_count" >&2
      return 1
    fi
  fi
  return 0
}

credentials_validate() { _credentials_parse "$1" "$2" validate; }
credentials_load()    { _credentials_parse "$1" "$2" export; }
