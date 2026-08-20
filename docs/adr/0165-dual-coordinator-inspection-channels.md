# ADR 0165: Dual coordinator inspection channels — verifying vs phase-static

## Status

Accepted

## Context

Shared eligibility requires a coordinator-established Cause Locus (or an explicit unresolved marker). Blind opted-in adapters (design) cannot read change artifacts. Inferring locus from `summary` prose is forbidden. Expanding the closed worker lifecycle payload was rejected for this change. Leaving the design surface only in design-card prose left it uninstantiated under the no-card-edit boundary.

## Decision

Coordinator inspection uses exactly one of two evidence channels — never worker `summary` prose, and without expanding the closed worker lifecycle payload:

1. **Independent verification channel** (verifying adapters, including Apply): locus from Verification Checklist, baseline, allowed-file set, and report comparison.
2. **Phase-static repair-surface channel** (blind opted-in adapters, including design): deterministic match against registered surfaces only.

The sole runtime registry table lives in `sai/orchestration/command-runner.md`. The required initial row is `design-overview-repair` with primary path `openspec/changes/{change-name}/change-overview.md`, optional `.openspec.yaml`, point `overview-generation-repair`, boundary `design-worker-overview-repair`, and the accepted failure-class set. Empty/missing `changed_files` or omitted primary path yields unresolved. Design keeps `recovery_policy: true` without design-card edits.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Dual channels + sole runner registry (chosen) | One eligibility engine; preserves blindness; testable | Registry must stay single-homed |
| Infer locus from `summary` prose | No registry needed | Forbidden by worker-failure-classification |
| Add `cause_evidence` to failed payload | Explicit machine field | Expands closed lifecycle shape |
| Design-card-only surface | Local to design | Uninstantiated under no-card-edit boundary |
| Require artifact sight for every opted-in adapter | Simpler channel | Breaks design coordinator blindness |

## Consequences

- Command-runner hosts the only maintained registry table.
- Non-overview design failures with empty `changed_files` cannot steal the overview surface.
- Future blind surfaces require a delta that updates the capability and the runner registry together.

## Related

- `openspec/changes/diagnosis-driven-recovery-apply/design.md` — Decision D10
- DDR 0152 — Cause Locus gates eligibility
- DDR 0151 — Three mutually exclusive routing diagnoses
