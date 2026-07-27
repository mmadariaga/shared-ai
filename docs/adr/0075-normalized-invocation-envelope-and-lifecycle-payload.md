# ADR 0075: Normalize coordinator-worker exchange around an invocation envelope and lifecycle payload

<!-- adr-index: pair-with 0076 -->

## Status

Accepted

## Context

The implementation coordinator must delegate all technical work without resolving change names, reading OpenSpec artifacts, or transporting the generated plan. Opencode can provide a wrapper-echo value while the raw command arguments remain a separate and potentially conflicting input. Interactive planning can also stop for input, fail, cancel cleanly, or complete after one or more worker turns.

An unstructured response would make result handling ambiguous and could accidentally move artifact content or harness session identifiers into the shared worker protocol.

## Decision

Dispatch exactly two input fields: `wrapper_echo_value` and `arguments_value`. The worker preserves wrapper-echo precedence and returns a payload with exactly one status from `completed`, `needs_input`, `failed`, or `cancelled`, a concise summary, and `changed_files`. A closed-choice `needs_input` payload also carries its question and ordered options.

Harness bindings, not the worker, attach the dispatch identifier as `continuation_reference`. The coordinator maintains an invocation-scoped ordered union of every payload's `changed_files` and reports that aggregate at the terminal outcome. `implementation.md` remains on disk and is never included in the payload.

## Alternatives Considered

- **Resolve the change in the coordinator** - simplifies worker input, but violates coordinator I/O isolation and moves existing picker behavior to the wrong owner.
- **Pass parent conversation history** - preserves incidental context, but creates context pollution and an unstable protocol.
- **Return the implementation artifact in the response** - avoids a disk verification step, but duplicates the durable source of truth and creates a large transport channel.
- **Use a two-field envelope and status-discriminated payload** (chosen) - keeps ownership and terminal handling explicit with the minimum shared surface.

## Consequences

- Coordinator and binding tests must validate every status and reject malformed payloads.
- Continuation metadata remains harness-owned and cannot be persisted in OpenSpec artifacts.
- Changed-file reporting survives continuation and fallback without coordinator git or artifact reads.

## Related

- `openspec/changes/introduce-implement-coordinator-worker/design.md` - Decision D3
- `openspec/changes/introduce-implement-coordinator-worker/interfaces.md` - `InvocationEnvelope`, `WorkerPayload`, and `BoundWorkerResult`
- `docs/adr/0076-resume-worker-before-durable-reconstruction.md` - paired recovery decision
