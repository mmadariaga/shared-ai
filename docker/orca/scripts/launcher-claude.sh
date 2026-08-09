#!/usr/bin/env bash
# Claude Code launcher — installed root-owned at /usr/local/bin/claude.
# Loads only /opt/state/credentials/claude.env (Claude allowlist), applies the
# Claude state relocation in its own environment, and execs the private npm bin
# by absolute path. Absent file -> exec without loading.
set -euo pipefail

CREDENTIALS_FILE=/opt/state/credentials/claude.env
PRIVATE_BIN=/opt/agent-cli/node_modules/.bin/claude

source /opt/orca/scripts/load-credentials.sh

if [[ -f "$CREDENTIALS_FILE" ]]; then
  credentials_load "$CREDENTIALS_FILE" claude
fi

# State relocation applies only inside this launcher's environment — never
# process-wide and never in interactive shells (Orca cannot inherit it).
export CLAUDE_CONFIG_DIR=/opt/state/claude

exec "$PRIVATE_BIN" "$@"
