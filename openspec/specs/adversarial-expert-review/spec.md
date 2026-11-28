# adversarial-expert-review Specification

## Purpose

Provide an independent, adversarial review of a product at the one checkpoint where it is complete and about to settle, with a worker that finds defects against the approved scope and corrects the ones it may correct, and a coordinator that keeps or reverts each correction.

## Requirements

### Requirement: Pinned adversarial expert reviewer worker

The system SHALL provide the routed worker `sai-adversarial-expert-review-worker`, with its contract at `sai/commands/adversarial-expert-review/worker.md`, pinned in the worker matrix under the phase `expert-review` with the binding stem `adversarial-expert-review`, and materialized for Claude Code and opencode.

#### Scenario: Managed roster materialization

- **WHEN** the installer expands the worker matrix for either harness
- **THEN** it SHALL produce fifteen worker bindings and fifteen managed agent files, including the adversarial expert reviewer binding and agent.

### Requirement: Expert capability profile without delegation

The `worker-expert` capability profile SHALL grant the reviewer read, edit, write, and shell access for read-only verification and `transfer.js`, and SHALL grant no subagent dispatch.

#### Scenario: Reviewer write scope

- **WHEN** the reviewer corrects a product
- **THEN** it SHALL write only its allowed write paths, the corrected-document copies in its report directory, and its own report, and it SHALL dispatch no subagent.

### Requirement: Closed reviewer report shape

A `completed` report of the reviewer SHALL carry the closed `findings` list, which MAY be empty, and, in document mode only, `corrected_documents`; each finding SHALL carry `identifier`, `severity`, `location`, `issue`, and `correction`, an optional `paths` list, and a severity of exactly `High`, `Medium`, or `Low`.

#### Scenario: Invalid severity

- **WHEN** a report carries a finding whose severity is outside `High`, `Medium`, and `Low`
- **THEN** `worker-report-validator.js validate --command adversarial-expert-review` SHALL reject the report with an error naming the finding and the closed severity set.

### Requirement: Document-mode review of change documents

The explore checkpoint SHALL review every change document of the crystallized set in document mode: the coordinator SHALL export each document with its hash, and the worker SHALL verify each file against its hash before reviewing it and SHALL return a corrected copy only when `change-document.js check` answers `ok: true` and `dispatchable: true`.

#### Scenario: Corrected copy fails the document check

- **WHEN** a corrected copy fails `change-document.js check`
- **THEN** the correction SHALL be discarded without amending the stored document, and the finding SHALL count as discarded in the closing report.

### Requirement: Mutations-mode review with snapshot revert

The plan and build checkpoints SHALL review working-tree paths in mutations mode, take a `review-delta.js snapshot` before the dispatch, and revert every discarded correction with `review-delta.js restore`, which SHALL write the named paths back to their snapshot content, remove the paths the snapshot does not hold, and leave the index untouched.

#### Scenario: Discarded correction restores earlier work

- **WHEN** a correction is discarded while the user modified unrelated files before the dispatch
- **THEN** the named paths SHALL return to their snapshot content, a path the worker created SHALL be removed, and every other working-tree file and the staging SHALL stay unchanged.

### Requirement: All-or-nothing verification of kept corrections

The coordinator SHALL re-run the checks and tests the command names over the kept corrections, and when one fails it SHALL revert every worker change from the before-snapshot so that the product equals its state before the checkpoint.

#### Scenario: Kept correction fails a test

- **WHEN** a kept correction fails a check or a test
- **THEN** the coordinator SHALL revert every worker change and state in one line which check or test failed.

### Requirement: Checkpoint positions in the three commands

`/sai-explore` SHALL run the checkpoint after it prints the crystallized documents and before round 1 of its pre-route actions; `/sai-plan` SHALL run it inside the design segment after that segment's review rounds and before its two commits; and `/sai-build` SHALL run it after the last implementation segment that ran and before the decision records, the change telemetry, and the publication.

#### Scenario: Build checkpoint placement

- **WHEN** a `/sai-build` run holds an `auto` or an `ask` expert review answer
- **THEN** the checkpoint SHALL run after the last implementation segment that ran and before the decision records, the telemetry, and the publication.

### Requirement: Production-only corrections in the build checkpoint

In the build checkpoint the coordinator SHALL pass the production files the change modifies against its change base, test files excluded, as the product and the allowed write paths, and a finding about a missing or weak test SHALL be reported without a correction.

#### Scenario: Correction touches a test file

- **WHEN** the reviewer changes a test file during the build checkpoint
- **THEN** the change SHALL be reverted and reported, the finding SHALL count as discarded, and no test file SHALL change.

### Requirement: Agent-facing text review

When the product is, or contains, text an agent will read, the reviewer SHALL load the `writing-for-agents` skill through the harness skill mechanism and review that text against it, and when the skill is unavailable it SHALL say so in one line of its `summary` and continue.

#### Scenario: Skill unavailable

- **WHEN** the reviewer cannot load the `writing-for-agents` skill
- **THEN** it SHALL name that absence in one line of its `summary` and continue the review.

### Requirement: Closing report of the checkpoint

The run SHALL report the checkpoint with one line per kept correction and its reason, one line per discarded correction and its reason, one line per finding reported without a correction, the scope observations when any were reported, and one line when the worker report was missing, invalid, or failed, after which the run SHALL continue as after a `no` answer; a review with no findings SHALL be reported as `Expert review: no findings.` with no findings list, no reconciliation question, no summary line, and no commit.

#### Scenario: Reviewer report missing or failed

- **WHEN** the reviewer's report is missing, invalid, or failed
- **THEN** the run SHALL print one line naming that outcome and continue as after a `no` answer.

### Requirement: Findings stay out of the repository

The checkpoint SHALL write no repository report file, and a command's own review artifact SHALL stay as its review segment wrote it.

#### Scenario: Build checkpoint corrections

- **WHEN** the build checkpoint keeps corrections after `review.md` was written
- **THEN** `review.md` SHALL stay unchanged and the closing report SHALL state that the corrections are absent from it.

### Requirement: Direct Build checkpoint position and product

The Direct Build checkpoint SHALL run at `step-2c`, after the Step 2b suite gate and before the Step 3 backfill preparation, inside the run's first no-commit guard window, and only when the resolved answer is `auto`. Its mode SHALL be mutations, and its product and allowed write paths SHALL be the production files of the run's first-seen changed-path union, excluding test files and every path of the dirty git state recorded before the implementer dispatch that the run did not change. A write outside the product SHALL be reverted and reported.

#### Scenario: Placement between suite gate and backfill

- **WHEN** the Step 2b suite gate is green or skipped and the resolved expert review answer is `auto`
- **THEN** the checkpoint runs at `step-2c`, before the Step 3 staging and backfill preparation.

#### Scenario: Test file excluded from the product

- **WHEN** the reviewer changes a test file during the Direct Build checkpoint
- **THEN** the change is reverted and reported, and the finding counts as discarded.

### Requirement: Direct Build checkpoint verification and commit rule

After kept corrections, the Direct Build checkpoint SHALL run once the tests `test-select.js` selects for the corrected paths under `sai/policies/test-execution.md`, and only a new failure against the Step 2b classification SHALL count; a flaky or pre-existing failure SHALL NOT, and with no test suite found no test SHALL be rerun. The checkpoint SHALL create no commit, no guard window, and no commit grant, and its kept corrections SHALL stay in the working tree for the archive step's commit.

#### Scenario: Kept correction fails a new test

- **WHEN** a kept correction produces a test failure that the Step 2b classification did not record as flaky or pre-existing
- **THEN** every worker change is reverted, one line reports the failing test, and the route continues as after `no`.

### Requirement: Direct Build checkpoint answer recording

The Direct Build run SHALL record the resolved answer as `expert_review` and the handled checkpoint as `expert_review_checkpoint` (`done`, or `skipped` when it ran nothing) in `direct-build-run@1` on the explore route, and in the conversation for `/sai-direct-build`. A resumed run SHALL reuse the recorded answer and SHALL NOT run the checkpoint twice.

#### Scenario: Resumed run reuses the recorded checkpoint

- **WHEN** a resumed Direct Build run finds `expert_review_checkpoint` recorded as `done`
- **THEN** it does not run the checkpoint again, and the kept corrections already on disk travel in the archive commit.

### Requirement: Auto-mode findings summary

In `auto` mode, once every finding is decided and before a discarded correction is reverted or a stored document is amended, the coordinator SHALL print one summary line with two counts per severity: the findings the review returned and the findings whose corrections the decision keeps, for example `Expert review: reported High=1 Medium=2 Low=0; accepted High=1 Medium=0 Low=0`. A kept correction that verification later reverts, and a corrected copy that is later discarded, SHALL be named in the closing report. A review with no findings SHALL print no summary line.

#### Scenario: Auto decision reports its counts

- **WHEN** an `auto` checkpoint decides every finding
- **THEN** it SHALL print one summary line with the reported and accepted counts per severity before a discarded correction is reverted or a stored document is amended.
