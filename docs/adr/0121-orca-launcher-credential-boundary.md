# ADR 0121: Per-CLI launchers with a strict allowlist credential parser

## Status

Accepted

## Context

The Orca Environment must authenticate Claude Code and OpenCode through operator-injected runtime material without baking secrets into the image, persisting them into backed-up state, or exporting them process-wide. Agent CLIs are installed via `npm ci --prefix /opt/agent-cli` from a committed lockfile with the real bins private and not on `PATH`. Every invocation through the normal command names — including agents launched by Orca — must pass through the credential channel, and injection must be revocable without touching Orca profile or tool state.

## Decision

The public command paths `/usr/local/bin/claude` and `/usr/local/bin/opencode` are root-owned launcher scripts installed at build time that reference the private npm bins (`/opt/agent-cli/node_modules/.bin/{claude,opencode}`) by absolute path; the private prefix is never on the image-level `PATH`. Each launcher sources the shared strict parser (`/opt/orca/scripts/load-credentials.sh`), loads only its own current secret file (`claude.env` / `opencode.env` mounted read-only at `/opt/state/credentials/`), exports the allowlisted variables into its own environment, applies its own state relocation (`CLAUDE_CONFIG_DIR=/opt/state/claude`; `XDG_CONFIG_HOME`/`XDG_DATA_HOME`/`XDG_CACHE_HOME` under `/opt/state/opencode`), and `exec`s the private bin with all arguments passed through; when the file is absent, the launcher execs without loading. The parser reads `KEY=VALUE` lines without shell expansion or evaluation, requires keys to match `^[A-Z][A-Z0-9_]*$`, enforces the per-CLI allowlist (rejecting duplicate keys, cross-CLI keys, and process-control variables such as `PATH`, `LD_PRELOAD`, `LD_LIBRARY_PATH`, `NODE_OPTIONS`, `BASH_ENV`), enforces mutual exclusion for the Claude authentication group (`ANTHROPIC_API_KEY` / `ANTHROPIC_AUTH_TOKEN` / `CLAUDE_CODE_OAUTH_TOKEN` — at most one), rejects values containing newlines or control characters, and writes nothing. Injection is opt-in through three committed Compose overlays (`compose.credentials.yaml`, `compose.credentials-claude.yaml`, `compose.credentials-opencode.yaml`); the base stack runs with zero credential files. A neutral interactive shell (`agent-shell.sh`) exports no credentials and no relocation variables and dispatches `-- claude` / `-- opencode` to the launchers. Revocation follows the exact documented transition: stop/remove the overlay-created container while the source files still exist, verify no credential-bearing container remains, delete the host secret files, recreate from the base stack alone. The test-only overrides take effect only under `ORCA_TEST_MODE=1`, and production startup rejects them.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Per-CLI launchers + strict allowlist parser (chosen) | The primary runtime path (Orca-launched agents, ordinary shells, single commands) is authenticated without persisting or globally exporting anything; hostile or typoed secret files fail loudly | Launcher/PATH/allowlist architecture pervades the credential flow |
| Baking keys into the image | Simple | Spec forbids it |
| Writing an exported copy into `orca-state` for shell sourcing | Convenient | Persists secrets into a backed-up persistent boundary; breaks rotation/revocation; shell-quoting hazards |
| Interactive login as the only channel | No secret files | Not automatable; state must persist per tool volume |
| A wrapper users must remember to call | Minimal surface | Orca-launched agents and plain command invocations bypass it — the primary runtime path stays unauthenticated |
| Exporting credentials and relocations into the interactive shell | Simple | Unrelated commands and Orca/Electron processes inherit OpenCode's `XDG_*` values and write into `opencode-state`; loading both files creates an ambiguous shared environment |
| Declaring secrets in the base Compose service | Fewer files | Compose fails before container creation when a declared source file is absent; per-provider startup must be reproducible from committed configuration |
| Deleting sources before `docker compose down` during revocation | Intuitive | `down` also parses the Compose files, so a removed source can block the transition |
| Mounting the whole host `~/.config` | Convenient | Breaks the isolation boundary |
| World-readable host secret files | Solves container readability | Weakens host confidentiality — never recommended |

## Consequences

- Injected credentials are revocable by removal and recreation, never persisted, and separate from tool-generated auth state (which persists in the `claude-state`/`opencode-state` volumes and is backup-sensitive).
- Every invocation through the public command names receives the runtime credentials — there is no bypass path.
- The neutral shell and per-launcher relocations keep Orca's environment and unrelated commands free of tool-state variables and ambiguous credentials.
- The base stack starts and stays healthy with zero credential files; provider variants are reproducible from committed overlays.

## Provenance

User — the design records it as Decision 11 with the `adr` family marker; all three ADR/DDR criteria are evaluated and hold in `design.md`.

## Related

- `openspec/changes/add-orca-agent-container/` — proposal, design (D11), and the six capability deltas.
- `docs/adr/0119-orca-environment-independent-state-volumes.md` — the state boundaries this credential channel never touches.
- `docs/adr/0120-orca-headless-runtime-supervision.md` — the test-mode invariant shared by the runtime hooks.
