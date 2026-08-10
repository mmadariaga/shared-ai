# DDR 0124: Change Overview localization is limited to derived free-text prose

## Status

Accepted

## Context

The Change Overview is a human-oriented projection assembled from normative OpenSpec artifacts. Users need localized prose, but headings, requirements, scenarios, source paths, commands, state values, and traceability anchors must remain stable for review and machine validation.

## Decision

The selected language applies only to eligible free-text prose in `change-overview.md`. Structural headings, the Architecture Snapshot, requirements, scenarios, paths, commands, state values, result keys, and all normative source artifacts remain English or source values.

## Alternatives Considered

- **Localize the complete overview document** — rejected: translated structural anchors and source values would weaken machine-review stability and traceability.
- **Localize normative artifacts as well** — rejected: derived presentation would become a competing source of truth.

## Consequences

Localized overviews remain reviewable against their English/source contracts, while prose quality depends on the requested free-form language. The restriction is a DDR because projection fidelity is a domain property that must hold for every generated Change Overview.

## Provenance

Derived — the design chose projection-only localization to preserve structural anchors and source traceability.
