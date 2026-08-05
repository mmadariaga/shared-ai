# ADR 0099: Terminal routing failure and explicit fresh dispatch

<!-- adr-index: refs 0075; refs 0076; refs 0086 -->

## Status

Accepted

## Context

Late-bound routed instructions can identify a harness other than the active one. Resolving, rewriting, or automatically retrying that path risks loading the wrong worker binding, while adding a routing-specific lifecycle status would expand the closed coordinator-worker protocol. Coordinator-owned and worker-owned failures also have different safe recovery boundaries.

## Decision

Refuse a mismatched legacy `bindings/<identity>/` path before lookup or transformation. A coordinator-owned mismatch reports the refused path and active harness, directs the user to a new chat, and offers no in-session retry. A worker-owned mismatch returns the existing terminal `failed` result with the same diagnostic facts and performs no automatic retry.

After a worker-owned terminal failure, an explicit user request may dispatch the original envelope to an ordinary fresh worker in the same session. The fresh worker receives neither the failed worker's journal nor replacement-continuation state, and this user-initiated dispatch does not consume the system-managed replacement budget.

## Alternatives Considered

- **Rewrite the path under the active harness** - appears recoverable but can silently load a binding the caller did not request.
- **Add a routing-specific lifecycle status** - makes the stop explicit but expands every closed lifecycle consumer.
- **Automatically replace the failed worker** - preserves momentum but spends system behavior after a safety stop and can retain polluted routing assumptions.
- **Use terminal `failed` plus explicit fresh dispatch** (chosen) - preserves existing payloads, separates coordinator and worker recovery, and keeps the user in control.

## Consequences

- Cross-harness routed paths fail before any read, lookup, recursion, rewrite, or guess.
- Existing `completed`, `needs_input`, `failed`, and `cancelled` payload shapes remain unchanged.
- Coordinator-owned recovery requires a new chat; worker-owned recovery may remain in-session only after an explicit user request.
- User-initiated re-dispatch is outside replacement-worker accounting and starts with no failed-worker journal.
- The guard remains transitional and can be retired after legacy identity-bearing binding paths are no longer supported.

## Related

- `docs/adr/0075-normalized-invocation-envelope-and-lifecycle-payload.md`
- `docs/adr/0076-resume-worker-before-durable-reconstruction.md`
- `docs/adr/0086-worker-journals-and-coordinator-union.md`
- `openspec/changes/harness-identity-in-shared-instructions/design.md`
