#!/usr/bin/env bash
# Neutral interactive shell for the Orca Environment service user.
# Exports NO credentials and NO tool-state relocation variables, so commands
# run from it — including Orca or Electron processes — can never inherit
# OpenCode's XDG_* values or an ambiguous shared credential environment.
#
#   agent-shell.sh                     -> interactive neutral shell
#   agent-shell.sh -- claude [args]    -> dispatch to the Claude launcher
#   agent-shell.sh -- opencode [args]  -> dispatch to the OpenCode launcher
#   agent-shell.sh -- <cmd> [args]     -> run <cmd> in the neutral environment
set -euo pipefail

if [[ $# -ge 1 && "$1" == "--" ]]; then
  shift
  if [[ $# -ge 1 ]]; then
    case "$1" in
      claude)   shift; exec /usr/local/bin/claude "$@" ;;
      opencode) shift; exec /usr/local/bin/opencode "$@" ;;
      *)        exec "$@" ;;
    esac
  fi
fi

if [[ $# -eq 0 ]]; then
  exec bash -l -i
fi

exec "$@"
