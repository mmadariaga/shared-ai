# ADR 0087: Implementation phase adapter and durable verification

<!-- adr-index: refs 0083; refs 0086 -->

## Status

Accepted

## Context

The shared coordinator contract now owns lifecycle validation, changed-file aggregation, continuation ordering, and replacement recovery. The routed implementation phase still needs to declare its own envelope, binding operations, reconstruction fields, terminal navigation, and technical planning policy without importing design-only notices or feedback. A lifecycle `completed` result is unsafe unless the worker has also verified the durable `implementation.md` artifact.

## Decision

The routed `/sai-3-implement` path consumes the shared lifecycle through an implementation-only phase adapter. The adapter declares the original two-field envelope, harness binding dispatch and continuation, no nonterminal extensions, exact reconstruction fields, and implementation terminal navigation. The implementation worker owns prerequisites, planning research, authorized artifact writes, and the completion gate that verifies task order, verification markers, RED-before-GREEN ordering, interface conformance, human-check encoding, and the no-execution boundary.

Replacement workers receive only the original envelope and complete reconstruction fields. The coordinator retains its changed-file union separately from the replacement worker's empty journal.

## Alternatives Considered

- **Add implementation branches to the shared coordinator** - centralizes more behavior but couples phase policy to lifecycle mechanics and invites design-only leakage.
- **Trust the worker's completion status without artifact verification** - reduces checks but can emit the mandatory completion message for an incomplete or invalid plan.
- **Forward the prior worker journal or artifact contents** - preserves more transient state but violates the isolation boundary.

## Consequences

- Lifecycle mechanics remain reusable while implementation rules evolve in the worker contract.
- A worker cannot report completion until the durable plan is structurally verified.
- Recovery is bounded by the exact opaque input history and durable artifacts rather than transient context.

## Related

- `docs/adr/0083-shared-coordinator-mechanics-through-phase-adapters.md`
- `docs/adr/0086-worker-journals-and-coordinator-union.md`
