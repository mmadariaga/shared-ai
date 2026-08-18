# ADR/DDR Criteria and Routing Test (shared instruction)

Shared decision-record criteria fetched by `sai/commands/design/instructions.md` (which records the resolved family) and `sai/commands/implement/instructions.md` Step 3 (which acts on it). The criteria and the routing test live ONLY here — neither fetching body restates them inline.

This instruction is flat: it takes no parameters and the fetch site supplies nothing.

## The three criteria

A design decision qualifies for a persistent decision record only when all three hold:

1. **Hard to reverse** — the cost of changing it later is meaningful.
2. **Surprising without context** — a future reader would wonder "why did they do it this way?"
3. **Real trade-off** — genuine alternatives existed and one was chosen for specific reasons.

If a decision does not meet all three, no record is created.

## The ordered routing test

Only when all three criteria hold, resolve the decision's record family before anything else depends on it. A decision that encodes a **domain invariant** — a constraint the pipeline's domain imposes that must hold of the pipeline's artifacts, records, or behavior at all times, stated as a property of the domain rather than as the mechanism that upholds it (e.g. "a record's entry lives in exactly one index, its own family's"; "supersedes SHALL NOT cross families") — is a `ddr`; otherwise — a choice about how the pipeline is built (layout, mechanism, tooling, ordering, policy) — it is an `adr`.

The test is ordered, so a decision readable both ways resolves to `ddr`; there is no tie.

The routing test resolves the family only — the three criteria still decide whether a record is created at all.

## Never leave the choice open

The ADR-vs-DDR choice is NEVER left open and is NEVER offered to the user as a choice. The phrase "ADR/DDR" names the two-family criteria surface and SHALL NOT be used to leave the family unresolved.
