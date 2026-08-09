#!/usr/bin/env bash
# OpenCode launcher — installed root-owned at /usr/local/bin/opencode.
# Loads only /opt/state/credentials/opencode.env (OpenCode allowlist), applies
# the OpenCode state relocations in its own environment, and execs the private
# npm bin by absolute path. Absent file -> exec without loading.
set -euo pipefail

CREDENTIALS_FILE=/opt/state/credentials/opencode.env
PRIVATE_BIN=/opt/agent-cli/node_modules/.bin/opencode

source /opt/orca/scripts/load-credentials.sh

if [[ -f "$CREDENTIALS_FILE" ]]; then
  credentials_load "$CREDENTIALS_FILE" opencode
fi

export XDG_CONFIG_HOME=/opt/state/opencode/config
export XDG_DATA_HOME=/opt/state/opencode/data
export XDG_CACHE_HOME=/opt/state/opencode/cache

exec "$PRIVATE_BIN" "$@"
