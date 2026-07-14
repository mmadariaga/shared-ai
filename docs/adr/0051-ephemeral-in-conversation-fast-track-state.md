# ADR 0051: Model `--fast-track` as ephemeral in-conversation state only

## Status

Accepted

## Context

Fast-track mode needs a signal that gate branches can read, but the spec explicitly excludes new persistent state axes (no env var, no session-chat flag, no `.openspec.yaml` key). The existing `session_commit_authorized` flag in `sai-4-apply` already uses an in-conversation boolean pattern.

## Decision

The fast-track signal is an in-conversation boolean set by the body parse, mirroring the existing `session_commit_authorized` pattern: set when the token is present, read by the `if FAST-TRACK` gate branches, never written to `.openspec.yaml`, config, env, or any file. The printed banner is the human-visible marker; the boolean is the machine-readable one.

## Alternatives Considered

- **Persist a `.openspec.yaml` key** — rejected: violates the "no new state axis" non-goal and creates cross-run leakage that breaks Isolation Mode.
- **Use an environment variable** — rejected: same cross-run leakage problem and harness-specific env handling.

## Consequences

- Isolation Mode compatibility: each invocation starts fresh; no inherited fast-track state from prior chats.
- No rollback or migration complexity — the flag exists only in working memory for the duration of the run.
- Gate branches reference a single canonical signal set by the body parse.

## Related

- `openspec/changes/add-fast-track-flag/design.md` — Decision D4
- `docs/adr/0040-session-auth-in-memory-only.md` — precedent for in-conversation-only state
