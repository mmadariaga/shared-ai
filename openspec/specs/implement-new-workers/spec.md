# implement-new-workers Specification

## Purpose
TBD - created by archiving change sai-build-new-walking-skeleton. Update Purpose after archive.

## Requirements

### Requirement: Live workers with a creation-only ready handshake

The RED and GREEN workers SHALL be created when their first step needs them and SHALL live for the whole run unless the coordinator replaces one. The creation dispatch SHALL carry no task and the worker SHALL return exactly `event: ready` with an empty `changed_files`; every step SHALL then arrive as a continuation of the same worker (`SendMessage` to the captured agent ID on Claude Code, `task` with the captured `task_id` on opencode). A worker that returns no ready SHALL be an obstacle under the attempt budget. A worker created to replace another SHALL receive the same creation-only handshake and a hand-over summary the coordinator wrote, which SHALL be the only account of earlier work it receives.

#### Scenario: Second step reuses the worker

- **WHEN** the coordinator starts the second step of a run
- **THEN** it continues the existing RED and GREEN workers instead of dispatching new ones, and no new ready handshake runs.

### Requirement: Pointer delivery of step files

Each worker role SHALL have its own linear step machine, `red-steps@1` and `green-steps@1`, with the steps `task-intake` (no file) followed by `red-step` (`sai/commands/implement/steps/red-step.md`) or `green-step` (`sai/commands/implement/steps/green-step.md`), both registered in `sai-state/registry.js`. The coordinator SHALL reset the role's machine before each step and open every brief with `Active step: <stage> — follow <next.follow>`; when the store fails, it SHALL send the pointer from the static order itself and continue.

#### Scenario: Store failure

- **WHEN** the `sai-state` reset fails before a step
- **THEN** the coordinator sends the static pointer for the role's step file and the step continues.

### Requirement: Worker report shape

Each worker SHALL write a report with `status` (`done` or `blocked`), `summary` of at most three sentences, `changed_files`, `test_command`, and `notes` to the report path the brief names, `reports/step-{n}-{role}-{k}.yaml` in the run directory `.tmp/{change-name}/run-*/`, creating its directory when needed, and SHALL return only that path, with no raw output, file contents, or logs. The report file SHALL be the worker's only write in the run directory and SHALL NOT be listed in `changed_files`. RED SHALL name the command that runs only the step's tests; GREEN SHALL repeat the command from the brief. The coordinator SHALL emit `record` for the report path and then read the file.

#### Scenario: Blocked report

- **WHEN** a worker cannot complete its step within its allowed files
- **THEN** it writes a report with `status: blocked` naming the obstacle, the affected path, and why its allowed files cannot absorb the fix, and returns only the report path.

### Requirement: RED and GREEN write surfaces

The RED worker SHALL write only the step's test files, the fixtures and helpers they need, interface stubs in their production files that return a null, empty, or wrong value, and existing tests the brief names; it SHALL NOT write production logic or edit `interfaces.md`. The GREEN worker SHALL write only production files the step needs and SHALL name any file beyond the brief with its reason in `notes`; it SHALL NOT modify test files, fixtures, or `interfaces.md`, including when it believes a test is wrong. Neither worker SHALL run a git command that changes the repository, edit the plan artifacts, the audit reports (`review.md`, `security.md`, `performance.md`, `accessibility.md`), the checkboxes, or the fixed marks, run an `openspec` command, or dispatch a subagent.

#### Scenario: GREEN believes a test is wrong

- **WHEN** passing a step's test would require changing the test
- **THEN** the GREEN worker leaves the test untouched and reports `blocked` with the failing test and the contradiction, and the coordinator arbitrates.

#### Scenario: GREEN fixes an audit finding

- **WHEN** GREEN completes a step that fixes an audit finding
- **THEN** it leaves the audit report and the finding's fixed mark to the coordinator

### Requirement: Audit-finding briefs

A step brief MAY carry audit findings to fix in place of plan references. When the brief carries audit findings instead of tasks, the RED worker SHALL treat the code as existing and each finding as a defect in it, and SHALL write one test per finding in its brief that asserts the corrected behavior the finding describes, fails by assertion on the current code, and names the finding's identifier in the test name. The GREEN worker SHALL read the audit findings the brief names as it reads plan references.

#### Scenario: RED receives an audit finding

- **WHEN** a RED brief carries an audit finding instead of tasks
- **THEN** RED writes a test named with the finding's identifier that fails by assertion on the current code
