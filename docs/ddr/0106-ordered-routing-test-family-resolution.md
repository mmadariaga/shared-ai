# DDR 0106: The ordered routing test resolves a qualifying decision's record family, DDR first, with no tie

## Status

Accepted

## Context

`sai/instructions/implement.md:95` asked the user "Do you want me to create `docs/adr/NNNN-slug.md` or `docs/ddr/NNNN-slug.md`?" with no criterion attached, and `sai/instructions/design.md:69` and `sai/instructions/spec.propose.md:78-85` each restated the three ADR/DDR criteria without distinguishing the two families, so the ADR-vs-DDR choice fell to whichever model was running. With 93 ADRs and 20 DDRs split by hand in this repository, the ambiguity was no longer hypothetical.

## Decision

A decision that meets all three ADR/DDR criteria (hard to reverse, surprising without context, real trade-off) resolves its record family by an ordered two-step test:

1. **DDR test (evaluated first)**: the decision encodes a **domain invariant** — a constraint the pipeline's domain imposes that must hold of the pipeline's artifacts, records, or behavior at all times, stated as a property of the domain rather than as the mechanism that upholds it (for example, "a record's entry lives in exactly one index, its own family's"; "supersedes SHALL NOT cross families"). When it does, the family is `ddr`.
2. **ADR test (evaluated second)**: otherwise — a choice about how the pipeline is built (layout, mechanism, tooling, ordering, policy) that states no domain invariant — the family is `adr`.

Because the DDR test runs first, a decision readable both ways resolves to `ddr`; no decision can tie and none leaves room for improvisation. The test resolves the family only — the three criteria still decide whether a record is created at all.

## Alternatives Considered

- **ADR-first ordering** — rejected: an invariant-stating decision is the stronger signal; evaluating it first makes the test total with no improvised tie-break.
- **User choice at ask time** — rejected: the ask would force a model run to decide the family without a criterion, which is the ambiguity this test removes.
- **A unified record type with no families** — rejected: the corpus was already split into 93 ADRs and 20 DDRs; the families exist and need a deterministic resolution rule, not dissolution.

## Consequences

Every criteria-evaluation surface — `design.md`'s `## Decisions`, `spec.propose.md`'s ADR/DDR Proposal Check, `implement.md` Step 3 — resolves the family deterministically. The `**Record family**: adr|ddr` marker recorded in `design.md` at design time pins the resolution so Step 3 reads it instead of re-deciding; when the marker is absent, Step 3 applies this test as the fallback. The test is itself the family-defining property stated as a property of the domain, which is why this record is a DDR.

## Provenance

Derived — the test and its DDR-first ordering were reasoned out of the design discussions in the preceding chat and crystallized into the proposal; the user accepted the block but did not state the test themselves.
