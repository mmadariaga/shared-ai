# ADR 0107: ADR creation decision gets its own capability

## Status

Accepted

## Context

`sai/instructions/implement.md` Step 3 asked the user before checking the
project's ADR culture, making the ask the default action for a qualifying
decision in a project that maintains ADRs/DDRs. The canonical rule in
`sai/instructions/spec.propose.md` places culture first: "Only propose creating
an ADR/DDR if the project already has an ADR culture or the user explicitly
approves". The existing `adr-index-maintenance` capability scopes to the ADR
index-maintenance cycle beginning after creation, so the ask-vs-create decision
has no normative home there.

## Decision

Reorder Step 3's branches so the project-culture check precedes the ask:
project maintains ADRs/DDRs → create the file directly without asking; no ADR
culture → ask the user and create only upon explicit approval; criteria not met
→ neither create nor ask. Norm the ordering in a new `adr-creation-decision`
capability rather than extending `adr-index-maintenance`.

## Alternatives Considered

- Extend the `adr-index-maintenance` capability with the ask-vs-create rule:
  rejected because its scope begins after creation ("Step 3 shall maintain the
  ADR index after creating ADR files"); adding the pre-creation ask-vs-create
  decision contradicts the capability's bounded scope and pollutes the
  post-creation maintenance cycle.

## Consequences

The declared behavior has a normative home and the maintenance capability stays
untouched at its existing scope. The reorder rides in the same change as the
audit-append invariant because it is the same positional-weakness defect class
observed in the same runtime, touching one adjacent line.

## Provenance

Codebase-forced decision recorded in the `enforce-audit-step-append-verification`
design (Decision 4).
