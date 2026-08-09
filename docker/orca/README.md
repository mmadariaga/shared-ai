# Orca Environment

A self-contained remote development appliance: a persistent, headless Ubuntu 24.04 container that runs **Orca** and both supported agent CLIs — **Claude Code** and **OpenCode** — without installing or exposing any host development tools. Orca runs as a non-root service user with a virtual display and software rendering; repositories live in persistent storage; credentials are injected at runtime through opt-in secret mounts and are never baked into the image.

> All documented commands run from the `docker/orca/` working directory. Compose resolves relative paths (build context, secret sources) from the Compose file's project directory, so a repo-root `docker compose -f docker/orca/compose.yaml ...` invocation resolves the same way.

## Host prerequisites

- Docker Engine with the Compose v2 plugin (`docker compose version`).
- Enough disk for a large image (~1–2 GB download, several GB extracted) and headroom for workloads.
- No host display, GPU, D-Bus, or FUSE is required: the container renders via its own Xvfb display with `LIBGL_ALWAYS_SOFTWARE=1`.
- The image build requires network access (apt, npm registry, the Orca release asset host). There is no offline/vendored mirror in this change.
- `bash` is only needed on the host to run the test harness (Step 1 verification; Git Bash or WSL on Windows).

## Runtime environment variables

Copy `.env.example` to `.env` and adjust. Only these variables belong in `.env`:

| Variable | Default | Meaning |
|---|---|---|
| `ORCA_PORT` | `6768` | The Orca listener port inside the container. |
| `ORCA_PUBLISH_ADDRESS` | `127.0.0.1` | The host address Compose publishes the listener on. Safe loopback default — change deliberately. |
| `ORCA_PUBLISH_PORT` | `6768` | The host port Compose maps to the listener. |
| `ORCA_PAIRING_ADDRESS` | `127.0.0.1` | The **advertised** client-reachable endpoint passed to `orca serve` (`--pairing-address`). An advertisement only — it never overrides the listener bind. Accepts a trusted hostname, IP, or `http(s)` reverse-proxy URL (normalized to `ws(s)`). Wildcards (`*`), `0.0.0.0`, and `::` are always rejected; loopback is accepted only when `ORCA_TOPOLOGY=local`. |
| `ORCA_TOPOLOGY` | `local` | `local` allows a loopback advertisement (remote clients cannot use it); `remote` rejects loopback. |

No build pins, no secret values, no tool-state relocation variables (`CLAUDE_CONFIG_DIR`, `XDG_*`), and no test-mode variables live in `.env`.

## Build pins and version channels

Every downloaded runtime artifact is pinned and integrity-verified:

- **Orca** — `checksums.env` (committed) is the single source of truth: `ORCA_VERSION` (an explicit release tag, never `latest`), `ORCA_ARCH`, and `ORCA_SHA256`. The committed set is complete and validated for the default architecture **`x86_64` (amd64)**, so the first build works unchanged on amd64. **arm64 builds require a pin update**: set `ORCA_ARCH=arm64` plus the matching `ORCA_SHA256` in `checksums.env`, then rebuild. The build compares `ORCA_ARCH` against the build target (`amd64 → x86_64`, `arm64 → arm64`) and **fails before extraction** with a remediation message when they disagree, so a non-runnable AppImage can never enter an image. The AppImage is downloaded, verified against the pinned SHA-256, and extracted at build time (`--appimage-extract`); the runtime needs no FUSE.
- **Agent CLIs** — `package.json` + the committed `package-lock.json` pin `@anthropic-ai/claude-code` and `opencode-ai` at exact versions with registry integrity hashes. The build runs `npm ci --prefix /opt/agent-cli` and asserts the installed direct versions with the pinned form `npm ls --prefix /opt/agent-cli --depth=0` (the prefix is mandatory — an unprefixed `npm ls` inspects whatever project the working directory resolves to).

The operator version channel: edit `checksums.env` (Orca) or run `npm install --save-exact <pkg>@<version>` in `docker/orca/` (CLIs), then rebuild. `/opt/orca/VERSION` in a built image records the exact Orca release tag; the build log shows the checksum-verification line completing before extraction.

## Build and lifecycle commands

All commands run from the `docker/orca/` working directory.

```bash
# Build (first build works unchanged on amd64; base stack runs with zero credential files)
docker compose build
# or build and start in one step:
docker compose up -d --build

# Inspect
docker compose ps                # health: unhealthy -> healthy once Orca is ready
docker compose logs -f           # sanitized startup / Xvfb / readiness / pairing status
docker compose exec orca /opt/orca/scripts/agent-shell.sh        # neutral interactive shell

# Stop / restart / remove (named volumes are retained unless you pass -v)
docker compose stop
docker compose restart
docker compose down              # keeps orca-workspace, orca-state, claude-state, opencode-state
docker compose down -v           # DESTROYS all four named volumes — back up first!
```

### Expected health/readiness transition

The container's main process is the entrypoint (`/opt/orca/entrypoint.sh`), which runs as the non-root service user `orca` (uid/gid 1000). It starts Xvfb on `:99`, validates mount writability and secret readability (failing with an actionable message instead of repairing), clears stale runtime artifacts, and launches three supervised children:

1. **Xvfb** — the container-local display.
2. **The Orca server** — the fixed production command `/opt/orca/AppRun serve --port <n> --pairing-address <a> --json` (extracted at build; no `orca` wrapper on `PATH`; no `--no-sandbox` — an unavailable sandbox fails clearly at startup).
3. **The Node.js JSON consumer** — `/opt/orca/scripts/orca-json-consumer.js` reads the server's stdout through a FIFO and owns the readiness contract: a `type: orca_server_ready` record with `schemaVersion` **1** (the contract version pinned for the committed Orca release) produces `/run/orca/readiness.json` (pairing stripped) and `/run/orca/pairing.json` (owner-only); malformed, unsupported-schema, or missing-field records exit non-zero and never claim readiness.

The Compose health check (`/opt/orca/scripts/healthcheck.sh`) passes only when the exact live server process (via `/run/orca/orca.pid`) **and** the exact live Xvfb process (via `/run/orca/xvfb.pid`) are alive and match their recorded start identities (PID-reuse safe), the container-local bound endpoint accepts connections, and a current readiness record exists. A missing or identity-mismatched Xvfb makes the container unhealthy even when the server and readiness look fine.

If an essential child exits on its own outside shutdown, the whole runtime fails. A premature exit with status 0 maps to the documented runtime-failure code **`70` (EX_SOFTWARE)** — a zero-status loss is never treated as success. On `docker compose stop` (SIGTERM), the entrypoint enters its shutdown state, forwards TERM to each child's process group, waits 10 s, sends KILL to any survivor, and exits with the server's status when non-zero, otherwise the consumer's status.

## State layout and backups

Four named volumes, each a disjoint persistent boundary:

| Volume | Target | Content |
|---|---|---|
| `orca-workspace` | `/workspace` | Repositories, Git worktrees, agent-created files. |
| `orca-state` | `/home/orca` | All Orca state — profile, configuration, and **persistent paired-device registrations and device keys** (security-sensitive pairing material, persisted deliberately). |
| `claude-state` | `/opt/state/claude` | Claude Code configuration and tool-managed authentication state (`CLAUDE_CONFIG_DIR`, set only by the Claude launcher) — backup-sensitive. |
| `opencode-state` | `/opt/state/opencode` | OpenCode configuration and tool-managed authentication state (`XDG_*`, set only by the OpenCode launcher) — backup-sensitive. |

The relocation variables are **never exported process-wide or shell-wide** — they apply only inside each tool's launcher, so Orca and unrelated commands never see them and the boundaries stay disjoint.

**Backup and restore (stop-consistent).** With the stack stopped (`docker compose stop`):

```bash
docker run --rm -v orca-workspace:/ws -v "$PWD/backup/workspace:/out" alpine sh -c 'cp -a /ws/. /out/'
docker run --rm -v orca-state:/st -v "$PWD/backup/orca-state:/out" alpine sh -c 'cp -a /st/. /out/'
docker run --rm -v claude-state:/st -v "$PWD/backup/claude-state:/out" alpine sh -c 'cp -a /st/. /out/'
docker run --rm -v opencode-state:/st -v "$PWD/backup/opencode-state:/out" alpine sh -c 'cp -a /st/. /out/'
```

- **`orca-state` contains persistent paired-device registrations and device keys — security-sensitive pairing material.** Its backup is a **protected backup**: encrypt it (e.g. age/gpg), keep it access-controlled, and store it with the restore guidance below. **Ephemeral pairing offers and codes are never backed up** — they live only in the container-ephemeral `/run/orca/` directory and are cleared at every start.
- The tool-state volumes hold tool-managed authentication state (login sessions) and are backup-sensitive the same way.
- Operator-injected credentials (`credentials/`) are **not** part of any volume and are never backed up; deleting them and recreating the container revokes them.
- Restore: stop the stack, copy the backed-up content back into the volumes (same `docker run --rm -v ...` pattern in reverse), then start. A protected `orca-state` restore uses the same decrypted content; after restoring device keys, re-verify pairing from a paired client before relying on it.

## Credentials contract

Claude Code and OpenCode authentication is **operator-supplied runtime material** — injected through read-only secret mounts, never baked into the image, never persisted into volumes or backups, and revocable.

### Secret files

Create `KEY=VALUE` files (one per line) under `docker/orca/credentials/` (the directory is git-ignored):

- `credentials/claude.env` — Claude Code allowlisted keys: `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`, and `CLAUDE_CODE_OAUTH_TOKEN` (the token generated by `claude setup-token`) when supported by the pinned version. **At most one** of the three may be present (mutual exclusion — a conflict fails loudly).
- `credentials/opencode.env` — OpenCode allowlisted keys: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `OPENROUTER_API_KEY` (the implementation-time validated set for the pinned `opencode-ai` version). Multiple provider keys are allowed.

The parser is strict by design: no shell expansion or evaluation; keys must match `^[A-Z][A-Z0-9_]*$`; duplicate keys, keys belonging to the other CLI, unknown keys, and all process-control variables (`PATH`, `LD_PRELOAD`, `LD_LIBRARY_PATH`, `NODE_OPTIONS`, `BASH_ENV`, ...) fail loading with a clear error; values containing newlines or control characters are rejected. Nothing is ever written or copied — credentials load on demand per invocation.

### Secure host preparation (never world-readable)

Docker Compose `file:` secrets are bind-mounted, so host ownership and permissions are retained; the contract is **readability by the service user (uid 1000)**. In preference order:

1. Host file owned by the uid mapped to 1000 in the container, mode `0600`.
2. Group/ACL-scoped readability, mode `0640` with a narrowly scoped group that includes the container's effective uid.
3. Where the host platform (e.g. Docker Desktop) cannot preserve an acceptable uid mapping, use a genuinely different channel: **interactive CLI login** (`claude login` / `opencode auth login`) inside the neutral `agent-shell.sh` — its tool-managed state persists in the tool volumes and is backup-sensitive.

The entrypoint validates at startup that each present file is readable by the service user, failing with an actionable message naming the file and the required preparation. Never make secret files world-readable.

### Opt-in overlays

Injection is opt-in through three committed overlay files (the base stack runs with zero credential files and stays healthy):

```bash
# Combined — both providers
docker compose -f compose.yaml -f compose.credentials.yaml up -d
# Claude-only
docker compose -f compose.yaml -f compose.credentials-claude.yaml up -d
# OpenCode-only
docker compose -f compose.yaml -f compose.credentials-opencode.yaml up -d
```

Each overlay maps its own `./credentials/<provider>.env` read-only to `/opt/state/credentials/<provider>.env` and never references the other provider's source, so an absent file never breaks Compose.

### Per-CLI launchers

`/usr/local/bin/claude` and `/usr/local/bin/opencode` are launcher scripts installed by the build. Every invocation through these public command names — including agents launched by Orca — passes through the launcher, which loads only its own secret file (when present), applies its own state relocation, and `exec`s the real CLI (installed privately at `/opt/agent-cli/node_modules/.bin/`, which is **not** on `PATH`). When the file is absent, the launcher execs without loading — authentication is optional per tool.

`agent-shell.sh` opens a **neutral** shell that exports no credentials and no relocation variables. Use it for interactive work and interactive CLI login:

```bash
docker compose exec orca /opt/orca/scripts/agent-shell.sh              # neutral shell
docker compose exec orca /opt/orca/scripts/agent-shell.sh -- claude --version
docker compose exec orca /opt/orca/scripts/agent-shell.sh -- claude login
docker compose exec orca /opt/orca/scripts/agent-shell.sh -- opencode auth login
```

### Test-mode invariant

`ORCA_SERVE_BIN`, `ORCA_XVFB_BIN`, and `ORCA_CONSUMER_BIN` are **harness-only** test hooks: they take effect only under `ORCA_TEST_MODE=1`, production startup rejects a non-default hook with a clear message, and the committed Compose files never set them.

### Revocation (exact order)

Removing an injected credential never touches Orca profile or tool state. Because an overlay that still declares a removed source fails Compose parsing, follow this exact transition:

1. Stop and remove the overlay-created container **while the source files still exist**: `docker compose -f compose.yaml -f compose.credentials.yaml down` (or the matching overlay).
2. Verify the old container no longer runs: `docker compose -f compose.yaml -f compose.credentials.yaml ps -q` returns empty.
3. Delete the host secret files (or their content).
4. Recreate from the base stack alone: `docker compose up -d`.

Tool-managed login sessions (if you also want those revoked) are revoked through the tool's own logout command.

## Pairing — Orca generates secrets at runtime

Orca generates its pairing offer and device credential **at runtime** — pairing material is never a startup input. Readiness and pairing are two views of one record: the `orca_server_ready` JSON record the server emits, consumed by the Node.js consumer.

Retrieve the complete offer through the protected runtime file:

```bash
docker compose exec orca /opt/orca/scripts/get-pairing.sh
```

- The offer (`/run/orca/pairing.json`) is owner-only and container-ephemeral: it is cleared at every start and never enters volumes or backups. The retrieval command is the documented channel; normal `docker compose logs` contain only sanitized status and non-secret reasons.
- When pairing is unavailable, the retrieval command prints a sanitized unavailable status and the logs expose the documented non-secret reason and guidance.
- Pair with a client (Orca desktop or web client) by pasting the offer URL (`orca://pair?code=...`). Each paired client gets its own revocable grant; already-paired clients keep their grants when a new link is generated. Persistent paired-device registrations and device keys live in `orca-state`, so an upgrade does not require re-pairing.
- **Pairing URLs, device credentials, OAuth tokens, API keys, and SSH keys must be protected** — the offer grants access to the runtime. Configure a trusted pairing address or a secured WebSocket-capable proxy for remote clients, and expose the Orca port only through a trusted network, VPN, or secured proxy.

## Upgrades and rollback

1. **Back up state first** — including the **protected backup of `orca-state`** (persistent paired-device material: encryption, access control, restore guidance) and the backup-sensitive tool-state volumes. Ephemeral offers are never backed up.
2. Select a new explicit release tag and pins: edit `ORCA_VERSION`/`ORCA_SHA256` in `checksums.env` (and/or exact CLI versions in `package.json` + regenerate the lockfile with `npm install --package-lock-only --ignore-scripts`).
3. Rebuild: `docker compose build` (or `docker compose up -d --build`).
4. Recreate the service **while retaining volumes**: `docker compose up -d` (never `down -v`).
5. Verify readiness: `docker compose ps` shows healthy; `docker compose exec orca /opt/orca/scripts/get-pairing.sh` returns a fresh offer; a paired client reconnects without re-pairing.

Re-validate after an upgrade: the build log must show the checksum-verification line completing and the architecture match passing; `/opt/orca/VERSION` must equal the new pin. **Rollback**: rebuild with the prior pins and recreate while retaining volumes; volumes are untouched by recreation, and the `orca-state` profile backup covers state-level rollback.

## Resource and network expectations

- The image is **large** (a full Electron runtime plus two agent CLIs). Expect several GB of disk.
- Rendering is software-based (Xvfb + `LIBGL_ALWAYS_SOFTWARE=1`): it is slower than a GPU-backed desktop, and sizing depends on concurrent agent and browser workloads.
- The Orca WebSocket endpoint must be exposed **only** through a trusted network, VPN, or appropriately secured WebSocket proxy. The safe default keeps publication on `127.0.0.1`; exposing it publicly without protection is unsupported.
- The container runs no Docker daemon, mounts no host Docker socket, and requires no privileged mode.

## Future: external Docker execution (`DOCKER_HOST`)

This environment runs **no child containers**. A future opt-in can point the agent tools at a separately managed rootless or remote Docker daemon via `DOCKER_HOST` — with the trust and network implications that entails — without mounting the host Docker socket, without privileged mode, and without changing `/workspace` or the state layout.

## Test harness

```bash
# Host mode — parser, consumer, and static script checks (Step 1 verification; needs bash + node, no image)
bash docker/orca/tests/run-tests.sh

# Docker mode — all executable assertions against the built image (Step 2 post-build verification)
bash docker/orca/tests/run-tests.sh --docker
```

The harness verifies the credential parser, the JSON consumer contract (including secret redaction), the launcher/public-path/neutral-shell behavior, and the full runtime-supervision lifecycle (consumer-first, Xvfb-first, server-zero, the SIGTERM race, non-draining consumer, process identities) using a fake Orca producer under the test-mode-gated hooks.
