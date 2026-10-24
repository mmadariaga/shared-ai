# plan-spec-design-segments Specification

## Purpose
The `/sai-1-spec` and `/sai-2-design` commands are always-unattended, goal-driven coordinators outside the shared orchestration that write or refine a change's specs and design with no human in the loop.

## Requirements

### Requirement: Spec and design coordinators load only the policies that never stop a run

The coordinators `sai/commands/spec/coordinator.md` and `sai/commands/design/coordinator.md` SHALL load only `public-chat`, `remember`, `safe-operations`, the budget skill, `tool-resolution`, the shared cycle `sai/commands/plan/cycle.md` (which loads `sai/policies/obstacle-escalation.md` for its obstacles and escalation), their worker binding, and (spec only) `ready-to-propose-format.md` and `block-hygiene-judgment.md`. They SHALL load none of `command-runner`, `worker-core`, `bounded-recovery`, `stop-options`, `unattended-runtime-recovery`, `no-commit-guard`, or `composition`, run no prerequisite check, and have no interactive mode. The `/sai-1-spec` and `/sai-2-design` wrappers for Claude Code and opencode SHALL fetch the harness `fetch` skill and the coordinator directly; `sai/commands/spec/command-bootstrap.md` and `sai/commands/design/command-bootstrap.md` SHALL NOT exist.

#### Scenario: no shared stopping contract is loaded

- **WHEN** the fetch directives of the spec and design coordinators are listed
- **THEN** none of them names `command-runner`, `worker-core`, `bounded-recovery`, `stop-options`, `unattended-runtime-recovery`, `no-commit-guard`, or `composition`

### Requirement: /sai-1-spec creates from a verified dispatchable block

`/sai-1-spec` SHALL accept a pasted Ready to Propose block or a `--block-file <path> --block-hash <sha256>` reference, exactly one block per run. Before any dispatch it SHALL verify a stored block with `ready-to-propose.js verify-file` and SHALL require `check --profile dispatchable` to report `"dispatchable": true`, judging flagged lines under `block-hygiene-judgment.md`; a failing block SHALL end the run writing nothing. Without a block and without a change that has `proposal.md` or a file under `specs/`, it SHALL print `Cannot start /sai-1-spec: creation needs a dispatchable Ready to Propose block (paste it, or pass --block-file and --block-hash), or the name of a change that already has proposal.md or specs/ followed by your feedback.` and end writing nothing. A block for a change that already has artifacts SHALL print `Cannot start /sai-1-spec for {name}: it already has artifacts. Refine it with /sai-1-spec {name} followed by your feedback.` and end writing nothing.

#### Scenario: a mismatched block hash stops before dispatch

- **WHEN** `/sai-1-spec` receives `--block-file` and `--block-hash` that do not match
- **THEN** the run ends before any worker dispatch and writes nothing

#### Scenario: no block and no change stops with the startup literal

- **WHEN** `/sai-1-spec` receives neither a block nor the name of a change with artifacts
- **THEN** it prints the creation startup literal and dispatches no worker

### Requirement: /sai-1-spec and /sai-2-design refine from feedback in the same cycle

`/sai-1-spec {name} {feedback}` on a change with `proposal.md` or specs SHALL run the same unattended cycle with the feedback as its input: worker edit, mechanical checks, review rounds, and commit. `/sai-2-design {name} {feedback}` on a change that has `design.md` SHALL do the same for the design artifacts, regenerating `tasks.md` and `interfaces.md` from the result. Feedback that does not hold against the artifacts or the code SHALL leave the artifacts unchanged for it and be named, with the reason, in the report.

#### Scenario: spec feedback runs the full cycle

- **WHEN** `/sai-1-spec {name} {feedback}` runs on a change with existing specs
- **THEN** the worker applies the feedback, the checks and review rounds run, and the segment commits its own paths

### Requirement: /sai-2-design approves the specs and requires them

`/sai-2-design` SHALL be startable only when the change has `proposal.md` and at least one file under `specs/`; otherwise it SHALL print `Cannot start /sai-2-design for {name}: missing {list of the absent items}. Run /sai-1-spec first.` and end writing nothing. Invoking `/sai-2-design` or `/sai-plan` SHALL approve the specs without asking: the design worker SHALL write `approval.specs.approved_at` in `.openspec.yaml` only when it is absent or empty, and `approval.specs.notes` as an empty string only when the key is absent, preserving every other key.

#### Scenario: an existing approval is preserved

- **WHEN** `/sai-2-design` runs on a change whose `.openspec.yaml` already carries `approval.specs.approved_at`
- **THEN** the existing timestamp is kept unchanged

#### Scenario: missing specs stop design

- **WHEN** `/sai-2-design {name}` runs on a change without `proposal.md` or specs
- **THEN** it prints the design startup literal naming the absent items and `/sai-1-spec`, and dispatches no worker

### Requirement: The overview is a separate continuation sent only with --overview-lang

`/sai-2-design` SHALL accept `--overview-lang <language>` with exactly one non-empty language token; an option without a value, a value starting with `--`, or a second occurrence SHALL print `Cannot start /sai-2-design: --overview-lang takes exactly one language, as in --overview-lang Spanish.` and end. After the review ends and the checks pass, and only when the option carried a language, the coordinator SHALL send the design worker one continuation whose first line is `Follow @sai/commands/design/steps/overview.md`, to generate `change-overview.md` with no source regeneration. Without the option, no overview SHALL be generated. The overview SHALL NOT be a step of the design step machine.

#### Scenario: no option means no overview

- **WHEN** `/sai-2-design {name}` runs without `--overview-lang`
- **THEN** no overview continuation is sent and no `change-overview.md` is generated

#### Scenario: the option sends one overview continuation

- **WHEN** `/sai-2-design {name} --overview-lang Spanish` completes its review and checks
- **THEN** the coordinator sends one continuation naming `@sai/commands/design/steps/overview.md` with `overview_language` Spanish

### Requirement: Spec and design steps are delivered by spec-steps@1 and design-steps@1

The spec steps SHALL be delivered by pointer through the linear machine `spec-steps@1` with the steps `spec-intake` (inline, no file), `research`, `proposal`, `specs`, and `validation`, each filed at `sai/commands/spec/steps/{step}.md`. The design steps SHALL be delivered through `design-steps@1` with the steps `design-intake` (inline, no file), `research`, `design`, `tasks`, and `interfaces`, each filed at `sai/commands/design/steps/{step}.md`. The coordinator SHALL `reset` the machine at segment start, open the task message with the returned `Active step:` pointer, emit each report's `step_ids`, and send the next pointer, falling back to the static step order when the store fails. `spec-standalone@1`, `design-standalone@1`, and the `--with-overview` option SHALL NOT exist.

#### Scenario: design-steps@1 has no overview step

- **WHEN** the `design-steps@1` machine's `STAGE_FILES` are read
- **THEN** they map `design-intake` to `none` and `research`, `design`, `tasks`, and `interfaces` to their step files, with no `overview` entry

#### Scenario: a store failure falls back to the static order

- **WHEN** a `reset` or an emit to `spec-steps@1` fails during a spec segment
- **THEN** the coordinator sends the next pointer from the static step order and the run continues

### Requirement: Spec and design segments close with their own lines

A completed spec segment SHALL print the decision summary, the consistency warnings, the assumptions, the pending findings, the scope observations, the skipped checks, and the commit outcome, and end with exactly ``Spec done in openspec/changes/{name}/. Review it and run `/sai-2-design {name}` in a new chat when ready.`` A completed design segment SHALL print its summary, the Architecture Snapshot when this run created or changed `design.md`, the assumptions, the notices and spec corrections, the pending findings, the scope observations, the skipped checks, the overview result when asked, and the commit outcome, and end with exactly ``Design done in openspec/changes/{name}/. Run `/sai-3-implement {name}` **in a new chat** when ready.`` A segment that failed, stopped, or ended on an unanswered escalation SHALL end with its report and no closing line. Inside `/sai-plan` the plan closing line SHALL replace both.

#### Scenario: a completed spec segment prints the spec closing line

- **WHEN** `/sai-1-spec` completes on its own
- **THEN** it ends with the `Spec done in openspec/changes/{name}/.` line naming `/sai-2-design {name}`
