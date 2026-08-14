# DDR 0136: The overview generator envelope remains a closed five-field contract

## Status

Accepted

## Context

The overview generator has a stable nested result envelope consumed by the design worker. Recovery policy, worker failure classification, and attempt accounting belong to the routed worker lifecycle rather than to overview generation itself.

## Decision

Keep the generator result at exactly five mandatory fields: `status`, `changed_files`, `validation`, `failure_details`, and `failure_kind`. Do not add `failure_class`, `unrecoverable`, recovery budget, or acknowledgement fields. The design worker maps the nested result into the outer worker lifecycle classification channel.

## Alternatives Considered

- **Extend the generator envelope with recovery metadata** — rejected because it couples generation to coordinator policy and duplicates the outer lifecycle protocol.
- **Replace `failure_kind` with outer classification** — rejected because it collapses the nested generation boundary into routed-worker metadata.
- **Keep the five-field envelope** (chosen) — preserves generator compatibility and clean protocol layering.

## Consequences

- Existing generator producers and validators retain one closed result shape.
- Recovery metadata exists only on resolved failed worker outcomes.
- The design worker remains responsible for deterministic nested-to-outer mapping.

## Provenance

User — `openspec/changes/bounded-worker-recovery/design.md`, Decision 4.
