# implement-new-workers Specification

## Purpose
TBD - created by archiving change sai-build-new-walking-skeleton. Update Purpose after archive.

## Requirements

### Requirement: Live workers with a creation-only ready handshake

The RED and GREEN workers SHALL be created when their first step needs them and SHALL live for the whole run unless the coordinator replaces one. The creation dispatch SHALL carry no task and the worker SHALL return exactly `event: ready` with an empty `changed_files`; every step SHALL then arrive as a continuation of the same worker (`SendMessage` to the captured agent ID on Claude Code, `subagent` with the same `agent` used at creation, the captured `sessionID`, and `background: true` on opencode). A worker that returns no ready SHALL be an obstacle under the attempt budget. A worker created to replace another SHALL receive the same creation-only handshake and a hand-over summary the coordinator wrote, which SHALL be the only account of earlier work it receives.

#### Scenario: Second step reuses the worker

- **WHEN** the coordinator starts the second step of a run
- **THEN** it continues the existing RED and GREEN workers instead of dispatching new ones, and no new ready handshake runs.

### Requirement: Pointer delivery of step files

Each worker role SHALL have its own linear step machine, `red-steps@1` and `green-steps@1`, with the steps `task-intake` (no file) followed by `red-step` (`sai/commands/implement/steps/red-step.md`) or `green-step` (`sai/commands/implement/steps/green-step.md`), both registered in `sai-state/registry.js`. The coordinator SHALL reset the role's machine before each step and open every brief with `Active step: <stage> — follow <next.follow>`; when the store fails, it SHALL send the pointer from the static order itself and continue.

#### Scenario: Store failure

- **WHEN** the `sai-state` reset fails before a step
- **THEN** the coordinator sends the static pointer for the role's step file and the step continues.

### Requirement: Worker report shape

Each worker SHALL compose a report with `status` (`completed`, `needs_input`, `failed`, or `cancelled`), `summary` of at most three sentences, `changed_files`, `test_command`, and `notes`, and a `needs_input` report SHALL add `question` and `options` (`{label, value}` items). The worker SHALL write the report to a unique draft file in the run directory the brief names, which lies outside the repository under the SAI temp root, save it with `transfer.js put --dir <report-dir> --path <report name>.yaml --input-file <draft>` in the report directory its first task message named, and SHALL return only the `{path, sha256}` that `put` prints as its final message, with the `warming: true|false` line of `@sai/policies/cache-warming.md` beside it when a warming line reached it, and with no raw output, file contents, logs, or inline result. Scratch and the report draft SHALL stay in the run directory, and neither the draft nor the saved report SHALL be listed in `changed_files`. The retired `done` and `blocked` statuses SHALL NOT be used. RED SHALL name the command that runs only the step's tests; GREEN SHALL repeat the command from the brief. The `worker-write` capability profile SHALL grant the `transfer.js put` call on both Claude Code and opencode.

#### Scenario: Blocked report

- **WHEN** a worker cannot complete its step within its allowed files because only the coordinator can settle a decision the step depends on
- **THEN** it saves a report with `status: needs_input` naming the obstacle, the affected path, and why its allowed files cannot absorb the fix, with the ways forward as `options`, and returns only the report reference with no report content.

### Requirement: RED and GREEN write surfaces

The RED worker SHALL write only the step's test files, the fixtures and helpers they need, interface stubs in their production files that return a null, empty, or wrong value, and existing tests the brief names; it SHALL NOT write production logic or edit `interfaces.md`. The GREEN worker SHALL write only production files the step needs and SHALL name any file beyond the brief with its reason in `notes`; it SHALL NOT modify test files, fixtures, or `interfaces.md`, including when it believes a test is wrong. Neither worker SHALL run a git command that changes the repository, edit the plan artifacts, the audit reports (`review.md`, `security.md`, `performance.md`, `accessibility.md`), the checkboxes, or the fixed marks, run an `openspec` command, or dispatch a subagent.

#### Scenario: GREEN believes a test is wrong

- **WHEN** passing a step's test would require changing the test
- **THEN** the GREEN worker leaves the test untouched and reports `needs_input` with the failing test and the contradiction, and the coordinator arbitrates.

#### Scenario: GREEN fixes an audit finding

- **WHEN** GREEN completes a step that fixes an audit finding
- **THEN** it leaves the audit report and the finding's fixed mark to the coordinator

### Requirement: Audit-finding briefs

A step brief MAY carry audit findings to fix in place of plan references. When the brief carries audit findings instead of tasks, the RED worker SHALL treat the code as existing and each finding as a defect in it, and SHALL write one test per finding in its brief that asserts the corrected behavior the finding describes, fails by assertion on the current code, and names the finding's identifier in the test name. The GREEN worker SHALL read the audit findings the brief names as it reads plan references.

#### Scenario: RED receives an audit finding

- **WHEN** a RED brief carries an audit finding instead of tasks
- **THEN** RED writes a test named with the finding's identifier that fails by assertion on the current code

### Requirement: The implement coordinator receives RED and GREEN reports through the shared transport

The `/sai-3-implement` coordinator SHALL open one report directory per run with `transfer.js open --harness <claude|opencode>` and SHALL record it in `implement-run@1` with the `record` kind `report-dir`; when it cannot be opened, the run SHALL end writing nothing more. The first task message to each RED and GREEN worker, a replacement included, SHALL open with the line `--report-dir <report directory>`, and later messages to that worker SHALL leave it out. For every response after ready, the coordinator SHALL run `worker-report-validator.js validate --kind terminal --command implement --json --report-dir <report directory> --report-file <path> --report-hash <sha256>` before reading any field and SHALL act on the accepted payload without reading the file again. A resumed run SHALL reuse the report directory the store names, opening a new one when it is gone. A completed run SHALL close the report directory with `transfer.js close` together with the run directory removal; a stopped, blocked, or unanswered run SHALL keep it.

#### Scenario: A replacement worker reuses the report directory

- **WHEN** the coordinator replaces a RED or GREEN worker during a run
- **THEN** the replacement's first task message opens with the same `--report-dir` line the run recorded

#### Scenario: A report is validated before use

- **WHEN** a RED or GREEN worker returns a report reference
- **THEN** the coordinator validates it with `--command implement` and reads no field of a report the validator did not accept

### Requirement: The implement coordinator answers RED and GREEN questions

The implement coordinator SHALL treat a `completed` report as the close of the worker's stretch, and a `failed` or `cancelled` report as an obstacle of the step. It SHALL answer a `needs_input` report without a human in the loop: from the change's artifacts or the repository when they answer it, otherwise with the most conservative reading when the answer would not change the code, appending the question, the answer, and its source to `deviations.md` and continuing the same worker with the answer on the step's pointer line and a new report name. When nothing answers it and the answer would change the code, the question SHALL be force majeure and SHALL escalate through the native picker with the worker's options. A question the answer settles SHALL spend no attempt.

#### Scenario: A question the plan answers

- **WHEN** RED reports `needs_input` about a contradiction that `interfaces.md` resolves
- **THEN** the coordinator answers from `interfaces.md`, records the answer as a deviation, and continues the same worker without escalating or spending an attempt
