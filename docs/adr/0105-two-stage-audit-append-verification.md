# ADR 0105: Two-stage verification for the audit-derived-step append

<!-- adr-index: refs 0021; refs 0087 -->

## Status

Accepted

## Context

`/sai-3-implement` was the only phase whose output was not verified by either
of its two checkpoints: the pre-delivery checklist in
`sai/instructions/implement.md` and the implementation-planning worker's
durable-verification gate in `sai/orchestration/workers/sai-3-implementation-worker.md`.
A worker could return `completed` after skipping the audit-derived-step append
entirely without violating its own contract — observed in a runtime where a
Sai-3 re-run preserved every compacted step correctly but appended no step for
an existing `review.md`, emitted none of the required chat confirmation, and
still completed.

## Decision

Verify the audit-derived-step append in two stages. The pre-delivery
self-check verifies a missing append and repairs it before delivery; the
worker's durable-verification gate is the second stage and the last resort,
failing only if a required append is still missing at completion time. Each
stage cross-references the other by capability so an implementer reads a
single run order, not contradictory directives.

## Alternatives Considered

- Worker gate only: rejected because the gate fires at completion, by which
  time the malformed plan is conceptually delivered; without an in-flight
  repair path the gate can only fail, forcing a re-entry loop instead of a
  self-correcting single run.
- Pre-delivery self-check only: rejected because it relies on the agent's
  self-discipline with no durable guard — an agent that skips the checklist
  completes the run silently, exactly the observed failure class.

## Consequences

Both stages key on what the current invocation appended, not on what
`implementation.md` contains. Two prose sites now govern when `completed` is
reachable; a later single-stage redesign would re-open the observed failure
class. The chat confirmation of the existing "Discarded findings SHALL be
surfaced in chat for conversational confirmation" requirement stays
conversational-only and is deliberately not part of either stage's
verification.

## Provenance

User decision recorded in the `enforce-audit-step-append-verification` design
(Decision 1).

