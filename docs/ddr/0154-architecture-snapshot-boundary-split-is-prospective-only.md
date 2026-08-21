# DDR 0154: Architecture Snapshot boundary split is prospective only

## Status

Accepted

## Context

Splitting Architecture Snapshot by caller boundary improves future design review, but bulk-rewriting every in-flight `design.md` would churn unrelated changes and invent authority the snapshot does not own. Per-step contracts remain in `interfaces.md`.

## Decision

The boundary split applies to future design authoring and to derived rendering of source artifacts generated or regenerated under the updated contract. Existing `openspec/changes/{name}/design.md` documents are not rewritten solely to introduce the two boundary blocks. The Architecture Snapshot remains a derivative review surface and does not replace per-step `interfaces.md` authority.

## Alternatives Considered

- **Bulk-rewrite existing designs** — rejected: unrelated churn and false authority for a review surface.
- **Make the snapshot authoritative for per-step contracts** — rejected: duplicates and conflicts with `interfaces.md`.

## Consequences

- Implementation edits instructions, specs, glossary, overview contract, and tests only.
- In-flight designs remain valid under prospective rules until regenerated.
- This is a DDR because non-rewriting of existing designs and non-authority of the snapshot are domain properties of the design artifact lifecycle.

## Provenance

user — `openspec/changes/split-architecture-snapshot-by-boundary/design.md`, Decision D5.
