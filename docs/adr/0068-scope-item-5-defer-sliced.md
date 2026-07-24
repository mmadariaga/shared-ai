# ADR 0068: Scope provenance to item-5 single-change block; defer item-6 sliced blocks

## Status

Accepted

## Context

The `Ready to Propose` block has two crystallization shapes: a single-change 9-field block (item 5) and a per-slice 5-field block set (item 6). Provenance grounds the whole feature's Why/Decisions, not one slice's outcome.

## Decision

Attach provenance citations only to the item-5 single-change block. Item-6 per-slice blocks keep their fixed 5-field (+`Depends on:`) format unchanged.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Scope to item 5 only (chosen) | Keeps per-slice format stable; avoids repeating the same citations across slices or fragmenting them incorrectly | Sliced changes, where lineage arguably matters most, do not yet carry provenance |

## Consequences

- Extending provenance to sliced changes is a legitimate follow-up, not part of this change.
- The same rationale already keeps the four decision-facet sections out of the per-slice format.

## Related

- `openspec/changes/explore-handoff-evidence-provenance/design.md` — Decision D3
- `openspec/changes/explore-handoff-evidence-provenance/specs/explore-crystallization-block/spec.md`
- `sai/instructions/explore.md` — item 6
