# ADR 0168c: Architecture Snapshot uses nested boundary blocks

## Status

Accepted

## Context

`design.md` presents Architecture Snapshot as one undifferentiated inventory. Reviewers cannot put uncontrolled-caller promises first. Expanding Target State with additional `###` siblings would break the exact two-subsection Target State contract and overview structure checks.

## Decision

Keep `### Architecture Snapshot` as the stable Target State anchor. Place `#### External Surfaces` and `#### Internal Public Surfaces` as nested content only, never as additional `###` siblings beside File Manifest.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Nested `####` blocks inside Architecture Snapshot (chosen) | Minimal structural churn; preserves existing anchors | Authors must learn nested inventory rules |
| New `###` siblings under Target State | Flatter heading tree | Breaks exact two-subsection Target State contract |
| Separate top-level Architecture section outside Target State | Isolates architecture | Severs finished-shape snapshot unity |

## Consequences

- Live design instructions and `design-target-state` require external-first then internal-second nested blocks when any surface is planned.
- Nested blocks do not count as a third `###` Target State sibling.
- Contract tests assert nested heading order without rewriting the Target State skeleton.

## Provenance

derived — `openspec/changes/split-architecture-snapshot-by-boundary/design.md`, Decision D1.
