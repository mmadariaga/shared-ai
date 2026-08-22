# ADR 0140a: Supervised rounds invoke the Review Engine in-session

## Status

Accepted

## Context

The supervised pipeline currently creates a fresh isolated reviewer around review work that already exists in the Review Engine. That extra boundary spends context rediscovering the repository, creates reviewer-specific lifecycle outcomes, and prevents the active explore coordinator from using its accumulated understanding.

## Decision

For every supervised spec or design review round, the active explore coordinator invokes the Review Engine directly with the authoritative change name and the phase-selected `sai-1` or `sai-2` artifact-set designator. The supervised path presents no artifact picker and dispatches no reviewer subagent; findings continue to the owning phase worker for disposition and edits.

## Alternatives Considered

- **Keep a fresh isolated reviewer per round** — rejected because it retains duplicate orientation cost and reviewer-only failure handling.
- **Keep one persistent reviewer** — rejected because it still preserves an unnecessary second context boundary and separate lifecycle surface.
- **Let explore edit artifacts directly** — rejected because it would split artifact ownership from the phase worker.

## Consequences

- The same explore session both coordinates and reviews supervised rounds, so cross-round anchoring is possible.
- Every round mitigates anchoring by using the Review Engine's fresh disk reread.
- Reviewer result variants, bindings, and install projections are absent from the supervised path.
- Manual Review Loop Navigation and worker-owned Phase Review Passes remain unchanged.

## Provenance

User — `openspec/changes/supervised-in-situ-review/design.md` records the choice and all three ADR/DDR qualification criteria.

## Related

- `openspec/changes/supervised-in-situ-review/specs/supervised-review-in-session/spec.md`
- `openspec/changes/supervised-in-situ-review/specs/review-engine-extraction/spec.md`
- `/sai-explore`

<!-- adr-index: refs ddr:0137b -->
