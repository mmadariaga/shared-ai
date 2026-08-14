# DDR 0133: Budget dispatch literals resolve through collision-safe harness-managed roles

## Status

Accepted

## Context

Budget delegation roles must resolve unambiguously in each harness's agent namespace. Claude Code shares a namespace with built-in roles, including `Explore`, while opencode's managed generic agents already use the shorter `explore`, `executor`, and `budget` names. The existing Claude `budget-subagent` dispatch literal also needs a matching managed source.

## Decision

Every budget dispatch literal resolves to a harness-managed Generic Agent without shadowing a built-in role. Claude Code uses the collision-safe basenames `budget-explorer`, `budget-executor`, and `budget-subagent`; opencode retains `explore`, `executor`, and `budget`. Skills and callers use those exact harness-specific names while both harnesses continue to fetch the same neutral role policies.

## Alternatives Considered

- **Reuse opencode's short names in Claude Code** — rejected because `explore` would collide with Claude Code's built-in Explore role and would make dispatch resolution ambiguous.
- **Choose unrelated Claude-only names** — rejected because they would weaken role parity and would not resolve the existing `budget-subagent` literal.

## Consequences

Installed filenames, project-local overrides, skill contracts, and dispatch examples depend on the settled names. Harness seams remain explicit, while neutral behavior policies remain shared. This is a DDR because every budget dispatch must resolve to exactly one intended managed role in its harness namespace.

## Provenance

User — the design records the collision-safe Claude basenames as a qualifying domain invariant.
