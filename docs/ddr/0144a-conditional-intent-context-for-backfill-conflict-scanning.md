# DDR 0144a: Backfill conflict scanning receives intent context only when usable

## Status

Accepted

## Context

Backfill already delegates conflict scanning for the selected diff before any
artifact is written. The optional intent statement can improve that scan when it
contains a capability, constraint, boundary, or rejected alternative, but an
empty or non-actionable statement adds no constraints and should not alter the
established diff-only behavior.

## Decision

When reconciliation identifies at least one intent item or rejected-alternative
context entry, the conflict-scan subagent SHALL receive the selected diff, the
original in-conversation statement, and worker-authored `Capabilities`,
`Constraints`, and `Other intent context` lists. When no usable intent context is
identified, the subagent SHALL receive only the diff. The existing conflict
report and explicit proceed-or-abort gate remain unchanged in both branches.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Always pass the statement | Gives the scanner maximum conversational context | Passes empty or unusable text and changes the no-intent compatibility path |
| Never pass intent | Keeps the existing scanner input stable | Misses constraints and rejected alternatives that can expose conflicts |
| Pass structured worker-authored context only when usable (chosen) | Preserves no-intent compatibility while enriching meaningful scans | Requires a usability decision before dispatch |

## Consequences

- A no-intent backfill continues to use the diff-only scanner input.
- A usable statement can expose conflicts involving stated constraints or rejected alternatives without making them normative requirements.
- Conflict findings remain subject to the existing user-controlled proceed-or-abort decision.
- The original statement stays ephemeral even when it is included in a subagent prompt.
