# review-phase-coordinator Specification

## Purpose
TBD - created by archiving change sai-5-review-coordinator-worker-split. Update Purpose after archive.

## Requirements

### Requirement: Routed review entrypoints use a terminal-only coordinator

The Claude Code and opencode `/sai-4-review` entrypoints SHALL invoke a review coordinator and its harness-specific review-worker binding. The coordinator SHALL own lifecycle routing, the review step machine, and terminal presentation; the review worker SHALL own the diff analysis and the report.

#### Scenario: Routed harness starts review
- **WHEN** Claude Code or opencode invokes `/sai-4-review`
- **THEN** the wrapper enters the review coordinator and its matching review-worker binding
- **AND** it does not execute the inline review instruction as the coordinator's technical workflow

#### Scenario: The retired review entrypoint is absent
- **WHEN** the command catalog is read
- **THEN** no `/sai-5-review` command exists on either harness, so `/sai-4-review` is the only review entrypoint

### Requirement: Review invocation envelope preserves both positional arguments

The coordinator SHALL parse `arguments_value` into the optional change name and the optional `--parent-branch <branch>` option, drop `--fast-track` tokens, and reject an unknown option, a second positional value, or an option without its value before any dispatch. It SHALL pass the change name and the parent branch to the review worker in the task message.

#### Scenario: Routed review receives a parent branch
- **WHEN** the user invokes `/sai-4-review my-change --parent-branch develop`
- **THEN** the task message to the review worker names `my-change`, the parent branch `develop`, and the path `openspec/changes/my-change/review.md`

### Requirement: Review lifecycle results are closed and validated

The coordinator SHALL validate every worker report with `worker-report-validator.js` before it reads any field, and SHALL act on the accepted payload without reading the file again. The kind SHALL come from the file name: a report whose name starts with `progress-` SHALL be validated with `validate --kind progress`, and any other report with `validate --kind terminal --command review`. A progress report SHALL carry `event: progress`, `step_ids`, and `changed_files`. A terminal report SHALL carry a `status` of `completed` or `failed`, with a string `summary` and string-list `changed_files`; a `completed` report SHALL either carry `outcome: no-changes`, the only `outcome` the command admits, or carry `review_path`, `counts`, and `recommended_audits`. A result carried inline, including the retired `event: step-done`, SHALL be an invalid report. A `needs_input` or `cancelled` report SHALL be an obstacle of the run, because the review asks nothing and is never told to abandon. After an accepted progress report, the coordinator SHALL pass the same report file to `sai-state emit <id> review-steps@1 --progress --input-file <report file>` and send the next pointer from the response; when the emit fails, it SHALL send the next pointer from the static order. When the validator cannot be resolved, the run SHALL stop on that obstacle without interpreting the report.

#### Scenario: Worker returns a malformed result
- **WHEN** a worker report has an unknown status, an `outcome` the command does not admit, a missing required field, or a wrong field type, or arrives inline
- **THEN** the coordinator treats it as an obstacle of the run and applies the obstacle budget, and it does not invent missing payload data

#### Scenario: Worker requests change selection
- **WHEN** a review worker report carries `status: needs_input`
- **THEN** the coordinator treats it as an obstacle of the run and presents no change-selection picker from it

#### Scenario: A progress report advances the step machine
- **WHEN** the coordinator accepts the first `progress-` report, carrying `review-intake` and `establish-diff-scope`
- **THEN** it passes that same report file to `sai-state emit <id> review-steps@1 --progress --input-file <report file>` and sends the worker the next pointer from the response

### Requirement: Coordinator retries continuation before replacement

The coordinator SHALL first send a corrected instruction to the same worker. When that does not resolve the obstacle, it SHALL create a new worker that receives the ready handshake and a hand-over note naming the symptom. The obstacle budget is three attempts; an exhausted budget escalates through the native picker.

#### Scenario: Same-worker continuation fails
- **WHEN** the review worker stays silent or drifts from its instruction after a corrected instruction
- **THEN** the coordinator creates a replacement worker and does not send it the prior worker's history

#### Scenario: Replacement resumes the departing worker's active step
- **WHEN** a replacement review worker is dispatched after same-worker continuation fails
- **THEN** the review coordinator carries no `active_step_id` reconstruction field, and the replacement's first message opens with `Active step: establish-diff-scope — follow <pointer>`

#### Scenario: Replacement starts from the first step
- **WHEN** a replacement review worker is dispatched
- **THEN** its first task message opens with `Active step: establish-diff-scope — follow <pointer>`

### Requirement: Terminal output preserves the review completion boundary

After an accepted `completed` report without `outcome`, the coordinator SHALL verify `review.md`, commit it through its own contract, and print the worker-authored `summary` verbatim. That summary SHALL contain severity counts, top three Critical findings when present, report path, parent-branch statement, and the `## Recommended Audits` block with all three audit lines. The coordinator SHALL never parse, split, reconstruct, or recompose the summary or its audit block. It SHALL then print the exact review completion boundary, `Review done.`, and stop without presenting an artifact-feedback gate. After an accepted `completed` report with `outcome: no-changes`, the coordinator SHALL print the worker's summary, write no `review.md`, commit nothing, and end with `Review done.`; it SHALL decide on the `outcome` field, never on the summary text.

#### Scenario: Review completes
- **WHEN** the worker's accepted report is `completed` without `outcome` and the report verifies
- **THEN** the coordinator prints the worker-authored summary verbatim, including all three recommended-audit lines
- **AND** it prints `Review done.`
- **AND** it adds no findings and starts no other lifecycle phase

#### Scenario: Review fails
- **WHEN** the worker's accepted report is `failed`
- **THEN** the coordinator prints the supplied summary, ends with no closing line, and commits nothing

#### Scenario: Review fails or is cancelled
- **WHEN** the worker's accepted report is `failed`
- **THEN** the coordinator prints the supplied summary, ends with no closing line, and commits nothing
- **AND** a `cancelled` report is an obstacle of the run, so no cancellation branch is printed

#### Scenario: Review finds no changes
- **WHEN** the worker's accepted report is `completed` with `outcome: no-changes`
- **THEN** the coordinator prints the summary `No changes detected against {parent-branch}. Nothing to review.`, writes and commits nothing, and ends with `Review done.`

### Requirement: The review coordinator opens one report directory per run

Before it creates the review worker, the coordinator SHALL open the report directory of the run with `transfer.js open --harness <claude|opencode>` and keep the returned path in the conversation as the run's only memory of it. When the directory cannot be opened, the coordinator SHALL print the tool's error and end the run before any dispatch, writing nothing. The first task message to the worker, a replacement's included, SHALL open with `--report-dir <report directory>`, and no later message SHALL carry it. A run that ended with `Review done.` SHALL close the report directory with `transfer.js close`; a failed, stopped, or unanswered run SHALL keep it.

#### Scenario: The task message carries the report directory

- **WHEN** the coordinator discloses the task to a new review worker
- **THEN** the task message opens with `--report-dir <report directory>`, followed by the `Active step: establish-diff-scope` pointer line

#### Scenario: A failed run keeps its report directory

- **WHEN** the review run ends on an accepted `failed` report
- **THEN** the coordinator disposes the worker and keeps the report directory
