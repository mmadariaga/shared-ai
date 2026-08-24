# ADR 0172: Sibling worker dispatch for the fast lane

<!-- adr-index: refs ddr:0157; refs ddr:0145b -->

## Status

Accepted

## Context

The fast lane chains four delegated phases — implement, backfill, archive pre-flight, hands mutations. Two topologies were possible: one long-lived mega-subagent that performs or orchestrates everything internally, or sibling workers dispatched and sequenced by the coordinating session.

Nesting pushes delegation depth past two, where an un-pre-approved permission prompt cannot render and hangs the session on opencode (anomalyco/opencode#13715). Nesting also forces interview `needs_input` payloads to bubble through an intermediate worker, corrupting the opaque input history and the verbatim-forwarding contracts.

## Decision

1. Every fast-lane phase is a sibling dispatch from the coordinating session; no worker nests another phase's execution inside itself.
2. The only nested delegation permitted is one already proven at its current depth in standalone operation: the backfill worker's read-only `budget-explorer` conflict scan at depth 2.
3. The coordinator sequences siblings, resolves their gates, and owns the changed-files union across segments, mirroring how the supervised pipeline chains spec → design.

## Alternatives Considered

- One mega-agent implementing, reconstructing, archiving, and committing — rejected for the depth-3 hang risk, double-hopped asks, and context contamination across phases with different lifecycles.
- Merging hands into the implementer via task continuation — rejected because it couples cheap judgment-free mutations to an expensive implementation context held long after its useful life.

## Consequences

- Each segment keeps its existing card byte-intact and fails independently under Bounded Recovery.
- Coordinator-side sequencing logic is slightly more explicit than a single dispatch would be.
- Depth stays within every surface's demonstrated envelope; no new permission-scope territory is opened.

## Related

- `docs/ddr/0157-fast-lane-validation-and-mutation-stay-in-separate-actors.md`
- `docs/ddr/0143b-budget-explorer-out-of-root-access-is-purpose-bound.md`
