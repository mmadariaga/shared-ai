# apply-subagent-report-contract Specification

## Purpose
Defines the fixed worker report fields and verification telemetry contract.

## Requirements

### Requirement: Step-execution worker returns a compact fixed-field report

When a RED or GREEN Step-execution worker finishes (or stops), it SHALL return, through its lifecycle payload, a compact report containing exactly these fields:

1. **Step executed** — the Step number `N`.
2. **Per-item status** — done/failed status for each of the Step's checkbox items.
3. **RED result** — one of: valid / passes / wrong-failure / `n/a`, including the error type when applicable.
4. **GREEN result** — pass / fail / `n/a`.
5. **Deviations** — a list of `{plan, final, reason}` entries for the appendix; empty if none.
6. **Technical learnings / friction** — reusable, self-contained, actionable facts discovered during execution; empty if none.
7. **STOP reached?** — yes/no, with the exact marker message when yes.
8. **Files modified** — non-scratch paths written, created, or removed by the worker during this Step, relative to the repo root, one path per entry; a plan-named retired test file removed under the bounded retirement exception is declared here by its exact repository-relative path; paths under `.tmp/{change-name}/` SHALL be excluded even when the worker created or modified them; empty list if no non-scratch files were touched.

The report shape (8 fields, order, semantics) is stable across all dispatch kinds. Which fields carry a real value depends on the dispatch:

- **Non-testable Step with production (GREEN direct):** field 3 (RED result) is `n/a` and field 4 (GREEN result) carries a real value, because a GREEN-direct dispatch never runs a RED phase.
- **Split-Routed Step — blind RED worker:** field 3 (RED result) carries a real value; field 4 (GREEN result) is `n/a` because the RED worker does not write or verify GREEN.
- **Split-Routed Step — GREEN worker:** field 4 (GREEN result) carries a real value; field 3 (RED result) is `n/a` because the GREEN worker does not author or verify the RED test.
- **Production-free testable Step (RED green-exception):** field 3 (RED result) carries a real value (the authored-test RED classification) and field 4 (GREEN result) carries `pass`, because the green-exception RED worker authors the tests, leaves them green, and reports GREEN = pass.
- **Production-free non-testable Step (RED green-exception):** field 3 (RED result) is `n/a` (no RED block exists to classify) and field 4 (GREEN result) carries `pass`, because the green-exception RED worker executes the test-scoped body and leaves the tests green.

Field 8 is required in every report kind (an empty list is a valid value but an absent field is a malformed report). The report SHALL NOT include raw file contents, full tracebacks, or iteration logs. The report is delivered through the worker lifecycle payload (status, summary, changed_files, and the phase-defined report fields); the coordinator reconstructs the fixed field set from the payload and never from artifact contents.

#### Scenario: Non-testable Step completes cleanly

- **WHEN** a GREEN worker finishes a non-testable Step with no deviations and no STOP
- **THEN** it returns the report with Step N, per-item done statuses, RED result, GREEN=pass, empty deviations, technical learnings (empty or populated), STOP reached = no, `Files modified` = the set of paths the worker changed — and nothing else

#### Scenario: Blind RED worker reports RED with GREEN `n/a`

- **WHEN** the blind RED worker for a testable Step finishes after verifying a valid RED
- **THEN** its report sets field 3 (RED result) = `valid`, field 4 (GREEN result) = `n/a`, populates field 8 with the test/stub files it wrote or removed, and carries per-item status, deviations, learnings, and STOP as usual

#### Scenario: GREEN worker reports GREEN with RED `n/a`

- **WHEN** the GREEN worker for a testable Step finishes after verifying GREEN
- **THEN** its report sets field 4 (GREEN result) = `pass`, field 3 (RED result) = `n/a`, populates field 8 with the production files it modified, and carries per-item status, deviations, learnings, and STOP as usual

#### Scenario: Green-exception RED worker reports GREEN pass

- **WHEN** the RED worker finishes a production-free testable Step under the green-exception
- **THEN** its report sets field 3 (RED result) to the authored-test RED classification, field 4 (GREEN result) = `pass`, populates field 8 with the test/stub files it wrote, and is terminal for the Step

#### Scenario: Green-exception RED worker runs a non-testable production-free body

- **WHEN** the RED worker finishes a production-free non-testable Step under the green-exception
- **THEN** its report sets field 3 (RED result) = `n/a` (no RED block exists), field 4 (GREEN result) = `pass`, populates field 8 with the test/stub files it touched, and is terminal for the Step

#### Scenario: RED dispatch declares a removed retired file

- **WHEN** the blind RED worker removes a plan-named retired test file under the bounded retirement exception
- **THEN** field 8 declares that exact repository-relative path alongside any written or created paths, so the coordinator's add-list union and Subagent↔git comparison observe the removal

#### Scenario: Worker stops at a STOP & COMMIT

- **WHEN** a worker's Step reaches a STOP & COMMIT
- **THEN** the report sets "STOP reached? = yes" and includes the exact marker message, alongside the other fields for the work completed up to the STOP

#### Scenario: RED check is invalid

- **WHEN** the RED worker's RED verification either already passes or fails for a non-assertion reason
- **THEN** the report's field 3 (RED result) records `passes` or `wrong-failure` (with the error type), so the coordinator can act on the invalid RED rather than dispatching the GREEN worker

#### Scenario: Worker modifies no non-scratch files

- **WHEN** a worker executes a Step that produces no non-scratch file changes, whether or not it used declared scratch
- **THEN** the report's `Files modified` field is an empty list, not absent; the report remains an 8-field report and the coordinator cross-checks against an empty set

#### Scenario: Scratch paths are excluded from field 8

- **WHEN** a worker creates or modifies `.tmp/{change-name}/notes.txt` and `src/feature.ts` during a clean dispatch
- **THEN** field 8 contains `src/feature.ts` but does not contain `.tmp/{change-name}/notes.txt`, so the coordinator's pre-commit add-list cannot target the scratch path

#### Scenario: Worker omits field 8

- **WHEN** a worker returns a report without `Files modified`
- **THEN** the coordinator treats the report as malformed per `apply-pre-commit-file-report` and surfaces the omission to the user before any commit is proposed

#### Scenario: Report arrives through the lifecycle payload

- **WHEN** a Step-execution worker returns its terminal lifecycle payload
- **THEN** the coordinator reconstructs the 8 report fields from the payload's phase-defined report data and `changed_files`, and no field is read from artifact contents
- **AND** field 8 (`Files modified`) and the payload's `changed_files` are the same scratch-free path set, so the union and the pre-commit add-list cannot target `.tmp/{change-name}/`

### Requirement: Apply report rides a phase-defined payload extension

The shared worker lifecycle payloads (`sai/orchestration/worker-core.md` closed outcomes: `completed`, `needs_input`, `failed`, `cancelled`, plus notice and progress) carry only `status`, `summary`, `changed_files`, and post-resolution `resolved_change_name` — they have no slot for the 8 report fields. The apply phase adapter SHALL therefore define a phase-specific report extension to the worker lifecycle payload: the `completed` and `failed` outcomes of the RED and GREEN Step-execution workers SHALL carry the apply report (the 8 fields of `apply-subagent-report-contract`) as phase-defined payload data alongside the closed lifecycle fields. `sai/orchestration/worker-core.md` SHALL be amended to admit this phase-adapter-defined apply report extension — the same additive-extension mechanism the progress event already uses — and the report data SHALL be defined only in the apply phase adapter, never in the neutral protocol. The coordinator SHALL read the report from that payload extension and SHALL NOT read it from artifact contents.

#### Scenario: worker-core admits the apply report extension

- **WHEN** `sai/orchestration/worker-core.md` is read after this change lands
- **THEN** it admits phase-adapter-defined payload extensions such as the apply report, without giving the neutral protocol any apply-specific field names

#### Scenario: completed outcome carries the report data

- **WHEN** a RED or GREEN worker returns `completed`
- **THEN** its payload carries the closed lifecycle fields plus the phase-defined apply report (the 8 fields), and the coordinator reads the report from that extension

#### Scenario: failed outcome carries the report data

- **WHEN** a RED or GREEN worker returns `failed`
- **THEN** its payload carries the closed lifecycle fields plus the phase-defined apply report where available, so the coordinator can classify the failure with report evidence

### Requirement: Apply retires the Execution Telemetry appendix and field 9

The apply report SHALL carry no `Attempts per phase` field, and the `/sai-4-apply` coordinator SHALL NOT write a `## Appendix: Execution Telemetry` section into `implementation.md`. The only appendix apply writes is `## Appendix: Plan vs Final Implementation`, created once on its first entry. It SHALL hold one block per field-5 deviation and one block per plan amendment, the latter titled `### Step N — Plan amended: <path>`. A plan that already carries `## Appendix: Execution Telemetry` SHALL keep that section untouched: apply neither migrates nor deletes it.

#### Scenario: Worker report has no field 9
- **WHEN** a RED or GREEN worker finishes a Step
- **THEN** its report carries exactly the eight fields of `apply-subagent-report-contract` and no attempts-per-phase entry

#### Scenario: Apply writes no telemetry table
- **WHEN** the coordinator closes a Step in a plan with no `## Appendix: Execution Telemetry` section
- **THEN** `implementation.md` gains no such section, and only a field-5 deviation or a plan amendment may add an entry to `## Appendix: Plan vs Final Implementation`

#### Scenario: In-flight plan keeps its existing telemetry section
- **WHEN** a plan already contains `## Appendix: Execution Telemetry` when apply runs
- **THEN** apply leaves that section as it is, appends no row to it, and does not delete it
