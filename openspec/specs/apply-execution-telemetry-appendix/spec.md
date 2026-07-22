# apply-execution-telemetry-appendix Specification

## ADDED Requirements

### Requirement: Coordinator persists field 9 into an execution telemetry appendix

The `/sai-4-apply` coordinator SHALL persist each dispatch's field-9 entries as rows in a `## Appendix: Execution Telemetry` section at the end of `openspec/changes/{change-name}/implementation.md`.

The coordinator SHALL create the section on the first telemetry row it writes and append below the existing rows thereafter. The section holds exactly one Markdown table with these columns in this fixed order:

    | Step | dispatch | phase | attempts | first_failure | note |

Column sources:

- `Step` — the integer `N` of the Step just executed, supplied by the coordinator.
- `dispatch` — one of `single` / `writer` / `implementation`, supplied by the coordinator from the dispatch it issued. It SHALL NOT be read from the subagent report, because the subagent does not report it.
- `phase`, `attempts`, `first_failure`, `note` — copied verbatim from the corresponding field-9 entry.

One row SHALL be written per field-9 entry — no more and no fewer. A testable Step therefore contributes rows from both its test-writer dispatch and its implementation dispatch. A non-testable Step contributes rows from its single dispatch: two (one `red`, one `green`) when the Step's body contains a RED block, and one (`green`) when it does not, because the RED phase is conditional on that block. Non-testable Steps SHALL NOT be excluded from the appendix.

Because both the `dispatch` axis and the `phase` axis are recorded, a RED attempt count from the non-blind single dispatch stays distinguishable from a RED attempt count from the blind test-writer. The coordinator SHALL NOT collapse the two axes into one.

The table SHALL NOT be extended with a free-text column, and the coordinator SHALL NOT write raw file contents, tracebacks, or iteration logs into any cell.

#### Scenario: Testable Step produces rows from both dispatches

- **WHEN** the coordinator completes a testable Step whose test-writer reported one `red` field-9 entry and whose implementation dispatch reported one `green` field-9 entry
- **THEN** the appendix gains two rows for that Step — one with `dispatch` = `writer`, `phase` = `red`, and one with `dispatch` = `implementation`, `phase` = `green`

#### Scenario: Non-testable Step produces two rows from one dispatch

- **WHEN** the coordinator completes a non-testable Step whose body contains a RED block and whose single dispatch reported field-9 entries for both `red` and `green`
- **THEN** the appendix gains two rows for that Step, both with `dispatch` = `single`, one with `phase` = `red` and one with `phase` = `green`

#### Scenario: Non-testable Step without a RED block produces one row

- **WHEN** the coordinator completes a non-testable Step whose body contains no RED block, so its single dispatch reported only a `green` field-9 entry
- **THEN** the appendix gains exactly one row for that Step, with `dispatch` = `single` and `phase` = `green`

#### Scenario: Coordinator supplies the dispatch column itself

- **WHEN** the coordinator writes a telemetry row
- **THEN** the `Step` and `dispatch` values come from the coordinator's own knowledge of the dispatch it issued, never from the subagent report, and a subagent-supplied dispatch value (if any appeared) is ignored

#### Scenario: Section is created once and appended to

- **WHEN** the coordinator writes telemetry for the second and later Steps of a run
- **THEN** it appends rows to the existing `## Appendix: Execution Telemetry` table rather than creating a second section

### Requirement: Telemetry is appended in the per-Step deviations appendix slot

The coordinator SHALL append a Step's telemetry rows in the same workflow loop slot that already holds the deviations appendix — after the coordinator's own verification passes and (if applicable) the user confirms Human Verification, and **before** the coordinator commits. This places the telemetry in the same commit as the work it describes.

The appendix SHALL be written only by the coordinator. Subagents are forbidden from editing `implementation.md` (per the `apply` capability's coordinator-only rule), so no other author is possible.

Writing the telemetry rows SHALL NOT be a gate: if there are no field-9 entries to record for a Step, the coordinator writes no rows and proceeds without comment, exactly as it skips an empty deviations entry.

Both appendices live at the end of `implementation.md` in a fixed order: `## Appendix: Plan vs Final Implementation` first, then `## Appendix: Execution Telemetry`. The order SHALL NOT depend on which section a given run happened to create first, so that a plan whose early Steps produce no deviations lays the sections out identically to one whose early Steps do, and the file stays stable and diffable across runs.

#### Scenario: Telemetry section is placed after the deviations section

- **WHEN** a run's first Step produces telemetry rows but no deviations, and a later Step produces its first deviation
- **THEN** the coordinator inserts `## Appendix: Plan vs Final Implementation` **above** the existing `## Appendix: Execution Telemetry` section rather than appending it below, preserving the fixed order

#### Scenario: Telemetry lands in the same commit as the work

- **WHEN** a Step's verification has passed and the coordinator is about to print the pre-commit file visibility report
- **THEN** the telemetry rows for that Step are already written into `implementation.md`, so they are part of the add-list preview and land in the Step's own commit

#### Scenario: Step with no telemetry to record

- **WHEN** a Step's dispatches returned no field-9 entries at all
- **THEN** the coordinator appends no rows, creates no empty section, prints no warning, and continues to the commit gate unchanged

#### Scenario: Subagent cannot author the appendix

- **WHEN** any Step-execution subagent runs
- **THEN** `implementation.md` shows no telemetry edits authored by the subagent; every appendix row traces to the coordinator
