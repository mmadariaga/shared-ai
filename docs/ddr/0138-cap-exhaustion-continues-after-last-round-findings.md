# DDR 0138: Cap exhaustion continues after the last round's findings

## Status

Accepted

## Context

A bounded supervised review must stop after three rounds, but the third round's findings are processed before the bound is reached. Stopping the whole run after those edits would discard useful pipeline progress, while claiming unresolved High findings would describe a state that was never reread.

## Decision

After the third supervised review round, the phase worker processes every finding and the pipeline dispatches no fourth round. Cap exhaustion is a non-failure continuation state: spec review proceeds to chained design and design review proceeds to supervised completion. Reporting is one line carrying only the last round's base-form finding counts; it neither claims that High findings remain nor claims that the edited state was re-reviewed.

## Alternatives Considered

- **Stop the run at cap exhaustion** — rejected because bounded review would prevent the autonomous phase chain after applying the final findings.
- **Run an unbounded fourth round** — rejected because it removes the deterministic cost ceiling.
- **Report the final High findings as outstanding** — rejected because the worker may have changed the artifacts after those findings were formed.

## Consequences

The review cost remains deterministically bounded while the run continues. The report is deliberately limited to evidence from the last completed round and does not make claims about the post-edit state.

## Provenance

User — `openspec/changes/supervised-in-situ-review/design.md` records the choice and all three ADR/DDR qualification criteria.

## Related

- `openspec/changes/supervised-in-situ-review/specs/supervised-review-rounds/spec.md`
- `openspec/changes/supervised-in-situ-review/specs/supervised-review-reporting/spec.md`
- `/sai-explore`
