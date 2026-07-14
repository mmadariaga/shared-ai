# ADR 0043: Append crystallization language gate as item 8; do not renumber items 1–7 in `explore.md`

## Status

Accepted

## Context

`sai/instructions/explore.md` contains seven numbered items (§1–§7) with dense intra-file numeric cross-references: `(4)`, `§5/§6`, "slice-0 machinery in 6", and item 3's own "item 4 after renumbering" parenthetical. The `explore-crystallization-language-gate` change needs to add a new language gate that fires before any `Ready to Propose` block is printed.

## Decision

Append the new crystallization language gate as **item 8** after the current item 7. Do not renumber items 1–7. The forward reference (gate defined after the block-printing items 5–7) is mitigated by short precondition pointers added to items 5, 6, and 7.

## Alternatives Considered

- **Insert after item 3 and renumber 4→5…7→8.** Rejected: breaks every numeric cross-reference in the file (`(4)`, `§5/§6`, "slice-0 machinery in 6", item 3's own "item 4 after renumbering"). High risk of introducing exactly the kind of inconsistency this change is meant to reduce.
- **Add as an unnumbered named block before item 5** (sibling of the Emission gate). Rejected: the spec frames it as an item mirroring numbered item 3, and a stable number makes it referenceable from items 3/5/6/7.
- **Append as item 8** (chosen): zero renumbering, zero cross-reference breakage. The forward reference is mitigated by precondition pointers.

## Consequences

- The gate is defined after the block-printing items it governs, creating a forward reference.
- Items 5, 6, and 7 require one-line precondition pointers referencing item 8.
- No broken numeric cross-references across specs and instruction files.

## Related

- `openspec/changes/explore-crystallization-language-gate/design.md` — Decision D1
- `openspec/changes/explore-crystallization-language-gate/specs/explore-crystallization-language-gate/spec.md` — capability spec
- `sai/instructions/explore.md` — sole edit target
