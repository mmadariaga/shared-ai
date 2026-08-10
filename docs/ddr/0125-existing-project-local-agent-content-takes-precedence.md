# DDR 0125: Existing project-local agent content takes precedence over installed availability

## Status

Accepted

## Context

A selected project-local agent can outlive the installed global agent that was
used to create it. Requiring the global source for every later update would
make a user-owned extension point depend on current installation state and
could block unrelated selected agents.

## Decision

Resolve the project-local destination before looking for an installed source.
If the destination exists, update its selected harness tunables without
reading the global source. Require the harness-specific installed source only
when the destination is missing. A missing source skips that agent and does
not prevent other selected agents from being materialized.

## Alternatives Considered

- Require an installed source for every update: rejected because existing local
  content is independently sufficient.
- Fail the entire traversal on one missing source: rejected because per-agent
  independence and setup optionality require a soft skip.

## Consequences

The materializer reports expected per-agent skips and continues processing.
Project-local content remains durable across global installation changes, while
first materialization still requires a same-named harness-specific source.

## Related

- `openspec/changes/persist-project-agent-overrides/design.md` — Decision
  “Existing local content takes precedence over installed-source availability”.
