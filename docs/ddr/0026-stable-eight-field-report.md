# ADR 0026: Stable 8-field report shape with per-dispatch n/a for the unowned field

## Status

Accepted

## Context

`sai-4-apply` defines a compact fixed-field subagent report. The pre-existing prose said "exactly these 7 fields" while the enumerated list already contained 8 fields — a long-standing inconsistency. With the introduction of split dispatches (test-writer + implementation), a single report can no longer carry both a real RED result and a real GREEN result for the same dispatch. Two possible shapes were considered: distinct schemas per dispatch kind, or one stable shape with `n/a` markers.

## Decision

Keep one stable 8-field report shape across all dispatch kinds. A test-writer dispatch owns RED (field 3) and marks GREEN (field 4) `n/a`; an implementation dispatch owns GREEN and marks RED `n/a`; a non-testable single dispatch carries both real values. Field 8 (`Files modified`) is required in every report kind. The prose "7 fields" is corrected to "8".

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| One stable 8-field shape with `n/a` markers (chosen) | Uniform coordinator parsing; uniform pre-commit union logic; no schema branching | `n/a` is a mild semantic stretch for a field that simply does not apply |
| Distinct report schema per dispatch kind | Each schema exactly matches the dispatch's actual output | Coordinator must branch on dispatch kind to parse; pre-commit union logic becomes more complex; two schemas to maintain |

## Consequences

- Coordinator parsing and the pre-commit report union logic remain uniform.
- The `n/a` convention is documented in the report contract and must be honored by all subagent dispatches.
- The existing 8-field enumeration is finally reconciled with the prose.

## Related

- `openspec/changes/consume-interfaces-artifact/design.md` — Decision D4
- `openspec/changes/consume-interfaces-artifact/specs/apply-subagent-report-contract/spec.md` — "Subagent returns a compact fixed-field report"
- `sai/instructions/apply.md` — `## Subagent Report Contract` section updated by this change
