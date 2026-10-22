#!/usr/bin/env bash
# Open a shell in a fresh sai-clean container (discarded on exit).
# The repo is mounted read-only at /src; `sai-local-install-test` installs that checkout
# and `sai-local-setup-test [dir]` runs its setup on a project (default: fresh ~/project).
# Extra arguments run as the command instead of bash: docker/run.sh sai-local-install-test
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
image=sai-clean

docker build -q -t "$image" "$here" >/dev/null
exec docker run --rm -it -v "$here/..:/src:ro" "$image" "$@"
