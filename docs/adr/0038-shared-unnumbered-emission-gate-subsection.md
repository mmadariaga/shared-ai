# ADR 0038: Shared unnumbered "Emission gate" subsection at the §4→§5 seam in `explore.md`

## Status

Accepted

## Context

`sai/instructions/explore.md` is a continuous numbered list (§1–§7) whose section numbers are a stable contract cited both inside the file and across OpenSpec specs. The `explore-crystallization-on-demand` change needs to insert a cross-cutting gate that defines (a) the one-line readiness signal, (b) once-per-stable-idea persistence, and (c) the explicit-request trigger, at the boundary where §4 (slicing assessment) hands off to §5/§6 (crystallization protocols).

Because the gate is cross-cutting to both §5 and §6, it must be defined once and referenced by both. However, the file is a numbered list and renumbering would break every intra-file and cross-spec reference to §5, §6, and §7.

## Decision

Insert a single **bold, unnumbered subsection** titled **Emission gate (on-demand crystallization)** between §4 and §5. §5 and §6 reference it by name ("the Emission gate"). The numbered list is left untouched — §5, §6, and §7 keep their original numbers.

## Alternatives Considered

- **Insert a new numbered item (new §5), renumbering §5→§6→§7.** Rejected: breaks existing intra-file cross-references (§5 cites §4; §7 refers to the block) and every external reference to these section numbers, for a much larger diff.
- **Inline the full gate into both §5 and §6 separately.** Rejected: duplicated normative text that will drift; the signal/persistence semantics would then live in two places.
- **Shared unnumbered subsection + back-references** (chosen): preserves numbering (smallest diff, no broken cross-refs), single source of truth for the gate, and sits exactly at the conceptual split point.

## Consequences

- A bold, unnumbered subsection now lives between two numbered list items. Future editors may misread it as part of §4 or drop it accidentally.
- §5 and §6 explicitly reference the gate by name, reducing the risk of misreading.
- No renumbering means zero broken cross-references across specs and instruction files.

## Related

- `openspec/changes/explore-crystallization-on-demand/design.md` — Decision D1
- `openspec/changes/explore-crystallization-on-demand/specs/explore-crystallization-on-demand/spec.md` — capability spec
- `sai/instructions/explore.md` — sole edit target
