# implement-new-workers Specification

## Purpose
TBD - created by archiving change sai-build-new-walking-skeleton. Update Purpose after archive.

## Requirements

### Requirement: Live workers with a creation-only ready handshake

The RED and GREEN `-new` workers SHALL be created when their first step needs them and SHALL live for the whole run. The creation dispatch SHALL carry no task and the worker SHALL return exactly `event: ready` with an empty `changed_files`; every step SHALL then arrive as a continuation of the same worker (`SendMessage` to the captured agent ID on Claude Code, `task` with the captured `task_id` on opencode). A worker that returns no ready SHALL receive one corrected instruction before the obstacle rules apply.

#### Scenario: Second step reuses the worker

- **WHEN** the coordinator starts the second step of a run
- **THEN** it continues the existing RED and GREEN workers instead of dispatching new ones, and no new ready handshake runs.

### Requirement: Pointer delivery of step files

Each worker role SHALL have its own linear step machine, `red-new-steps@1` and `green-new-steps@1`, with the steps `task-intake` (no file) followed by `red-step` (`sai/commands/implement-new/steps/red-step.md`) or `green-step` (`sai/commands/implement-new/steps/green-step.md`), both registered in `sai-state/registry.js`. The coordinator SHALL reset the role's machine before each step and open every brief with `Active step: <stage> — follow <next.follow>`; when the store fails, it SHALL send the pointer from the static order itself and continue.

#### Scenario: Store failure

- **WHEN** the `sai-state` reset fails before a step
- **THEN** the coordinator sends the static pointer for the role's step file and the step continues.

### Requirement: Worker report shape

Each worker SHALL return only a report with `status` (`done` or `blocked`), `summary` of at most three sentences, `changed_files`, `test_command`, and `notes`, with no raw output, file contents, or logs. RED SHALL name the command that runs only the step's tests; GREEN SHALL repeat the command from the brief. The coordinator SHALL ask once again for a report that is missing, unparsable, or lacks `changed_files`.

#### Scenario: Blocked report

- **WHEN** a worker cannot complete its step within its allowed files
- **THEN** it returns `status: blocked` naming the obstacle, the affected path, and why its allowed files cannot absorb the fix.

### Requirement: RED and GREEN write surfaces

The RED worker SHALL write only the step's test files, the fixtures and helpers they need, interface stubs in their production files that return a null, empty, or wrong value, and existing tests the brief names; it SHALL NOT write production logic or edit `interfaces.md`. The GREEN worker SHALL write only production files the step needs and SHALL name any file beyond the brief with its reason in `notes`; it SHALL NOT modify test files, fixtures, or `interfaces.md`, including when it believes a test is wrong. Neither worker SHALL run a git command that changes the repository, edit the plan artifacts or checkboxes, run an `openspec` command, or dispatch a subagent.

#### Scenario: GREEN believes a test is wrong

- **WHEN** passing a step's test would require changing the test
- **THEN** the GREEN worker leaves the test untouched and reports `blocked` with the failing test and the contradiction, and the coordinator arbitrates.
