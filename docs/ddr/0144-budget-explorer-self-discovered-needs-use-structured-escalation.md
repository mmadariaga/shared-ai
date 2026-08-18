# DDR 0144: Self-discovered external needs use structured escalation records

## Status

Accepted

## Context

Root-confined research can reveal a concrete external artifact that the task did
not name. Silent widening would transfer filesystem authorization to the
explorer, while an optional caller field would let a consumer miss the blocked
need or confuse not-found with an external dependency.

## Decision

Every structured `budget-explorer` response carries an `out_of_root_requests`
array, even when the caller's declared fields omit it. Each entry has a concrete
`path` and a `reason` that remains independently legible when the path text is
removed; an empty array means that no concrete escalation exists. A
self-discovered external need that is not already directed is never accessed:
the explorer returns it in this field for the main agent. Patterns, wildcards,
and circular reasons are invalid escalation records. A continuation may access a
returned path only when the main agent explicitly carries forward that exact
path and purpose as directed context. If the main agent declines the request,
the explorer ends external searching rather than probing another candidate.

## Alternatives Considered

- **Return the limitation only in prose** — rejected because callers could not
  reliably distinguish a concrete blocked dependency from an ordinary miss.
- **Retry automatically outside the root** — rejected because it would make the
  explorer the authority that widens its own filesystem scope.
- **Make the field optional or caller-controlled** — rejected because the
  escalation boundary must remain visible even to callers that did not predict
  the need.

## Consequences

External needs are auditable and caller-controlled, and an empty result is
unambiguous. A task may require an additional human-mediated continuation, and
the main agent must preserve the exact path and purpose when it authorizes that
continuation. The response contract gains one unconditional field in both
supported harnesses.

## Provenance

User — `openspec/changes/explore-agent-search-scope/design.md` records the three
qualification criteria and selects a mandatory structured escalation field.
