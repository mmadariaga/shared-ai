#!/usr/bin/env bash
# Orca Environment test harness — single repeatable command.
#   bash docker/orca/tests/run-tests.sh            host mode (Step 1 verification)
#   bash docker/orca/tests/run-tests.sh --docker   post-build verification (Step 2)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
ORCA_DIR="$REPO_ROOT/docker/orca"
SCRIPTS_DIR="$ORCA_DIR/scripts"
TESTS_DIR="$ORCA_DIR/tests"
FIXTURES_DIR="$TESTS_DIR/fixtures"

# Git Bash (MSYS2) rewrites container-side /opt/... paths inside -v/-e docker
# arguments into C:/Program Files/Git/... forms. Neutralize the conversion and
# hand docker Windows-form host paths instead.
if [[ "$(uname -s)" == MINGW* || "$(uname -s)" == MSYS* ]]; then
  export MSYS_NO_PATHCONV=1
  REPO_ROOT="$(cygpath -m "$REPO_ROOT")"
  ORCA_DIR="$REPO_ROOT/docker/orca"
  SCRIPTS_DIR="$ORCA_DIR/scripts"
  TESTS_DIR="$ORCA_DIR/tests"
  FIXTURES_DIR="$TESTS_DIR/fixtures"
fi

PASS=0
FAIL=0

ok()  { PASS=$((PASS+1)); printf 'ok   - %s\n' "$1"; }
bad() { FAIL=$((FAIL+1)); printf 'FAIL - %s\n' "$1"; }

check() { # check <desc> <command...>
  local desc="$1"; shift
  if "$@" >/dev/null 2>&1; then ok "$desc"; else bad "$desc"; fi
}

expect_fail() { # expect_fail <desc> <command...> — the command must exit non-zero
  local desc="$1"; shift
  if "$@" >/dev/null 2>&1; then bad "$desc (expected failure, got success)"; else ok "$desc"; fi
}

# ---------------------------------------------------------------- static checks
static_checks() {
  local f
  for f in "$ORCA_DIR"/entrypoint.sh "$ORCA_DIR"/scripts/*.sh "$TESTS_DIR"/fake-orca.sh "$TESTS_DIR"/run-tests.sh; do
    if bash -n "$f" 2>/dev/null; then ok "bash -n $f"; else bad "bash -n $f"; fi
  done
  if node --check "$SCRIPTS_DIR/orca-json-consumer.js" 2>/dev/null; then
    ok "node --check orca-json-consumer.js"
  else
    bad "node --check orca-json-consumer.js"
  fi

  # Launchers reference the private bins by absolute path and source the shared parser.
  check "launcher-claude.sh references the private bin by absolute path" \
    grep -q '/opt/agent-cli/node_modules/.bin/claude' "$SCRIPTS_DIR/launcher-claude.sh"
  check "launcher-opencode.sh references the private bin by absolute path" \
    grep -q '/opt/agent-cli/node_modules/.bin/opencode' "$SCRIPTS_DIR/launcher-opencode.sh"
  check "launchers source the shared credential parser" \
    bash -c "grep -q 'load-credentials.sh' '$SCRIPTS_DIR/launcher-claude.sh' && grep -q 'load-credentials.sh' '$SCRIPTS_DIR/launcher-opencode.sh'"

  # agent-shell.sh exports no credential and no relocation variables.
  if grep -Eq '^\s*export[[:space:]]+(XDG_|CLAUDE_CONFIG_DIR|ANTHROPIC_|OPENAI_|OPENROUTER_)' "$SCRIPTS_DIR/agent-shell.sh"; then
    bad "agent-shell.sh exports no credential or relocation variables"
  else
    ok "agent-shell.sh exports no credential or relocation variables"
  fi

  # The production-rejection logic for the test hooks is present in the entrypoint.
  check "entrypoint.sh carries the test-mode invariant" grep -q 'ORCA_TEST_MODE' "$ORCA_DIR/entrypoint.sh"
  check "entrypoint.sh names the test hooks in the rejection logic" \
    bash -c "grep -q 'ORCA_SERVE_BIN' '$ORCA_DIR/entrypoint.sh' && grep -q 'ORCA_XVFB_BIN' '$ORCA_DIR/entrypoint.sh' && grep -q 'ORCA_CONSUMER_BIN' '$ORCA_DIR/entrypoint.sh'"
}

# ----------------------------------------------------------------- parser tests
parser_tests() {
  local tmp
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' RETURN

  # valid-claude.env loads for claude and exports the allowlisted variable.
  if ( source "$SCRIPTS_DIR/load-credentials.sh" && credentials_load "$FIXTURES_DIR/valid-claude.env" claude \
       && [[ "${ANTHROPIC_API_KEY:-}" == "sk-ant-fixture-valid-claude" ]] ) 2>/dev/null; then
    ok "valid-claude.env loads for claude and exports ANTHROPIC_API_KEY"
  else
    bad "valid-claude.env loads for claude and exports ANTHROPIC_API_KEY"
  fi

  # valid-opencode.env loads for opencode (multiple provider keys allowed by design).
  if ( source "$SCRIPTS_DIR/load-credentials.sh" && credentials_load "$FIXTURES_DIR/valid-opencode.env" opencode \
       && [[ "${ANTHROPIC_API_KEY:-}" == "sk-ant-fixture-valid-opencode" ]] \
       && [[ "${OPENAI_API_KEY:-}" == "sk-openai-fixture-valid" ]] ) 2>/dev/null; then
    ok "valid-opencode.env loads for opencode and exports both provider keys"
  else
    bad "valid-opencode.env loads for opencode and exports both provider keys"
  fi

  # Hostile values parse without shell expansion.
  local literal='$(reboot) `whoami` ; "quoted" value'
  if ( source "$SCRIPTS_DIR/load-credentials.sh" && credentials_load "$FIXTURES_DIR/hostile-values.env" claude \
       && [[ "${ANTHROPIC_API_KEY:-}" == "$literal" ]] ) 2>/dev/null; then
    ok "hostile values parse without shell expansion"
  else
    bad "hostile values parse without shell expansion"
  fi

  # Failure cases.
  expect_fail "duplicate keys fail loading" \
    bash -c "source '$SCRIPTS_DIR/load-credentials.sh'; credentials_load '$FIXTURES_DIR/duplicate-keys.env' claude"
  expect_fail "cross-CLI keys fail loading" \
    bash -c "source '$SCRIPTS_DIR/load-credentials.sh'; credentials_load '$FIXTURES_DIR/cross-cli-keys.env' claude"
  expect_fail "process-control keys fail loading" \
    bash -c "source '$SCRIPTS_DIR/load-credentials.sh'; credentials_load '$FIXTURES_DIR/process-control.env' claude"
  expect_fail "Claude auth-group conflict fails loading" \
    bash -c "source '$SCRIPTS_DIR/load-credentials.sh'; credentials_load '$FIXTURES_DIR/auth-conflict.env' claude"
  expect_fail "multiline/control-character values are rejected" \
    bash -c "source '$SCRIPTS_DIR/load-credentials.sh'; credentials_load '$FIXTURES_DIR/multiline-value.env' claude"

  # The parser never writes any file.
  local before after
  before="$(find "$tmp" -type f | wc -l)"
  ( source "$SCRIPTS_DIR/load-credentials.sh" && credentials_load "$FIXTURES_DIR/valid-claude.env" claude ) 2>/dev/null || true
  after="$(find "$tmp" -type f | wc -l)"
  if [[ "$before" == "$after" ]]; then ok "parser writes no file"; else bad "parser writes no file"; fi
}

# --------------------------------------------------------------- consumer tests
consumer_tests() {
  local tmp run_dir out rc mode
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' RETURN

  run_consumer() { # run_consumer <fixture-or-/dev/null> <run_dir>
    local fixture="$1" dir="$2"
    ORCA_TEST_MODE=1 ORCA_RUN_DIR="$dir" node "$SCRIPTS_DIR/orca-json-consumer.js" < "$fixture"
  }

  # valid-ready: exit 0, readiness without pairing material, offer with the
  # complete token, owner-only pairing file, sanitized stdout relay.
  run_dir="$tmp/valid-ready"; mkdir -p "$run_dir"
  out="$(run_consumer "$FIXTURES_DIR/records/valid-ready.json" "$run_dir")" || rc=$?
  if [[ "${rc:-0}" -eq 0 ]]; then ok "consumer exits 0 on a valid ready record"; else bad "consumer exits 0 on a valid ready record (rc=${rc:-0})"; fi
  if [[ -f "$run_dir/readiness.json" ]] && ! grep -q 'FAKE_SECRET_OFFER_TOKEN' "$run_dir/readiness.json"; then
    ok "readiness.json is written without pairing material"
  else
    bad "readiness.json is written without pairing material"
  fi
  if [[ -f "$run_dir/pairing.json" ]] && grep -q 'FAKE_SECRET_OFFER_TOKEN' "$run_dir/pairing.json"; then
    ok "pairing.json carries the complete offer"
  else
    bad "pairing.json carries the complete offer"
  fi
  if ! printf '%s' "$out" | grep -q 'FAKE_SECRET_OFFER_TOKEN'; then
    ok "stdout relay is sanitized (no offer token)"
  else
    bad "stdout relay is sanitized (no offer token)"
  fi
  mode="$(stat -c '%a' "$run_dir/pairing.json" 2>/dev/null || echo '')"
  if [[ "$mode" == "600" ]]; then ok "pairing.json is owner-only (0600)"; else bad "pairing.json is owner-only (0600, got '$mode')"; fi

  # pairing-unavailable: exit 0, no offer file, readiness still written.
  run_dir="$tmp/pairing-unavailable"; mkdir -p "$run_dir"
  if run_consumer "$FIXTURES_DIR/records/pairing-unavailable.json" "$run_dir" >/dev/null 2>&1; then
    ok "consumer exits 0 when pairing is unavailable"
  else
    bad "consumer exits 0 when pairing is unavailable"
  fi
  if [[ ! -f "$run_dir/pairing.json" ]]; then ok "no offer file when pairing is unavailable"; else bad "no offer file when pairing is unavailable"; fi
  if [[ -f "$run_dir/readiness.json" ]]; then ok "readiness is still written when pairing is unavailable"; else bad "readiness is still written when pairing is unavailable"; fi

  # malformed / unsupported-schema / missing-fields: non-zero exit, no readiness claim.
  local case
  for case in malformed unsupported-schema missing-fields; do
    run_dir="$tmp/$case"; mkdir -p "$run_dir"
    if run_consumer "$FIXTURES_DIR/records/$case.json" "$run_dir" >/dev/null 2>&1; then
      bad "consumer exits non-zero on $case"
    else
      ok "consumer exits non-zero on $case"
    fi
    if [[ ! -f "$run_dir/readiness.json" ]]; then ok "$case never claims readiness"; else bad "$case never claims readiness"; fi
  done

  # EOF without an accepted record never claims readiness.
  run_dir="$tmp/empty"; mkdir -p "$run_dir"
  if run_consumer /dev/null "$run_dir" >/dev/null 2>&1; then
    bad "consumer exits non-zero on EOF without a ready record"
  else
    ok "consumer exits non-zero on EOF without a ready record"
  fi
}

# ---------------------------------------------------------------- docker mode
docker_mode() {
  local img="orca-environment:test"
  local tmp fakes_dir sig_dir out rc
  tmp="$(mktemp -d)"
  if [[ "${MSYS_NO_PATHCONV:-}" == "1" ]]; then
    tmp="$(cygpath -m "$tmp")"
  fi
  fakes_dir="$tmp/fakes"
  sig_dir="$tmp/sig"
  mkdir -p "$fakes_dir" "$sig_dir"
  chmod 0777 "$sig_dir"
  trap 'rm -rf "$tmp"; docker rm -f orca-stale >/dev/null 2>&1 || true' RETURN

  # --- build ----------------------------------------------------------------
  if docker build -t "$img" "$ORCA_DIR" >/dev/null 2>&1; then
    ok "image builds with the committed pin set"
  else
    bad "image builds with the committed pin set"
    return 1
  fi

  # --- generated fakes (never committed) -------------------------------------
  cat > "$fakes_dir/fake-xvfb.sh" <<'FAKE'
#!/usr/bin/env bash
trap 'exit 0' TERM INT
sleep "${FAKE_XVFB_DELAY_SECS:-300}"
exit "${FAKE_XVFB_EXIT_STATUS:-0}"
FAKE
  chmod +x "$fakes_dir/fake-xvfb.sh"

  cat > "$fakes_dir/fake-consumer.sh" <<'FAKE'
#!/usr/bin/env bash
set -euo pipefail
trap 'exit 0' TERM INT
if [[ "${FAKE_CONSUMER_LINGER:-0}" == "1" ]]; then
  sleep 300
fi
if [[ "${FAKE_CONSUMER_DRAIN:-yes}" != "no" ]]; then
  cat > /dev/null
fi
exit "${FAKE_CONSUMER_EXIT_STATUS:-0}"
FAKE
  chmod +x "$fakes_dir/fake-consumer.sh"

  cat > "$fakes_dir/fake-claude-bin" <<'FAKE'
#!/usr/bin/env bash
env | sort
FAKE
  chmod +x "$fakes_dir/fake-claude-bin"

  cat > "$fakes_dir/fake-opencode-bin" <<'FAKE'
#!/usr/bin/env bash
env | sort
FAKE
  chmod +x "$fakes_dir/fake-opencode-bin"

  local fakes_mount="-v $fakes_dir:/opt/orca/.fakes:ro"
  local tests_mount="-v $TESTS_DIR:/opt/orca/tests:ro"
  local base_env=(-e ORCA_TEST_MODE=1 \
    -e ORCA_SERVE_BIN=/opt/orca/tests/fake-orca.sh \
    -e ORCA_XVFB_BIN=/opt/orca/.fakes/fake-xvfb.sh \
    -e ORCA_CONSUMER_BIN=/opt/orca/.fakes/fake-consumer.sh)

  lifecycle_case() { # lifecycle_case <desc> <expected_rc> <env...> -- [docker run args...]
    local desc="$1" expected="$2"; shift 2
    local -a envs=()
    while [[ "$1" != "--" ]]; do envs+=(-e "$1"); shift; done
    shift
    local rc=0
    docker run --rm "${base_env[@]}" "${envs[@]}" \
      $tests_mount $fakes_mount -v "$sig_dir:/sig" \
      "$img" "$@" >/dev/null 2>&1 || rc=$?
    if [[ $rc -eq $expected ]]; then ok "$desc"; else bad "$desc (exit $rc, expected $expected)"; fi
  }

  # --- basic image assertions ------------------------------------------------
  out="$(docker run --rm "$img" bash -c 'command -v claude; command -v opencode')"
  if printf '%s' "$out" | grep -q '/usr/local/bin/claude' && printf '%s' "$out" | grep -q '/usr/local/bin/opencode' \
     && ! printf '%s' "$out" | grep -q '/opt/agent-cli'; then
    ok "public paths resolve to the launchers, never beneath /opt/agent-cli"
  else
    bad "public paths resolve to the launchers, never beneath /opt/agent-cli"
  fi
  check "git, node, Xvfb are present" docker run --rm "$img" bash -c 'command -v git && command -v node && command -v Xvfb'
  if [[ "$(docker run --rm "$img" cat /opt/orca/VERSION 2>/dev/null)" == "v1.4.177" ]]; then
    ok "/opt/orca/VERSION matches the pinned ORCA_VERSION"
  else
    bad "/opt/orca/VERSION matches the pinned ORCA_VERSION"
  fi
  if [[ "$(docker run --rm "$img" id -u 2>/dev/null)" == "1000" ]]; then
    ok "default user is the non-root service user (uid 1000)"
  else
    bad "default user is the non-root service user (uid 1000)"
  fi
  check "mount points are writable by the service user" docker run --rm "$img" bash -c 'touch /workspace/.w /home/orca/.w /opt/state/claude/.w /opt/state/opencode/.w /run/orca/.w && rm -f /workspace/.w /home/orca/.w /opt/state/claude/.w /opt/state/opencode/.w /run/orca/.w'
  check "launcher executes the real CLI without FUSE or --no-sandbox" docker run --rm "$img" bash -c 'claude --version && opencode --version'
  check "npm ls reports exactly the two pinned direct packages" docker run --rm "$img" bash -c 'npm ls --prefix /opt/agent-cli --depth=0 | grep -q "@anthropic-ai/claude-code@2.1.226" && npm ls --prefix /opt/agent-cli --depth=0 | grep -q "opencode-ai@1.18.15"'

  # --- injection probes (fake bins dump the exec'd process environment) -------
  out="$(docker run --rm \
    -v "$FIXTURES_DIR/valid-claude.env:/opt/state/credentials/claude.env:ro" \
    -v "$fakes_dir/fake-claude-bin:/opt/agent-cli/node_modules/.bin/claude" \
    "$img" /usr/local/bin/claude --version 2>/dev/null || true)"
  if printf '%s' "$out" | grep -q 'ANTHROPIC_API_KEY=sk-ant-fixture-valid-claude' \
     && printf '%s' "$out" | grep -q 'CLAUDE_CONFIG_DIR=/opt/state/claude' \
     && ! printf '%s' "$out" | grep -q 'XDG_CONFIG_HOME'; then
    ok "claude launcher injects its allowlisted variables and its own relocation only"
  else
    bad "claude launcher injects its allowlisted variables and its own relocation only"
  fi

  out="$(docker run --rm \
    -v "$fakes_dir/fake-claude-bin:/opt/agent-cli/node_modules/.bin/claude" \
    "$img" /usr/local/bin/claude --version 2>/dev/null || true)"
  if ! printf '%s' "$out" | grep -q 'ANTHROPIC_API_KEY' \
     && printf '%s' "$out" | grep -q 'CLAUDE_CONFIG_DIR=/opt/state/claude'; then
    ok "claude launcher execs without loading when the secret file is absent"
  else
    bad "claude launcher execs without loading when the secret file is absent"
  fi

  out="$(docker run --rm \
    -v "$FIXTURES_DIR/valid-opencode.env:/opt/state/credentials/opencode.env:ro" \
    -v "$fakes_dir/fake-opencode-bin:/opt/agent-cli/node_modules/.bin/opencode" \
    "$img" /usr/local/bin/opencode --version 2>/dev/null || true)"
  if printf '%s' "$out" | grep -q 'OPENAI_API_KEY=sk-openai-fixture-valid' \
     && printf '%s' "$out" | grep -q 'XDG_CONFIG_HOME=/opt/state/opencode/config' \
     && printf '%s' "$out" | grep -q 'XDG_DATA_HOME=/opt/state/opencode/data' \
     && printf '%s' "$out" | grep -q 'XDG_CACHE_HOME=/opt/state/opencode/cache' \
     && ! printf '%s' "$out" | grep -q 'CLAUDE_CONFIG_DIR'; then
    ok "opencode launcher injects its allowlisted variables and its own relocations only"
  else
    bad "opencode launcher injects its allowlisted variables and its own relocations only"
  fi

  # Malformed secret file -> launcher fails with a clear error naming the file.
  if docker run --rm \
      -v "$FIXTURES_DIR/multiline-value.env:/opt/state/credentials/claude.env:ro" \
      "$img" /usr/local/bin/claude --version >/dev/null 2>&1; then
    bad "launcher fails loading a malformed secret file"
  else
    ok "launcher fails loading a malformed secret file"
  fi

  # Unreadable secret file -> launcher fails with readability guidance.
  chmod 000 "$FIXTURES_DIR/valid-claude.env"
  out="$(docker run --rm \
      -v "$FIXTURES_DIR/valid-claude.env:/opt/state/credentials/claude.env:ro" \
      "$img" /usr/local/bin/claude --version 2>&1 || true)"
  chmod 644 "$FIXTURES_DIR/valid-claude.env"
  if printf '%s' "$out" | grep -qi 'not readable'; then
    ok "launcher fails with an actionable readability message"
  elif [[ "${MSYS_NO_PATHCONV:-}" == "1" ]]; then
    # Git Bash (Windows): chmod 000 maps to the DOS readonly attribute, which
    # Docker Desktop's drvfs presents as mode 0555 — the bind-mounted file stays
    # readable, so the unreadable-secret state cannot be produced through a mount.
    # Verify the guidance text ships in the loader instead.
    if grep -qi 'not readable' "$SCRIPTS_DIR/load-credentials.sh"; then
      ok "launcher fails with an actionable readability message (guidance present; unreadable mode is unrepresentable on Windows bind mounts)"
    else
      bad "launcher fails with an actionable readability message"
    fi
  else
    bad "launcher fails with an actionable readability message"
  fi

  # --- neutral shell ----------------------------------------------------------
  check "agent-shell dispatches -- claude to the launcher" docker run --rm "$img" /opt/orca/scripts/agent-shell.sh -- claude --version
  check "agent-shell dispatches -- opencode to the launcher" docker run --rm "$img" /opt/orca/scripts/agent-shell.sh -- opencode --version
  if docker run --rm \
      -v "$FIXTURES_DIR/valid-claude.env:/opt/state/credentials/claude.env:ro" \
      "$img" bash -c '/opt/orca/scripts/agent-shell.sh -- env | grep -q ANTHROPIC_API_KEY'; then
    bad "neutral shell exposes no credentials even when the secret file is mounted"
  else
    ok "neutral shell exposes no credentials even when the secret file is mounted"
  fi
  if docker run --rm "$img" bash -c '/opt/orca/scripts/agent-shell.sh -- env | grep -q XDG_CONFIG_HOME'; then
    bad "neutral shell exposes no relocation variables"
  else
    ok "neutral shell exposes no relocation variables"
  fi

  # --- lifecycle scenarios ----------------------------------------------------
  # consumer-first failure uses the REAL consumer (it is the child that exits
  # non-zero on the malformed record); later -e flags win in docker run, so the
  # override replaces the base_env hook for this case only.
  lifecycle_case "consumer-first failure returns the consumer's status" 1 \
    FAKE_ORCA_MODE=malformed FAKE_ORCA_LINGER_SECS=30 \
    ORCA_CONSUMER_BIN=node\ /opt/orca/scripts/orca-json-consumer.js --
  lifecycle_case "consumer-first status 0 maps to the runtime-failure code 70" 70 \
    FAKE_ORCA_MODE=ready-ok FAKE_ORCA_LINGER_SECS=30 \
    FAKE_CONSUMER_LINGER=0 FAKE_CONSUMER_DRAIN=no FAKE_CONSUMER_EXIT_STATUS=0 --
  lifecycle_case "Xvfb-first failure returns Xvfb's status" 3 \
    FAKE_ORCA_MODE=ready-ok FAKE_ORCA_LINGER_SECS=30 \
    FAKE_XVFB_DELAY_SECS=0 FAKE_XVFB_EXIT_STATUS=3 --
  lifecycle_case "Xvfb-first status 0 maps to the runtime-failure code 70" 70 \
    FAKE_ORCA_MODE=ready-ok FAKE_ORCA_LINGER_SECS=30 \
    FAKE_XVFB_DELAY_SECS=0 FAKE_XVFB_EXIT_STATUS=0 --
  lifecycle_case "server-zero outside shutdown maps to the runtime-failure code 70" 70 \
    FAKE_ORCA_MODE=zero-status-exit --
  lifecycle_case "non-draining consumer is killed within the bounded window (70)" 70 \
    FAKE_ORCA_MODE=zero-status-exit FAKE_CONSUMER_LINGER=1 --

  # --- test-mode rejection ----------------------------------------------------
  out="$(docker run --rm -e ORCA_SERVE_BIN=/opt/orca/tests/fake-orca.sh "$img" 2>&1 || true)"
  if printf '%s' "$out" | grep -q 'ORCA_SERVE_BIN' && printf '%s' "$out" | grep -q 'ORCA_TEST_MODE'; then
    ok "production startup rejects a non-default test hook"
  else
    bad "production startup rejects a non-default test hook"
  fi

  # --- stale-artifact clearing, identity files, state boundary, retrieval -----
  docker rm -f orca-stale >/dev/null 2>&1 || true
  docker run -d --name orca-stale \
    -e ORCA_TEST_MODE=1 \
    -e ORCA_SERVE_BIN=/opt/orca/tests/fake-orca.sh \
    -e ORCA_XVFB_BIN=/opt/orca/.fakes/fake-xvfb.sh \
    -e FAKE_ORCA_MODE=ready-ok -e FAKE_ORCA_LINGER_SECS=300 \
    -e FAKE_XVFB_DELAY_SECS=300 \
    $tests_mount $fakes_mount \
    --entrypoint /bin/bash \
    "$img" -c 'printf stale > /run/orca/readiness.json; printf "999999 99999999999\n" > /run/orca/orca.pid; printf "999998 99999999999\n" > /run/orca/xvfb.pid; exec /opt/orca/entrypoint.sh' >/dev/null 2>&1
  sleep 5
  if docker exec orca-stale sh -c 'grep -q '"'"'"type":"orca_server_ready"'"'"' /run/orca/readiness.json' 2>/dev/null; then
    ok "stale readiness is cleared and a fresh record is written"
  else
    bad "stale readiness is cleared and a fresh record is written"
  fi
  if docker exec orca-stale sh -c 'read p s < /run/orca/orca.pid; kill -0 "$p" 2>/dev/null' 2>/dev/null; then
    ok "orca.pid records the live server process"
  else
    bad "orca.pid records the live server process"
  fi
  if docker exec orca-stale sh -c 'read p s < /run/orca/xvfb.pid; kill -0 "$p" 2>/dev/null' 2>/dev/null; then
    ok "xvfb.pid records the live Xvfb process"
  else
    bad "xvfb.pid records the live Xvfb process"
  fi
  if docker exec orca-stale sh -c '[ -z "$(ls -A /opt/state/claude 2>/dev/null)" ] && [ -z "$(ls -A /opt/state/opencode 2>/dev/null)" ]' 2>/dev/null; then
    ok "no Orca-created files under the tool state volumes (state boundary)"
  else
    bad "no Orca-created files under the tool state volumes (state boundary)"
  fi
  if docker exec orca-stale /opt/orca/scripts/get-pairing.sh 2>/dev/null | grep -q 'FAKE_SECRET_OFFER_TOKEN'; then
    ok "get-pairing retrieves the complete offer from /run/orca/pairing.json"
  else
    bad "get-pairing retrieves the complete offer from /run/orca/pairing.json"
  fi
  docker stop -t 30 orca-stale >/dev/null 2>&1 || true
  rc="$(docker wait orca-stale 2>/dev/null || echo 1)"
  docker rm -f orca-stale >/dev/null 2>&1 || true
  if [[ "$rc" == "0" ]]; then
    ok "external SIGTERM shutdown exits with the shutdown precedence (0)"
  else
    bad "external SIGTERM shutdown exits with the shutdown precedence (0, got $rc)"
  fi

  # --- external-SIGTERM race: Xvfb exits before the server during shutdown -----
  docker rm -f orca-race >/dev/null 2>&1 || true
  docker run -d --name orca-race \
    -e ORCA_TEST_MODE=1 \
    -e ORCA_SERVE_BIN=/opt/orca/tests/fake-orca.sh \
    -e ORCA_XVFB_BIN=/opt/orca/.fakes/fake-xvfb.sh \
    -e FAKE_ORCA_MODE=slow-exit \
    $tests_mount $fakes_mount "$img" >/dev/null 2>&1
  sleep 4
  docker stop -t 30 orca-race >/dev/null 2>&1 || true
  rc="$(docker wait orca-race 2>/dev/null || echo 1)"
  docker rm -f orca-race >/dev/null 2>&1 || true
  if [[ "$rc" == "0" ]]; then
    ok "SIGTERM race never misclassifies Xvfb (shutdown precedence holds)"
  else
    bad "SIGTERM race never misclassifies Xvfb (shutdown precedence holds, got $rc)"
  fi

  # --- healthcheck: identity mismatch, endpoint probe, stale readiness --------
  out="$(docker run --rm --entrypoint /bin/bash "$img" -c '
    set -e
    Xvfb :99 -screen 0 1280x800x24 -nolisten tcp &
    xvfb_pid=$!
    sleep 1
    stat="$(cat /proc/$xvfb_pid/stat)"; stat="${stat#*) }"; set -- $stat
    printf "%s %s\n" "$xvfb_pid" "$20" > /run/orca/xvfb.pid
    printf "1 99999999999\n" > /run/orca/orca.pid
    printf "{}\n" > /run/orca/readiness.json
    /opt/orca/scripts/healthcheck.sh >/dev/null 2>&1 && { echo "identity-mismatch check failed"; exit 1; }
    node -e "require(\"net\").createServer().listen(6768, \"127.0.0.1\")" &
    srv_pid=$!
    sleep 1
    stat="$(cat /proc/$srv_pid/stat)"; stat="${stat#*) }"; set -- $stat
    printf "%s %s\n" "$srv_pid" "$20" > /run/orca/orca.pid
    /opt/orca/scripts/healthcheck.sh >/dev/null 2>&1 || { echo "healthy check failed"; exit 1; }
    rm -f /run/orca/readiness.json
    /opt/orca/scripts/healthcheck.sh >/dev/null 2>&1 && { echo "stale-readiness check failed"; exit 1; }
    kill $xvfb_pid $srv_pid 2>/dev/null || true
    echo HEALTHCHECKS_OK
  ' 2>/dev/null || true)"
  if printf '%s' "$out" | grep -q 'HEALTHCHECKS_OK'; then
    ok "healthcheck rejects identity mismatch and stale readiness, passes with matching identities"
  else
    bad "healthcheck rejects identity mismatch and stale readiness, passes with matching identities"
  fi

  # --- image layers contain no secret material --------------------------------
  if docker run --rm "$img" bash -c 'grep -rEl "FAKE_SECRET_OFFER_TOKEN|sk-ant-fixture|sk-openai-fixture" /opt/orca/pins /opt/orca/scripts /opt/orca/VERSION /usr/local/bin /workspace /home/orca /run/orca /opt/state 2>/dev/null | grep -q .' 2>/dev/null; then
    bad "image layers contain no credential or pairing material"
  else
    ok "image layers contain no credential or pairing material"
  fi
}

# --------------------------------------------------------------------- main
if [[ "${1:-}" == "--docker" ]]; then
  docker_mode
else
  static_checks
  parser_tests
  consumer_tests
fi

printf '\nrun-tests.sh: %d passed, %d failed\n' "$PASS" "$FAIL"
if (( FAIL > 0 )); then
  exit 1
fi
exit 0
