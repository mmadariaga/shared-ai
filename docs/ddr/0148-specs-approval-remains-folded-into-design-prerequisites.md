# DDR 0148: Specs approval remains folded into design prerequisite resolution

## Status

Accepted

## Context

The design phase already gates its work on approval of the generated specs. Introducing a standalone `specs-approval` progress step would make the panel appear to have entered research while the user is still deciding, and would alter an established approval state machine for a label-only progress-plan change.

## Decision

Keep the specs approval gate inside the design plan's `prereqs-resolution` step, relabel that step `Check prerequisites`, and introduce no standalone approval step. The step remains `in_progress` while the approval answer is pending; only after approval does the worker proceed to research and the later design artifacts. Approval mechanics and persisted approval metadata remain unchanged.

## Alternatives Considered

- **Add a dedicated `specs-approval` progress step** — rejected: it would change the approved plan shape and falsely imply that research has begun while the gate is open.
- **Move approval into the research step** — rejected: it would blur the prerequisite boundary and change the existing approval semantics.

## Consequences

The design panel continues to communicate that prerequisite resolution is active until the user approves the specs, while the visible label becomes imperative and user-facing. The plan remains seven steps with stable ids, and the approval metadata contract does not change. This is a durable property of the design workflow's gate and rendered state, so it is recorded as a DDR.

## Provenance

User — the decision and its alternatives were settled in Decision 3 of `openspec/changes/progress-plan-step-legibility/design.md`.
