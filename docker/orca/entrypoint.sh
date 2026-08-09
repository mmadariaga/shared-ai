#!/usr/bin/env bash
# Orca Environment entrypoint — headless Orca server with Xvfb + software
# rendering, structured readiness capture, and container-safe process handling.
#
# Managed children (each launched via `setsid` so the leader `exec`s the actual
# binary and the recorded PID/PGID identify the real processes):
#   Xvfb     — container-local display :99 (first-class managed child)
#   server   — /opt/orca/AppRun serve --port <n> --pairing-address <a> --json
#              (stdout -> FIFO; stderr -> container logs)
#   consumer — node /opt/orca/scripts/orca-json-consumer.js (reads the FIFO)
set -euo pipefail

ORCA_RUN_DIR="${ORCA_RUN_DIR:-/run/orca}"
ORCA_PORT="${ORCA_PORT:-6768}"
ORCA_PAIRING_ADDRESS="${ORCA_PAIRING_ADDRESS:-127.0.0.1}"
ORCA_TOPOLOGY="${ORCA_TOPOLOGY:-local}"
ORCA_TEST_MODE="${ORCA_TEST_MODE:-}"

ORCA_SERVE_BIN="${ORCA_SERVE_BIN:-/opt/orca/AppRun}"
ORCA_XVFB_BIN="${ORCA_XVFB_BIN:-Xvfb}"
ORCA_CONSUMER_BIN="${ORCA_CONSUMER_BIN:-node /opt/orca/scripts/orca-json-consumer.js}"

RUNTIME_FAILURE_CODE=70   # EX_SOFTWARE — documented runtime failure
DRAIN_WINDOW_SECS=10
SHUTDOWN_WAIT_SECS=10

XVFB_PID=0
SERVER_PID=0
CONSUMER_PID=0
XVFB_RC=0
SERVER_RC=0
CONSUMER_RC=0
SHUTDOWN=0

log() { printf 'entrypoint: %s\n' "$*"; }
die() { printf 'entrypoint: %s\n' "$*" >&2; exit 1; }

# --- test-mode invariant -----------------------------------------------------
# The hooks take effect only under ORCA_TEST_MODE=1; production startup rejects
# a non-default value. The committed Compose files never set these variables.
if [[ "$ORCA_TEST_MODE" != "1" ]]; then
  if [[ "$ORCA_SERVE_BIN" != "/opt/orca/AppRun" ]]; then
    die "ORCA_SERVE_BIN is set to '$ORCA_SERVE_BIN' but ORCA_TEST_MODE is not 1. The test hooks (ORCA_SERVE_BIN, ORCA_XVFB_BIN, ORCA_CONSUMER_BIN) take effect only under ORCA_TEST_MODE=1; production configuration never sets them."
  fi
  if [[ "$ORCA_XVFB_BIN" != "Xvfb" ]]; then
    die "ORCA_XVFB_BIN is set to '$ORCA_XVFB_BIN' but ORCA_TEST_MODE is not 1. The test hooks take effect only under ORCA_TEST_MODE=1; production configuration never sets them."
  fi
  if [[ "$ORCA_CONSUMER_BIN" != "node /opt/orca/scripts/orca-json-consumer.js" ]]; then
    die "ORCA_CONSUMER_BIN is set to '$ORCA_CONSUMER_BIN' but ORCA_TEST_MODE is not 1. The test hooks take effect only under ORCA_TEST_MODE=1; production configuration never sets them."
  fi
fi

# --- configuration validation -------------------------------------------------
if [[ ! "$ORCA_PORT" =~ ^[0-9]+$ ]] || (( ORCA_PORT < 1 || ORCA_PORT > 65535 )); then
  die "ORCA_PORT must be a numeric port (1-65535), got '$ORCA_PORT'"
fi
case "$ORCA_TOPOLOGY" in
  local|remote) ;;
  *) die "ORCA_TOPOLOGY must be 'local' or 'remote', got '$ORCA_TOPOLOGY'" ;;
esac

is_loopback() {
  case "$1" in
    127.*|localhost|::1) return 0 ;;
    *) return 1 ;;
  esac
}

# Pairing address is an advertisement, never a bind override (Decision 7).
case "$ORCA_PAIRING_ADDRESS" in
  ''|'*'|0.0.0.0|::)
    die "ORCA_PAIRING_ADDRESS '$ORCA_PAIRING_ADDRESS' is not advertisable. Use a trusted hostname, IP address, or http(s) proxy URL; wildcards, 0.0.0.0, and :: are always rejected."
    ;;
esac
if [[ "$ORCA_TOPOLOGY" == "remote" ]] && is_loopback "$ORCA_PAIRING_ADDRESS"; then
  die "ORCA_PAIRING_ADDRESS '$ORCA_PAIRING_ADDRESS' is a loopback address but ORCA_TOPOLOGY=remote. Loopback advertisement is allowed only for an explicitly local-only setup (ORCA_TOPOLOGY=local)."
fi

# --- mount and secret validation (validate and fail; never repair) ------------
for mount_path in /workspace /home/orca /opt/state/claude /opt/state/opencode; do
  if [[ ! -d "$mount_path" ]] || [[ ! -w "$mount_path" ]]; then
    die "Persistent mount '$mount_path' is not writable by the service user. Ensure the volume or bind mount is owned by (or writable by) uid 1000 before starting; the entrypoint never repairs mounts at runtime."
  fi
done

mkdir -p "$ORCA_RUN_DIR" 2>/dev/null || true
if [[ ! -w "$ORCA_RUN_DIR" ]]; then
  die "Runtime directory '$ORCA_RUN_DIR' is not writable by the service user (the image pre-creates it with uid 1000, mode 0700)."
fi

source /opt/orca/scripts/load-credentials.sh
for secret in claude.env opencode.env; do
  f="/opt/state/credentials/$secret"
  [[ -e "$f" ]] || continue
  if [[ ! -r "$f" ]]; then
    die "Secret file '$f' is not readable by the service user. Prepare the host file so uid 1000 can read it (owner uid 1000 with mode 0600, or group/ACL-scoped mode 0640); never make it world-readable."
  fi
  case "$secret" in
    claude.env)   cli=claude ;;
    opencode.env) cli=opencode ;;
  esac
  if ! credentials_validate "$f" "$cli"; then
    die "Secret file '$f' failed the $cli allowlist validation. Fix the file content (KEY=VALUE lines, keys on the $cli allowlist) before starting."
  fi
done

# --- environment for the children ---------------------------------------------
export DISPLAY=:99
export LIBGL_ALWAYS_SOFTWARE=1

# --- clear stale runtime artifacts (readiness, pairing, identity, FIFO) --------
rm -f "$ORCA_RUN_DIR"/readiness.json "$ORCA_RUN_DIR"/pairing.json \
      "$ORCA_RUN_DIR"/orca.pid "$ORCA_RUN_DIR"/xvfb.pid \
      "$ORCA_RUN_DIR"/orca.json.fifo

mkfifo "$ORCA_RUN_DIR/orca.json.fifo"

# --- identity helpers -----------------------------------------------------------
# Writes "<pid> <starttime>" atomically (create-new with no clobber). The start
# identity comes from /proc/<pid>/stat field 22 so a PID-reused process can be
# detected by the health check.
write_identity_file() { # write_identity_file <name> <pid>
  local file="$ORCA_RUN_DIR/$1" pid="$2"
  local stat starttime
  stat="$(cat "/proc/$pid/stat" 2>/dev/null)" || { log "cannot read /proc/$pid/stat for $1"; return 1; }
  stat="${stat#*) }"
  set -- $stat
  starttime="$20"
  set -o noclobber
  printf '%s %s\n' "$pid" "$starttime" > "$file" || { log "cannot write $file (create-new refused)"; set +o noclobber; return 1; }
  set +o noclobber
}

# --- signal helpers ---------------------------------------------------------------
signal_pgid() { # signal_pgid <sig> <pid> — never signals the entrypoint's own group
  local sig="$1" pid="$2"
  local own_pgid
  own_pgid="$(ps -o pgid= -p $$ | tr -d ' ')"
  if [[ "$pid" == "$own_pgid" ]]; then
    log "refusing to signal PGID $pid (equals the entrypoint's own process group); falling back to a direct PID signal"
    kill "-$sig" "$pid" 2>/dev/null || true
  else
    kill "-$sig" -- "-$pid" 2>/dev/null || kill "-$sig" "$pid" 2>/dev/null || true
  fi
}

wait_for_pid() { # wait_for_pid <pid> <secs> — exit status of the process, or 124 on timeout
  local pid="$1" secs="$2" i st
  for (( i = 0; i < secs * 5; i++ )); do
    if ! kill -0 "$pid" 2>/dev/null; then
      st=0
      wait "$pid" 2>/dev/null || st=$?
      return $st
    fi
    sleep 0.2
  done
  return 124
}

terminate_children() {
  local name pid deadline alive
  for name in xvfb server consumer; do
    pid="${CHILD_PID[$name]:-}"
    [[ -n "$pid" ]] && signal_pgid TERM "$pid"
  done
  deadline=$(( $(date +%s) + SHUTDOWN_WAIT_SECS ))
  while (( $(date +%s) < deadline )); do
    alive=0
    for name in xvfb server consumer; do
      pid="${CHILD_PID[$name]:-}"
      if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then alive=1; fi
    done
    [[ $alive == 0 ]] && break
    sleep 0.2
  done
  for name in xvfb server consumer; do
    pid="${CHILD_PID[$name]:-}"
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      log "child $name (pid $pid) did not exit within ${SHUTDOWN_WAIT_SECS}s — sending KILL"
      signal_pgid KILL "$pid"
    fi
  done
  SERVER_RC=0; wait "$SERVER_PID" 2>/dev/null || SERVER_RC=$?
  CONSUMER_RC=0; wait "$CONSUMER_PID" 2>/dev/null || CONSUMER_RC=$?
  XVFB_RC=0; wait "$XVFB_PID" 2>/dev/null || XVFB_RC=$?
}

on_signal() {
  SHUTDOWN=1
  log "received $1 — entering shutdown state (first-exit reactions suppressed)"
}
trap 'on_signal TERM' TERM
trap 'on_signal INT' INT

declare -A CHILD_PID=()

# --- launch the three managed children -------------------------------------------
setsid "$ORCA_XVFB_BIN" :99 -screen 0 1280x800x24 -nolisten tcp &
XVFB_PID=$!
CHILD_PID[xvfb]=$XVFB_PID

setsid "$ORCA_SERVE_BIN" serve --port "$ORCA_PORT" --pairing-address "$ORCA_PAIRING_ADDRESS" --json > "$ORCA_RUN_DIR/orca.json.fifo" &
SERVER_PID=$!
CHILD_PID[server]=$SERVER_PID

# ORCA_CONSUMER_BIN is an executable path, not a command string: split into argv
# words without eval and without shell metacharacter interpretation.
read -r -a consumer_argv <<< "$ORCA_CONSUMER_BIN"
setsid "${consumer_argv[@]}" < "$ORCA_RUN_DIR/orca.json.fifo" &
CONSUMER_PID=$!
CHILD_PID[consumer]=$CONSUMER_PID

write_identity_file orca.pid "$SERVER_PID"
write_identity_file xvfb.pid "$XVFB_PID"

# --- concurrent supervision with an explicit shutdown state ----------------------
while :; do
  if [[ $SHUTDOWN == 1 ]]; then break; fi
  rc=0
  wait -n -p done_pid "$XVFB_PID" "$SERVER_PID" "$CONSUMER_PID" 2>/dev/null || rc=$?
  if [[ $rc -gt 128 ]]; then
    # Interrupted by a trap (signal): the handler set SHUTDOWN; re-check.
    continue
  fi
  if [[ $SHUTDOWN == 1 ]]; then break; fi

  case "$done_pid" in
    "$XVFB_PID")
      log "Xvfb exited first (status $rc) outside shutdown — terminating server and consumer"
      signal_pgid TERM "$SERVER_PID"
      signal_pgid TERM "$CONSUMER_PID"
      wait_for_pid "$SERVER_PID" 5 >/dev/null || true;  signal_pgid KILL "$SERVER_PID" || true
      wait_for_pid "$CONSUMER_PID" 5 >/dev/null || true; signal_pgid KILL "$CONSUMER_PID" || true
      wait "$SERVER_PID" 2>/dev/null || true; wait "$CONSUMER_PID" 2>/dev/null || true
      if [[ $rc -ne 0 ]]; then
        log "runtime failure: Xvfb exited with status $rc"
        exit $rc
      fi
      log "runtime failure: Xvfb exited with status 0 outside shutdown — mapping to $RUNTIME_FAILURE_CODE (EX_SOFTWARE)"
      exit $RUNTIME_FAILURE_CODE
      ;;
    "$CONSUMER_PID")
      log "consumer exited first (status $rc) outside shutdown — terminating server and Xvfb"
      signal_pgid TERM "$SERVER_PID"
      signal_pgid TERM "$XVFB_PID"
      wait_for_pid "$SERVER_PID" 5 >/dev/null || true; signal_pgid KILL "$SERVER_PID" || true
      wait_for_pid "$XVFB_PID" 5 >/dev/null || true;  signal_pgid KILL "$XVFB_PID" || true
      wait "$SERVER_PID" 2>/dev/null || true; wait "$XVFB_PID" 2>/dev/null || true
      if [[ $rc -ne 0 ]]; then
        log "runtime failure: consumer exited with status $rc"
        exit $rc
      fi
      log "runtime failure: consumer exited with status 0 outside shutdown — mapping to $RUNTIME_FAILURE_CODE (EX_SOFTWARE)"
      exit $RUNTIME_FAILURE_CODE
      ;;
    "$SERVER_PID")
      log "server exited first (status $rc) outside shutdown — draining the consumer (bounded ${DRAIN_WINDOW_SECS}s)"
      consumer_rc=0
      wait_for_pid "$CONSUMER_PID" "$DRAIN_WINDOW_SECS" || consumer_rc=$?
      if [[ $consumer_rc == 124 ]]; then
        log "consumer did not drain within ${DRAIN_WINDOW_SECS}s — killing it (runtime failure $RUNTIME_FAILURE_CODE)"
        signal_pgid KILL "$CONSUMER_PID" || true
        wait "$CONSUMER_PID" 2>/dev/null || true
        exit $RUNTIME_FAILURE_CODE
      fi
      signal_pgid TERM "$XVFB_PID"
      wait_for_pid "$XVFB_PID" 5 >/dev/null || true; signal_pgid KILL "$XVFB_PID" || true
      wait "$XVFB_PID" 2>/dev/null || true
      if [[ $rc -ne 0 ]]; then
        log "server exited with status $rc"
        exit $rc
      fi
      if [[ $consumer_rc -ne 0 ]]; then
        log "server exited 0 but the consumer exited with status $consumer_rc"
        exit $consumer_rc
      fi
      log "server and consumer both exited 0 outside shutdown — mapping to $RUNTIME_FAILURE_CODE (EX_SOFTWARE)"
      exit $RUNTIME_FAILURE_CODE
      ;;
  esac
done

# --- shutdown state: intentional termination --------------------------------------
log "shutdown: terminating all managed children (TERM -> ${SHUTDOWN_WAIT_SECS}s -> KILL)"
terminate_children
if [[ $SERVER_RC -ne 0 ]]; then
  log "shutdown complete — exiting with the server status $SERVER_RC"
  exit "$SERVER_RC"
fi
log "shutdown complete — exiting with the consumer status $CONSUMER_RC"
exit "$CONSUMER_RC"
