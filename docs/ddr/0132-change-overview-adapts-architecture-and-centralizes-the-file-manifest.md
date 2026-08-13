# DDR 0132: Change Overview adapts architecture and centralizes the File Manifest

## Status

Accepted

## Context

`design.md` remains the authoritative detailed finished-shape record, including its Architecture Snapshot and File Manifest. The approval projection needs to make architecture review easier without creating a second authoritative Target State or repeating the manifest in multiple overview sections.

## Decision

Render an adapted `## Target Architecture` section, retaining source ASCII notation under a fixed `### Snapshot` subsection when present. Render the folded File Manifest only under the single top-level `## File Manifest` section, with related interface signatures beside surviving file entries. Validate the deterministic tasks fold against the persisted design manifest before writing.

## Alternatives Considered

- **Project `design.md` verbatim** — rejected: verbatim projection is less focused for approval review.
- **Repeat the manifest beneath architecture** — rejected: duplicate approval surfaces could diverge.

## Consequences

The design Target State remains authoritative while the overview is a review adaptation. Manifest contradiction checks and signature placement remain load-bearing validation rules. This is a DDR because a derived approval projection must preserve one authoritative architecture and manifest relationship.

## Provenance

User — the design records architecture adaptation and single-location manifest rendering as a qualifying DDR decision.
