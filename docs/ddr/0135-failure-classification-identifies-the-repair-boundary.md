# DDR 0135: Failure classification identifies the repair boundary

## Status

Accepted

## Context

Coordinator routing cannot safely infer recoverability from free-form failure summaries. Nested generator contract violations and coordinator-rejected outer worker envelopes also occur at different trust boundaries and must not share one classification.

## Decision

Resolved failed worker outcomes carry a closed `failure_class` and boolean `unrecoverable` veto. Valid overview-generator `failure_kind` values propagate unchanged, malformed nested generator results use `envelope-contract-violation`, ordinary routed failures use `unclassified-worker-fault`, and only the coordinator may author `outer-envelope-violation` when it rejects a worker result.

## Alternatives Considered

- **Parse summary prose** — rejected because wording is not a stable machine-readable routing surface.
- **Collapse nested and outer envelope violations** — rejected because an untrusted outer worker result must never enter recovery.
- **Classify at the repair boundary** (chosen) — gives the coordinator deterministic routing metadata without artifact inspection.

## Consequences

- Recovery eligibility follows closed metadata rather than prose.
- Workers can veto unsafe continuation using evidence unavailable to the coordinator.
- Coordinator-authored outer-envelope rejection remains ineligible for recovery.

## Provenance

User — `openspec/changes/bounded-worker-recovery/design.md`, Decision 3.
