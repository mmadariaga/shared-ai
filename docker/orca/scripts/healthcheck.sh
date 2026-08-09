#!/usr/bin/env bash
# Compose health check for the Orca Environment.
# Verifies: the exact live server process via /run/orca/orca.pid AND the exact
# live Xvfb process via /run/orca/xvfb.pid (each alive and matching its recorded
# start identity — PID-reuse safe), that the container-local bound endpoint
# accepts connections, and that a current readiness record exists.
set -euo pipefail

ORCA_RUN_DIR="${ORCA_RUN_DIR:-/run/orca}"
ORCA_PORT="${ORCA_PORT:-6768}"

process_alive_and_matching() { # process_alive_and_matching <pid-file>
  local pid_file="$1" pid starttime stat starttime_now
  if [[ ! -f "$pid_file" ]]; then
    printf 'healthcheck: missing %s\n' "$pid_file" >&2
    return 1
  fi
  read -r pid starttime < "$pid_file" || { printf 'healthcheck: unreadable %s\n' "$pid_file" >&2; return 1; }
  if [[ ! "$pid" =~ ^[0-9]+$ ]]; then
    printf 'healthcheck: malformed pid in %s\n' "$pid_file" >&2
    return 1
  fi
  if ! kill -0 "$pid" 2>/dev/null; then
    printf 'healthcheck: process %s recorded in %s is not alive\n' "$pid" "$pid_file" >&2
    return 1
  fi
  stat="$(cat "/proc/$pid/stat" 2>/dev/null)" || { printf 'healthcheck: cannot read /proc/%s/stat\n' "$pid" >&2; return 1; }
  stat="${stat#*) }"
  set -- $stat
  starttime_now="$20"
  if [[ "$starttime_now" != "$starttime" ]]; then
    printf 'healthcheck: process %s start identity mismatch (recorded %s, observed %s) — PID reuse\n' "$pid" "$starttime" "$starttime_now" >&2
    return 1
  fi
  return 0
}

process_alive_and_matching "$ORCA_RUN_DIR/orca.pid" || exit 1
process_alive_and_matching "$ORCA_RUN_DIR/xvfb.pid" || exit 1

# Probe the container-local bound endpoint (bash /dev/tcp; no curl dependency).
if ! ( exec 3<>"/dev/tcp/127.0.0.1/$ORCA_PORT" ) 2>/dev/null; then
  printf 'healthcheck: no listener accepting connections on 127.0.0.1:%s\n' "$ORCA_PORT" >&2
  exit 1
fi

if [[ ! -f "$ORCA_RUN_DIR/readiness.json" ]]; then
  printf 'healthcheck: no current readiness record\n' >&2
  exit 1
fi

exit 0
