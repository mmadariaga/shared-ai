# ADR 0131: Keep OpenCode budget skills behind canonical behavior policies

## Status

Accepted

## Context

The OpenCode `budget-subagent`, `budget-executor`, and `budget-explorer`
skills repeat behavior already owned by the matching canonical agent policies.
Those copies can drift from the generic `budget`, `executor`, and `explore`
agent contracts even though both surfaces use the same Fetch namespace.

## Decision

Each OpenCode budget skill contains exactly one Fetch directive for its matching
`sai/policies/*-agent.md` policy. The skills remove policy-owned universal
behavior or output-contract blocks while retaining their OpenCode-specific
binding, dispatch, model-resolution, cap, raw-output, permission, and cost
guidance. The Claude Code budget skills keep their separate harness binding and
are not changed by this decision.

## Alternatives Considered

- Keep the duplicated behavior and rely only on parity tests: rejected because
  future policy changes would still require synchronized prose edits.
- Add a native OpenCode policy import: rejected because the established Fetch
  namespace is the shared policy boundary.

## Consequences

The three OpenCode budget skills and their matching generic agents resolve one
behavior source, so canonical policy updates reach both surfaces without a
second skill-local copy. Harness-specific dispatch and cost guidance remains
local to the OpenCode skills.
