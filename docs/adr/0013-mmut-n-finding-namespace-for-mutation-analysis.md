# ADR 0013: Dedicated mMUT-N finding namespace and Mutation Analysis output section

## Status

Accepted

## Context

`sai-5-review` classifies findings with severity-prefixed IDs: `B{n}` (Blocker), `M{n}` (Major), `m{n}` (Minor), `Q{n}` (Question), each rendered in the generic Findings lists of `<output_template>`.

Pass 11 (Mutation Analysis, see [ADR 0012](./0012-mutation-analysis-as-dedicated-protocol-section.md)) emits a different kind of finding. A surviving mutant requires a fixed 7-field row — Location, Mutation class, Original, Applied, Result, Why it survives, Suggested fix — whose shape and lifecycle differ from the generic Blocker/Major rows. Mutation outcomes also map to severity in a pass-specific way (`survived`/`pre-check-failed` → Major, `revert-failed` → Blocker plus a printed working-tree-pollution warning), and the aggregate must satisfy the full-visibility invariant `survived + killed + preCheckFailed + revertFailed == totalMutations`.

Reusing `M{n}`/`B{n}` for these findings would interleave a different row format into the generic lists and lose the ability to grep mutation findings as a unit.

## Decision

Use a dedicated `mMUT-N` identifier for mutation findings (N a 1-based counter over the mutation findings in this review), rendered in a dedicated `## Mutation Analysis` section of `<output_template>` using the 7-field row for surviving mutants and a shorter row for impediment outcomes. The section carries the aggregate invariant line.

Severities still feed the report's overall verdict: a `survived`/`pre-check-failed` mutation counts as **Major** and a `revert-failed` mutation counts as a **Blocker** in the Findings count and Verdict, exactly like any other finding of that severity.

`mMUT-N` deliberately breaks the `B/M/m/Q` prefix convention. **It must not be "normalized" back to `M{n}`/`B{n}`.**

## Alternatives Considered

- **Interleave survivors as ordinary `M{n}` rows and revert-failures as `B{n}` in the existing Blocker/Major lists** — rejected: their row shape and lifecycle differ from generic findings, and the change's spec fixes the `mMUT-N` id and the 7-field order.

## Consequences

- Mutation findings form a self-contained, greppable namespace (`mMUT-`) distinct from the four generic prefixes.
- The output contract gains a dedicated section that downstream readers/tooling parse separately; changing the `mMUT-N` id or field order is a breaking change to that contract.
- The convention break is intentional and recorded here so a future editor does not "correct" `mMUT-N` to `M{n}`/`B{n}`.
- Mutation severities still drive the overall verdict, so a `revert-failed` Blocker affects merge-readiness like any other Blocker.
