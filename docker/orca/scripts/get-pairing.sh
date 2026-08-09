#!/usr/bin/env bash
# Narrowly scoped retrieval of the ephemeral pairing offer from
# /run/orca/pairing.json. Prints a sanitized unavailable status otherwise.
set -euo pipefail

PAIRING_FILE="${ORCA_RUN_DIR:-/run/orca}/pairing.json"

if [[ -f "$PAIRING_FILE" ]]; then
  cat "$PAIRING_FILE"
else
  printf '%s\n' '{"available":false,"reason":"pairing_unavailable","guidance":"No pairing offer is available yet. Check docker compose logs for the non-secret reason, or wait for the server to finish starting."}'
fi
