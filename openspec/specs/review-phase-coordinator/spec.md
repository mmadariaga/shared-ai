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

#### Scenario: Copilot starts review
- **WHEN** the command catalog is read
- **THEN** no `/sai-5-review` command exists, so Copilot has no review entrypoint under that name to start

### Requirement: Review invocation envelope preserves both positional arguments

The coordinator SHALL parse `arguments_value` into the optional change name and the optional `--parent-branch <branch>` option, drop `--fast-track` tokens, and reject an unknown option, a second positional value, or an option without its value before any dispatch. It SHALL pass the change name and the parent branch to the review worker in the task message.

#### Scenario: Routed review receives a parent branch
- **WHEN** the user invokes `/sai-4-review my-change --parent-branch develop`
- **THEN** the task message to the review worker names `my-change`, the parent branch `develop`, and the path `openspec/changes/my-change/review.md`

### Requirement: Review lifecycle results are closed and validated

The coordinator SHALL validate every worker result before acting on it. A result SHALL be either `event: step-done` with a `step_id` of `establish-diff-scope` or `resolve-review-analysis`, or a terminal `status` of `completed`, `no-changes`, or `failed`, with a string `summary` and string-list `changed_files`. A `completed` result SHALL also carry `review_path`, `counts`, and `recommended_audits`.

#### Scenario: Worker returns a malformed result
- **WHEN** a worker result has an unknown status, missing required field, or wrong field type
- **THEN** the coordinator treats it as an obstacle of the run and applies the obstacle budget, and it does not invent missing payload data

#### Scenario: Worker requests change selection
- **WHEN** a review worker result is read
- **THEN** the review lifecycle defines no `needs_input` status, so no change-selection picker is presented from it

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

After a `completed` worker result, the coordinator SHALL verify `review.md`, commit it through its own contract, and print the worker-authored `summary` verbatim. That summary SHALL contain severity counts, top three Critical findings when present, report path, parent-branch statement, and the `## Recommended Audits` block with all three audit lines. The coordinator SHALL never parse, split, reconstruct, or recompose the summary or its audit block. It SHALL then print the exact review completion boundary, `Review done.`, and stop without presenting an artifact-feedback gate.

#### Scenario: Review completes
- **WHEN** the worker returns `completed` and the report verifies
- **THEN** the coordinator prints the worker-authored summary verbatim, including all three recommended-audit lines
- **AND** it prints `Review done.`
- **AND** it adds no findings and starts no other lifecycle phase

#### Scenario: Review fails
- **WHEN** the worker returns `failed`
- **THEN** the coordinator prints the supplied summary, ends with no closing line, and commits nothing

#### Scenario: Review fails or is cancelled
- **WHEN** the worker returns `failed`
- **THEN** the coordinator prints the supplied summary, ends with no closing line, and commits nothing
- **AND** no `cancelled` status exists in the review result contract, so no cancellation branch is printed

#### Scenario: Review finds no changes
- **WHEN** the worker returns `no-changes`
- **THEN** the coordinator prints the summary, writes and commits nothing, and ends with `Review done.`
