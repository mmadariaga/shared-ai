# ADR 0182: CLI-based state machine with single-writer invariant

## Status

Accepted

## Context

The sidecar process model served per-session state ownership with one write-owning process per explore chat session (ADR 0176). The HTTP transport over loopback (ADR 0177, 0180) was necessary for context-compaction rediscovery, but in practice every sidecar self-terminates on stdin EOF when the shell invocation closes (bin/sai-state.js:507-513). This makes the transport a one-off per shell turn with no cross-turn reuse — the `reused: true` path in ADR 0176 never fires. The HTTP layer serves only the calling shell and provides a silent failure mode when transport fails.

The single-writer invariant remains valid: a fresh session per invocation plus coordinator-only emission already makes concurrent writers impossible (sai/commands/spec/coordinator.md:41), so the process lifetime constraint is not what enforces ownership — the invocation discipline does.

## Decision

Replace the ephemeral HTTP sidecar with a three-verb local CLI (`spawn`, `emit`, `close`) that reads and writes the same durable session files directly. The state store is no longer a live process; it is a durable store accessed through local command invocation:

- `spawn --key <stable-key>` derives a well-formed UUIDv4 from the harness session key, initializes or locates an existing session in a durable store under `$TMPDIR/sai-state/<id>.json`, and returns `{id}`.
- `emit <id> <machineId> <eventJson>` applies the named transition to the stored session state and returns the minimal wire outcome `{stage, next, rejected?, warnings?}`.
- `close <id>` deletes the session file to prevent reuse.

The durable store owns the stage table, pointer routing, transition rules, and progression state itself. Each machine's state persists in its own session file across invocations, reloading automatically on each emit, so every stage-event turn runs the same minimal cycle — spawn (reuse-or-fresh), then emit.

The coordinator invokes these commands directly from the shell in the same process, eliminating the transport, liveness polling, and rediscovery overhead. The single-writer invariant holds by construction: each coordinator emits serially and never concurrently.

## Alternatives Considered

- **Detached daemon surviving across turns** — rejected: it contradicts ADR 0176's implicit one-per-invocation model and keeps the HTTP layer that buys nothing.
- **Documenting the current invocation discipline instead of removing it** — rejected: it makes coordinators memorize `sleep 15 | node ... &` to update a state machine, teaching an anti-pattern as a feature.
- **Bash wrappers around the CLI** — rejected: the CLI is simple enough to call directly from Node.js; shell wrappers add a subprocess overhead and obscure the three-verb contract.

## Consequences

- No process management, liveness polling, or token files to maintain.
- Idempotency narrows to the last event per machine, since the in-memory `seen` map disappears with the process. This is acceptable because a single coordinator emits serially (E1).
- The session file format stays compatible with prior rediscovery paths: the session record carries `createdAt`, `stateVersion`, and `stateByMachine` as before.
- Closed errors travel in an always-present JSON `error` field; exit codes are a coarse secondary signal (0 ok, 1 machine or event error, 2 usage or IO) (E2).
- ADR 0177 and 0180 are retired; ADR 0176 is superseded as mechanism while its single-writer invariant persists.

## Related

- Change `replace-state-sidecar-with-cli` — the complete migration replacing three ADRs with one
- ADR 0176 — the per-session ownership model whose mechanism this replaces but whose single-writer invariant this preserves
- ADR 0177 — loopback ephemeral token file transport (superseded by this)
- ADR 0180 — liveness and close sequencing (superseded by this)
