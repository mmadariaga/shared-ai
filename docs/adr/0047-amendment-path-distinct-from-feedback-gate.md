# ADR 0047: Keep the amendment path distinct from the artifact-feedback-gate

## Status

Accepted

## Context

Two mechanisms that both involve user interaction during sai-2-design could be confused or merged: the amendment path (fixing specs discovered during design) and the artifact-feedback-gate (reviewing generated design artifacts). Merging them would blur contradictory scopes.

## Decision

Keep the amendment path as its own mechanism inside `sai/instructions/design.md`, separate from `sai/instructions/artifact-feedback-gate.md`. The feedback gate remains feedback-only, MUST NOT write `.openspec.yaml`, and its edit scope is fixed to `design.md`, `tasks.md`, `interfaces.md`. The amendment path writes `.openspec.yaml` and targets `proposal.md`/`specs/**`.

## Alternatives Considered

- **Extend the feedback gate to cover proposal/specs**. Rejected: the feedback gate is explicitly feedback-only and `.openspec.yaml`-free; the amendment path has the opposite contract. Merging them would blur two contradictory scopes.

## Consequences

- Clear separation of concerns: feedback gate = artifact review; amendment path = spec correction.
- No risk of the feedback gate accidentally mutating approved specs or writing audit entries.
- Two separate instruction files to maintain, but each has a single, unambiguous responsibility.

## Related

- `openspec/changes/add-sai-2-in-place-amendment/design.md` — Decision D4
- `openspec/changes/add-sai-2-in-place-amendment/specs/design-phase-in-place-amendment/spec.md` — amendment requirements
- `sai/instructions/artifact-feedback-gate.md` — feedback-only gate (deliberately unchanged)
