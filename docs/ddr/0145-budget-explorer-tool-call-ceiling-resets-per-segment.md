# DDR 0145: The budget-explorer tool-call ceiling resets for each execution segment

## Status

Accepted

## Context

The existing `budget-explorer` contract caps a spawn at `≤30` tool calls but does
not make clear whether a continuation shares that budget. Treating the cap as an
aggregate would make a legitimate continuation unusable; treating it as
unbounded would weaken cost and dispatch safety.

## Decision

The existing `≤30` ceiling applies independently to the initial spawn and to
every execution segment created by a continuation. Calls from an earlier
segment do not spend or authorize calls in a later segment. When a harness
supports continuation, the main agent resumes the same explorer for the next
bounded segment. When it does not, the main agent starts a fresh explorer with
only the required bounded task context. The neutral policy states this invariant
without changing Claude Code's continuation behavior or opencode's fresh
redispatch behavior.

## Alternatives Considered

- **Use one aggregate cap for the whole run** — rejected because a continuation
  would inherit an exhausted budget even when it is an independently bounded
  interaction.
- **Raise the cap for continuations** — rejected because it would change the
  existing maximum and weaken the cost contract.
- **Move harness dispatch mechanics into the neutral policy** — rejected because
  continuation and fresh-redispatch behavior belongs to each harness binding.

## Consequences

Each research segment remains bounded and the two harnesses preserve their
existing dispatch mechanics. Complex research may require several bounded
segments, and each segment must receive only the task context and any explicitly
carried-forward escalation needed for that segment.

## Provenance

User — `openspec/changes/explore-agent-search-scope/design.md` records the three
qualification criteria and selects independent per-segment application of the
existing ceiling.
