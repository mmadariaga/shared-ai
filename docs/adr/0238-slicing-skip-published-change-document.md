# ADR 0238: The slicing assessment is skipped only for a re-imported published change document

## Status

Accepted.

## Context

A published change document was already sliced by the exploration that produced it. A hand-written mature issue was not, so it may still be too large for one reviewable change.

## Decision

The slicing assessment is skipped only when the intake reading returns `change.name`; a hand-written mature issue keeps it.

## Alternatives Considered

- **Skipping slicing for every mature issue.** Rejected because a hand-written mature issue may not fit one change.
- **Always running it.** Rejected because it repeats work the origin exploration already did and can re-cut a document that is already single-change.

## Consequences

- A re-crystallized document keeps its single-change shape.
- A hand-written mature issue still pays the assessment.

## Provenance

Change `explore-issue-fast-path`, decision "The slicing assessment is skipped only for a re-imported published change document".
