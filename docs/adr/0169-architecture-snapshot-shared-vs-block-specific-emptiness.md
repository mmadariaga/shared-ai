# ADR 0169: Architecture Snapshot shared vs block-specific emptiness

## Status

Accepted

## Context

An empty Architecture Snapshot and a one-sided empty boundary are different review signals. Collapsing both into one sentence hides whether external or internal inventory is missing. The File Manifest already has its own independent empty sentinel and must not be coupled to snapshot emptiness.

## Decision

When both boundaries are empty, emit only `None — no planned public surfaces` plus one reason line and no nested headings. When exactly one boundary is empty, still emit both nested headings and use the matching block-specific empty sentence (`None — no planned externally consumable surfaces` or `None — no planned internal public surfaces`). Never substitute the shared sentence for a block-specific one. Keep the File Manifest sentinel fully independent.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Shared whole-inventory sentence plus distinct one-empty-block renderings (chosen) | Preserves review signal and File Manifest independence | Three emptiness forms to author and test |
| One empty sentence for every empty case | Simpler authoring | Hides which boundary is empty |
| Couple snapshot emptiness to File Manifest sentinel | Fewer independent None forms | Suppresses manifest when surfaces are absent |

## Consequences

- Design instructions and specs encode three emptiness forms with explicit non-substitution rules.
- Docs-only changes may show snapshot shared None while still listing a full File Manifest.
- Overview projection omits the whole-inventory public-surface None and retains block-specific empty sentinels under nested headings.

## Provenance

derived — `openspec/changes/split-architecture-snapshot-by-boundary/design.md`, Decision D3.
