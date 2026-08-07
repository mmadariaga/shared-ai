# ADR 0114: A sibling DDR index template mirrors the ADR index template instance for instance

## Status

Accepted

## Context

The ADR cold build sources its section skeleton from the project-agnostic template `sai/instructions/_templates/adr-index.md`, referenced by exact path. A DDR cold build needs the same project-agnostic skeleton with the DDR bindings, and the two template instances must stay in skeleton parity so a divergence is caught automatically rather than by drift.

## Decision

`sai/instructions/_templates/ddr-index.md` carries the canonical skeleton with the DDR bindings: H1 `# DDR Index`, then the five `## ` sections in canonical order — `## Conventions`, `## By <domain unit>` (literal placeholder, never a concrete noun), `## Cross-cutting categories` (empty placeholder skeletons with cold-build markers naming the DDR family), `## DDRs that extend or correct prior ones`, `## Superseded DDRs (historical)`. `sai/instructions/implement.md` references it by exact path as the DDR cold-build source, exactly as `adr-index.md` is referenced for the ADR family. A parity guard test (`test/index-template-parity.test.js`) pins the two instances together following the `report-template-parity` precedent. `sai/instructions/_templates/adr-index.md` is NOT edited (byte-pinned by the manifest retirement hash).

## Alternatives Considered

- **A single parameterized template** (one file, family-token switches) — rejected: the sibling-instance convention with an automated parity guard keeps each family explicit and the divergence detection deterministic.
- **Inlining the DDR skeleton into `implement.md`** — rejected: violates the exact-path template reference contract and duplicates the skeleton.

## Consequences

The mirror discipline becomes the template contract; a later divergence is caught only by the parity guard. The sibling template is a template/mechanism choice about the instruction library's shape, not a domain invariant, which is why this record is an ADR.

## Provenance

Derived — the sibling template instance was derived from the mirror-discipline convention (each family gets its own project-agnostic template instance); the proposal records it, the user did not state it.
