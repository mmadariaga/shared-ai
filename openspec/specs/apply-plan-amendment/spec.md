# apply-plan-amendment Specification

## Purpose
Define how the `/sai-4-apply` coordinator corrects a defective planning artifact inside a run, so that a plan defect is resolved and traced instead of blocking the run.

## Requirements

### Requirement: The coordinator amends a defective planning artifact inside the run

When apply finds that the verified work is right and a planning artifact is wrong, the `/sai-4-apply` coordinator SHALL correct the artifact and continue the run. The amendable artifacts SHALL be exactly `tasks.md`, `interfaces.md`, `proposal.md`, and `design.md` of the active change. The edit SHALL be the smallest one that makes the artifact true to the verified work: a file the Step changed and the plan omits is added to the Step's `**Files Affected**` with its existence-derived token, a declared file the Step left unchanged is removed, and another defect is corrected the same way. The flow SHALL live in `sai/commands/apply/steps/plan-amendment.md`, which the coordinator and runner cards reach through a conditional pointer.

#### Scenario: Step changed a file its list does not declare
- **WHEN** a Step's verify passes and `close` reports `DEVIATION` with an `Extra` path
- **THEN** the coordinator adds that path to the Step's `**Files Affected**` in `tasks.md` and repeats the refused call

#### Scenario: Declared file was not changed
- **WHEN** a Step's verify passes and `close` reports `DEVIATION` with a `Missing` path
- **THEN** the coordinator removes that entry from the Step's `**Files Affected**` and repeats the refused call

#### Scenario: Branch file is not loaded on an ordinary run
- **WHEN** a run finds no plan defect
- **THEN** the coordinator never fetches `sai/commands/apply/steps/plan-amendment.md`

### Requirement: Amendment triggers name their qualifying evidence

An amendment SHALL start only from one of three triggers. At run start: a preflight error in `tasks.md` whose reason starts `Files Affected omits a path the plan names`. At verify: every Step command passes, `failures`, `unreported`, `only_in_subagent`, and `preservation_errors` are empty, and every `out_of_allowed` path is a production file the worker reported that the Step needs and that neither `implementation.md` nor `tasks.md` names. At close: a `DEVIATION` letter after a passing verify whose cross-check lists `Extra` or `Missing` paths. Every other finding SHALL follow its ordinary handling. An amendment MUST NOT legitimize what a worker's role forbids.

#### Scenario: GREEN worker touched a test file
- **WHEN** a GREEN dispatch's verify lists a test file in `out_of_allowed`
- **THEN** the result is a verification failure that goes to recovery and no amendment is made

#### Scenario: Omitted production file found at verify
- **WHEN** verify fails only because a reported production file the Step needs is named by neither `implementation.md` nor `tasks.md`
- **THEN** the coordinator amends the plan and spends no recovery attempt

### Requirement: Amendment authority follows the fast-track signal

The coordinator SHALL read `fast_track_active` to decide who authorizes an amendment. When it is active, including every `/sai-build` run, the coordinator SHALL amend on its own. When it is inactive, the coordinator SHALL show the discrepancy and the exact edit and ask `Amend the plan as shown?` through the native picker with the options `Amend` (`amend-plan`) and `Stop the run` (`stop-run`). The same rule SHALL apply to all four amendable artifacts.

#### Scenario: Fast-track is active
- **WHEN** a qualifying trigger fires while `fast_track_active` is true
- **THEN** the coordinator amends the artifact without asking and prints the amendment notice

#### Scenario: User declines the amendment
- **WHEN** fast-track is inactive and the user selects `stop-run`
- **THEN** the run stops with the current stop report and the working tree is left as it is

### Requirement: Every amendment leaves a trace

For each amended path the coordinator SHALL print exactly one line `> PLAN AMENDED: <path> — Step N — <reason>`. It SHALL write one block in `implementation.md` under `## Appendix: Plan vs Final Implementation` titled `### Step N — Plan amended: <path>`, with the original content under **Plan:**, the amended content under **Final:**, and the discrepancy under **Reason:**. The amended artifact SHALL be committed with the Step that motivated it, and the commit message SHALL carry one body line `Plan amended: <path> — <reason>` per artifact. When `tasks.md` changed, the coordinator SHALL regenerate the design File Manifest with `file-manifest.js fold`, and `design.md` SHALL join the same amendment.

#### Scenario: tasks.md is amended
- **WHEN** the coordinator amends `tasks.md` for Step N
- **THEN** it runs `file-manifest.js fold`, prints one `> PLAN AMENDED:` line per amended path, writes the appendix block, and the Step's commit contains the amended artifacts

#### Scenario: Commit is declined after an amendment
- **WHEN** the user declines the commit of a Step that carries an amendment
- **THEN** the amended artifacts stay in the working tree for the next Step that closes and the declined-commit message names them

### Requirement: Only the coordinator amends, through a registered receipt

Workers SHALL NOT amend the plan. The coordinator SHALL register each mid-run amendment with `apply-step.js checkpoint-plan`, SHALL require its `registers` list to name exactly the artifacts it edited, and SHALL pass the returned reference as `--plan-checkpoint` to the repeated call. A run-start amendment SHALL precede the baseline capture and SHALL be declared with one `amended: <path>` line per artifact on the baseline's stdin instead of a receipt. Delta specs, `change-overview.md`, and `.openspec.yaml` SHALL stay outside amendment.

#### Scenario: Worker declares a planning artifact in its own Step
- **WHEN** a worker edits `tasks.md` and the Step's `**Files Affected**` declares it
- **THEN** the edit is an error because no coordinator receipt registers it

#### Scenario: Omitted path found as apply starts
- **WHEN** the run-start preflight reports only omitted-path errors in `tasks.md`
- **THEN** the coordinator amends before capturing the baseline, declares each amended artifact with an `amended:` line, and runs preflight again

### Requirement: Amendments are bounded

The coordinator SHALL make one amendment per discrepancy. When the repeated call is still refused, it SHALL stop with the stop report and make no second automatic attempt. An amendment SHALL affect only the Steps that follow: closed Steps SHALL be neither reopened nor re-verified. The baseline and run identity SHALL stay as captured, and the coordinator SHALL amend only while `preservation_errors` is empty.

#### Scenario: Close is refused again after the amendment
- **WHEN** the repeated `close` after an amendment still returns `committed: false` for the same discrepancy
- **THEN** the run stops with the stop report and no second amendment is attempted

#### Scenario: Earlier Steps are already closed
- **WHEN** an amendment changes content that a closed Step relied on
- **THEN** the closed Step is not reopened or re-verified

### Requirement: Every refused Step commit has a defined reaction

When `close` returns `committed: false`, the coordinator's default reaction for every `reason` SHALL be to report the `reason` and `error` and stop with the stop report. Only the listed reasons SHALL differ: `guard-violation` runs the guard remediation and calls `close` again; `empty-add-list` and `nothing-to-stage` make no commit and the Step continues; `commit-failed` and `git-add-failed` report the `error` tail and decide per recovery; `invalid-message` fixes the message and calls `close` again; a file discrepancy, including its `scope-blocked` refusal, goes to plan amendment.

#### Scenario: Reason without a written reaction
- **WHEN** `close` returns `committed: false` with a reason that has no listed reaction
- **THEN** the coordinator reports the reason and error and stops with the stop report

#### Scenario: File discrepancy refusal
- **WHEN** `close` returns `scope-blocked` with a `DEVIATION` letter listing `Extra` or `Missing` paths after a passing verify
- **THEN** the coordinator follows the plan-amendment branch

### Requirement: An omitted path found when the plan is written is a design defect

When the `/sai-3-implement` delivery preflight returns an error in `tasks.md` reading `Files Affected omits a path the plan names`, the implementation worker SHALL treat it as a `sai-2` defect and resolve it through its existing defective-artifact rule.

#### Scenario: Preflight reports an omitted path at the end of planning
- **WHEN** the delivery preflight of `/sai-3-implement` returns an omitted-path error in `tasks.md`
- **THEN** the worker resolves it through the defective `sai-2` artifact rule and re-runs preflight
