# ADR 0158: Single shared crystallization-turn close definition consumed by items 5, 6, and 7

<!-- adr-index: refs 0146 -->

## Status

Accepted

## Context

The crystallization-turn close was restated across items 5, 6, and 7 of `sai/commands/explore/instructions.md`, while item 10 separately described the `Manual` branch in language that read as if it re-emitted the keep-window recommendation. That split left emission count and position ambiguous even though the intended product behavior is already a single recommendation-before-selector close (ADR 0146).

## Decision

Introduce one authoritative crystallization-turn close subsection in `sai/commands/explore/instructions.md` **immediately above the existing item-5 single-change handoff section**. Items 5, 6, and 7 emit their handoff block(s) and existing next-step wording, then invoke that shared close. Item 10 remains the selector/Auto lifecycle owner but describes `Manual`/unmapped by reference to the shared close rather than restating a second recommendation emission. Item 9 keeps review/`review-loop` separation and must not restate a competing close sequence.

## Alternatives Considered

- **Keep per-item restatements and only patch item 10 Manual wording** — rejected: duplication remains the source of ambiguity.
- **Extract close text into a separate policy file** — rejected: sole edit target for this capability is the explore instruction surface; cross-file indirection is out of scope for this slice.

## Consequences

- Emission count and order become unambiguous: one keep-window recommendation naming `review-loop` exactly once, then one Auto/Manual selector as the final crystallization-turn emission.
- `Manual` and unmapped answers refer to the already-emitted recommendation without a second recommendation or selector.
- Future close wording changes land in one place instead of three item bodies plus item 10.

## Provenance

User — `openspec/changes/single-source-crystallization-close/design.md`, Decision 1.
