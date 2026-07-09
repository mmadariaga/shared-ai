# apply-subagent-report-contract Specification

## MODIFIED Requirements

### Requirement: Subagent returns a compact fixed-field report

When a Step-execution subagent finishes (or stops), it SHALL return a compact report containing exactly these fields:

1. **Step executed** — the Step number `N`.
2. **Per-item status** — done/failed status for each of the Step's checkbox items.
3. **RED result** — one of: valid / passes / wrong-failure / `n/a`, including the error type when applicable.
4. **GREEN result** — pass / fail / `n/a`.
5. **Deviations** — a list of `{plan, final, reason}` entries for the appendix; empty if none.
6. **Technical learnings / friction** — reusable, self-contained, actionable facts discovered during execution; empty if none (per `apply-technical-learnings-memory`).
7. **STOP reached?** — yes/no, with the exact marker message when yes.
8. **Files modified** — paths modified or created by the subagent during this Step, relative to the repo root, one path per entry; empty list if the subagent modified nothing.

The report shape (8 fields, order, semantics) is stable across all dispatch kinds. Which fields carry a real value depends on the dispatch:

- **Non-testable Step (single dispatch):** fields 3 and 4 both carry real values (RED result and GREEN result) exactly as before.
- **Testable Step — test-writer dispatch:** field 3 (RED result) carries a real value; field 4 (GREEN result) is `n/a` because the test-writer does not write or verify GREEN.
- **Testable Step — implementation dispatch:** field 4 (GREEN result) carries a real value; field 3 (RED result) is `n/a` because the implementation dispatch does not author or verify the RED test.

Field 8 is required in every report kind (an empty list is a valid value but an absent field is a malformed report). The report SHALL NOT include raw file contents, full tracebacks, or iteration logs.

#### Scenario: Non-testable Step completes cleanly

- **WHEN** a single subagent finishes a non-testable Step with no deviations and no STOP
- **THEN** it returns the report with Step N, per-item done statuses, RED result, GREEN=pass, empty deviations, technical learnings (empty or populated), STOP reached = no, and `Files modified` = the set of paths the subagent changed — and nothing else

#### Scenario: Test-writer dispatch reports RED with GREEN `n/a`

- **WHEN** the test-writer subagent for a testable Step finishes after verifying a valid RED
- **THEN** its report sets field 3 (RED result) = `valid`, field 4 (GREEN result) = `n/a`, populates field 8 with the test/stub files it wrote, and carries per-item status, deviations, learnings, and STOP as usual

#### Scenario: Implementation dispatch reports GREEN with RED `n/a`

- **WHEN** the implementation subagent for a testable Step finishes after verifying GREEN
- **THEN** its report sets field 4 (GREEN result) = `pass`, field 3 (RED result) = `n/a`, populates field 8 with the production files it modified, and carries per-item status, deviations, learnings, and STOP as usual

#### Scenario: Subagent stops at a STOP & COMMIT

- **WHEN** a subagent's Step reaches a STOP & COMMIT
- **THEN** the report sets "STOP reached? = yes" and includes the exact marker message, alongside the other fields for the work completed up to the STOP

#### Scenario: RED check is invalid

- **WHEN** the test-writer's RED verification either already passes or fails for a non-assertion reason
- **THEN** the report's field 3 (RED result) records `passes` or `wrong-failure` (with the error type), so the coordinator can act on the invalid RED rather than dispatching the implementation subagent

#### Scenario: Subagent modifies no files

- **WHEN** a subagent executes a Step that produces no file changes (for example, a Step that only runs a verification command)
- **THEN** the report's `Files modified` field is an empty list, not absent; the report remains 8 fields and the coordinator cross-checks against an empty set

#### Scenario: Subagent omits field 8

- **WHEN** a subagent returns a report without `Files modified`
- **THEN** the coordinator treats the report as malformed per `apply-pre-commit-file-report` and surfaces the omission to the user before any commit is proposed
