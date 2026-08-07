# ADR 0111: design.md records the resolved record family as a pinned marker that Step 3 reads

## Status

Accepted

## Context

The ordered routing test (DDR 0106) resolves a qualifying decision's record family deterministically, but nothing recorded the resolution: `sai-3-implement` Step 3 would re-run the test on every implementation run, and a design whose decisions were evaluated under one model's reading could be recorded under another. Two independent design runs needed to emit the same parseable token.

## Decision

Every Decision in `design.md`'s `## Decisions` section that meets all three ADR/DDR criteria carries the pinned sub-field `**Record family**: adr|ddr`, resolved by the ordered routing test; the label is pinned byte-exact so two independent design runs emit the same parseable token. `sai-3-implement` Step 3 reads the marker for a qualifying decision and never re-decides the family when one is present; when the marker is absent (the design predates the requirement, or the decision surfaced only at implementation time), Step 3 applies the ordered routing test itself.

## Alternatives Considered

- **Re-decide the family at Step 3** — rejected: simpler artifacts, but model drift between design and implementation could re-resolve the family differently for the same decision.
- **A free-form family note** — rejected: unparseable; the marker must be byte-exact so two independent runs emit the same token.

## Consequences

The marker becomes part of the design artifact contract; removing it later touches every instruction surface and invalidates the Step 3 read path. This is a workflow-mechanism choice (how the pipeline records the family), not a domain invariant, which is why this record is an ADR.

## Provenance

Derived — the marker mechanism was derived from the determinism goal (record the family once at design time rather than re-deciding at Step 3); the proposal records it, the user did not state it.
