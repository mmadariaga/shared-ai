# apply-subagent-report-contract Specification

## Purpose
TBD - created by archiving change delegate-apply-steps-to-subagent. Update Purpose after archive.
## Requirements
### Requirement: Subagent returns a compact fixed-field report

When a Step-execution subagent finishes (or stops), it SHALL return a compact report containing exactly these fields:

1. **Step executed** — the Step number `N`.
2. **Per-item status** — done/failed status for each of the Step's checkbox items.
3. **RED result** — one of: valid / passes / wrong-failure, including the error type when applicable.
4. **GREEN result** — pass/fail.
5. **Deviations** — a list of `{plan, final, reason}` entries for the appendix; empty if none.
6. **Technical learnings / friction** — reusable, self-contained, actionable facts discovered during execution; empty if none (per `apply-technical-learnings-memory`).
7. **STOP reached?** — yes/no, with the exact marker message when yes.

The report SHALL NOT include raw file contents, full tracebacks, or iteration logs.

#### Scenario: Subagent completes a Step cleanly

- **WHEN** a subagent finishes a Step with no deviations and no STOP
- **THEN** it returns the report with Step N, per-item done statuses, RED result, GREEN=pass, empty deviations, technical learnings (empty or populated), and STOP reached = no — and nothing else

#### Scenario: Subagent stops at a STOP & COMMIT

- **WHEN** a subagent's Step reaches a STOP & COMMIT
- **THEN** the report sets "STOP reached? = yes" and includes the exact marker message, alongside the other fields for the work completed up to the STOP

#### Scenario: RED check is invalid

- **WHEN** the RED verification either already passes or fails for a non-assertion reason
- **THEN** the report's RED result records `passes` or `wrong-failure` (with the error type), so the coordinator can act on the invalid RED rather than the subagent silently proceeding

### Requirement: Each technical-learning entry is self-contained and actionable

Every entry in the report's technical-learnings field SHALL be self-contained and actionable: it states what was attempted, what failed, and what works instead (e.g., a symbol that does not exist, a real API signature or name, a version incompatibility, an undocumented behavior, or a workaround applied).

#### Scenario: Subagent discovers a non-existent method

- **WHEN** the subagent tries a method that does not exist and finds the correct one
- **THEN** the corresponding learnings entry records the attempted symbol, that it does not exist, and the working alternative — enough for a later subagent to avoid the same wall without extra context

