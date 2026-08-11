# DDR 0126: Archive only after requirement-level survival review

## Status

Accepted

## Context

The active capability tree can contain retired Copilot behavior alongside rules that still govern the supported pipeline. A filename-pattern move cannot distinguish those cases, and archiving is terminal: once a candidate is historical, it must not remain an implicit source of truth for live behavior.

## Decision

Review every requirement and scenario in each candidate capability spec before archival. A candidate may move to `openspec/specs/_archived/` only after every surviving rule is confirmed in its active canonical home and every remaining requirement is retired-only. The `/sai-3-implement` plan SHALL preserve this review-first boundary rather than replacing it with a filename-pattern move.

The domain invariant is that an archived historical spec cannot be the source of truth for live pipeline behavior. The active canonical home remains authoritative for every surviving rule.

## Alternatives Considered

- **Move candidates by filename pattern** — rejected: names cannot reveal whether a requirement still governs the supported pipeline.
- **Keep mixed live and retired candidates active** — rejected: obsolete contracts remain active and surviving rules can be buried in historical material.
- **Review each requirement and scenario before archival** (chosen) — costs more analysis, but prevents both buried live rules and obsolete active contracts.

## Consequences

The change carries an explicit disposition matrix and confirms named canonical homes before any rename. Retired-only candidates can be archived without copying live authority into the historical tree. A missed surviving rule remains the principal residual risk, so the matrix and pre-move validation are mandatory.

## Provenance

User — the design decision records the requirement-level review boundary and its trade-off against a simpler bulk move.
