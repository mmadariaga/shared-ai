#!/usr/bin/env bash
# Controllable fake Orca producer for the test harness.
# Invoked via ORCA_SERVE_BIN under ORCA_TEST_MODE=1. Behavior is controlled by
# environment variables:
#   FAKE_ORCA_MODE        ready-ok | pairing-unavailable | malformed |
#                         unsupported-schema | missing-fields | slow-exit |
#                         zero-status-exit
#   FAKE_ORCA_EXIT_STATUS explicit exit status after emitting (default 0)
#   FAKE_ORCA_LINGER_SECS how long to stay alive after emitting (default 0;
#                         slow-exit always lingers unless overridden)
#   FAKE_ORCA_SIGNAL_FILE append received signal names to this file
set -euo pipefail

MODE="${FAKE_ORCA_MODE:-ready-ok}"
EXIT_STATUS="${FAKE_ORCA_EXIT_STATUS:-0}"
LINGER_SECS="${FAKE_ORCA_LINGER_SECS:-0}"
SIGNAL_FILE="${FAKE_ORCA_SIGNAL_FILE:-}"

log_signal() {
  if [[ -n "$SIGNAL_FILE" ]]; then
    printf '%s\n' "$1" >> "$SIGNAL_FILE"
  fi
}
trap 'log_signal TERM; exit 0' TERM
trap 'log_signal INT; exit 0' INT

emit_ready() {
  printf '%s\n' '{"type":"orca_server_ready","schemaVersion":1,"runtimeId":"fake-runtime","endpoint":"ws://0.0.0.0:6768","boundEndpoint":"ws://0.0.0.0:6768","advertisedEndpoint":"ws://127.0.0.1:6768","managedWslCliReconciliation":"settled","pairing":{"available":true,"url":"orca://pair?code=FAKE_SECRET_OFFER_TOKEN","endpoint":"ws://127.0.0.1:6768","deviceId":"fake-device-credential","webClientUrl":"https://fake.example/web","scope":"runtime","qr":null}}'
}

case "$MODE" in
  ready-ok)
    emit_ready
    ;;
  pairing-unavailable)
    printf '%s\n' '{"type":"orca_server_ready","schemaVersion":1,"runtimeId":"fake-runtime","endpoint":"ws://0.0.0.0:6768","boundEndpoint":"ws://0.0.0.0:6768","advertisedEndpoint":"ws://127.0.0.1:6768","pairing":{"available":false,"reason":"websocket_unavailable","guidance":"The WebSocket surface could not be opened; check the container network configuration."}}'
    ;;
  malformed)
    printf '%s\n' '{not valid json'
    ;;
  unsupported-schema)
    printf '%s\n' '{"type":"orca_server_ready","schemaVersion":999,"pairing":{"available":true,"url":"orca://pair?code=x"}}'
    ;;
  missing-fields)
    printf '%s\n' '{"type":"orca_server_ready","schemaVersion":1}'
    ;;
  slow-exit)
    emit_ready
    LINGER_SECS="${FAKE_ORCA_LINGER_SECS:-300}"
    ;;
  zero-status-exit)
    emit_ready
    ;;
  *)
    printf 'fake-orca: unknown mode %s\n' "$MODE" >&2
    exit 2
    ;;
esac

if [[ "$LINGER_SECS" != "0" ]]; then
  sleep "$LINGER_SECS"
fi

exit "$EXIT_STATUS"
