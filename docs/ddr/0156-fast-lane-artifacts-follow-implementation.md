# DDR 0156: Fast-lane artifacts follow implementation

<!-- ddr-index: refs adr:0172, refs ddr:0158 -->

## Status

Accepted

## Context

The Auto (fast implementation) selector option produces working code from a crystallized block without generating `proposal.md`, specs, `design.md`, or `tasks.md` first. The ordinary pipeline treats forward-generated artifacts as a precondition of implementation; the fast lane inverts that order and reconstructs them afterwards through the existing `sai-backfill` flow over the staged diff.

## Decision

1. In the fast lane, implementation precedes artifacts: the implementer worker receives only the crystallized block, and every workflow artifact is reconstructed retroactively from diff evidence plus the run's grounded intent.
2. Reconstruction uses the existing backfill machinery unchanged — staged-diff source, fixed interview, conflict scan, schema validation — never a bespoke artifact generator.
3. Retroactive artifacts carry the standard POST-HOC RECORD provenance and validate against the same sai-workflow schema as forward-generated ones, so downstream surfaces (`archive` delta-sync, review engines) cannot distinguish their origin.

## Alternatives Considered

- Forward-generate minimal specs before implementing — rejected because it reintroduces the ceremony the fast lane exists to remove.
- Skip artifacts entirely — rejected because archive, review, and future orientation depend on their existence.
- A bespoke reconstruction writer inside the implementer — rejected because it duplicates backfill's interview, reconciliation, and validation discipline.

## Consequences

- Spec findings discovered after implementation may require code changes rather than pure artifact edits; the fix-loop budget governs that loop.
- The staged diff is the single source of reconstruction evidence, making the stage-before-backfill ordering load-bearing.
- Artifact quality is bounded by diff expressiveness; intent grounding mitigates but cannot eliminate the gap.

## Related

- `docs/ddr/0158-autofast-implementer-receives-only-the-block.md`
- `docs/adr/0172-sibling-worker-dispatch-for-the-fast-lane.md`
