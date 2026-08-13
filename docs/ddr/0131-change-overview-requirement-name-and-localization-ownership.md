# DDR 0131: Change Overview requirement names and localization anchors remain separately owned

## Status

Accepted

## Context

The approval-structure rewrite changes six capability requirement names and introduces a structural localization requirement for the nine-section projection. Language transport and projection-only localization already belong to the localized-overview-generation capability, so the structural rewrite must preserve a distinct ownership boundary.

## Decision

Record the six old-to-new requirement names explicitly in the delta's RENAMED Requirements section and add a focused structural localization requirement to change-overview-artifact. That requirement owns the fixed-versus-eligible rendering classification for the nine-section surface; localized-overview-generation remains authoritative for language transport, projection-only scope, and language re-selection across invocations.

## Alternatives Considered

- **Keep the old names and rely on positional matching** — rejected: archive synchronization requires explicit requirement identity.
- **Merge structural localization into localized-overview-generation** — rejected: it would blur structural ownership with invocation language transport.

## Consequences

Requirement archives retain explicit identity across the rename, and localization validation can distinguish structural anchors from language transport. The two capability surfaces must continue to reference one another by their named requirements. This is a DDR because requirement ownership and structural anchor stability are domain properties of the capability records.

## Provenance

User — the design records the explicit rename and separate structural localization requirement as a qualifying DDR decision.
