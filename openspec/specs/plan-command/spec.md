# plan-command Specification

## Purpose
The `/sai-plan` command turns a crystallized Ready to Propose block into the full plan of a change in one unattended run, by chaining the `/sai-1-spec` and `/sai-2-design` segments.

## Requirements

### Requirement: /sai-plan chains the spec and design segments in one session

`/sai-plan` SHALL follow `sai/commands/spec/coordinator.md` and then `sai/commands/design/coordinator.md` as segments in one session, in the shape `/sai-build` uses for implement and review, without loading `composition.md` or `command-runner.md`. It SHALL accept a pasted Ready to Propose block, a `--block-file <path> --block-hash <sha256>` reference, or the name of a change, plus the optional `--overview-lang <language>`, which it passes to the design segment, and the optional `--publish yes|no`, which answers its publication question. No wrapper SHALL be entered again and no approval SHALL be asked between segments or after the publication answer; the artifacts on disk SHALL be the only interface between the segments. Invoking `/sai-plan` SHALL approve the specs. The Claude Code wrapper `commands/claude/sai-plan.md` and the opencode wrapper `commands/opencode/sai-plan.md` SHALL load the harness `fetch` skill and `sai/commands/plan/coordinator.md` directly, with no boot adapter and no `command-bootstrap.md`.

#### Scenario: a block runs both segments

- **WHEN** `/sai-plan` receives a dispatchable block for a change with no `proposal.md` and no specs
- **THEN** the spec segment runs first and the design segment starts only after the spec segment completed

#### Scenario: both harness wrappers load the coordinator directly

- **WHEN** `commands/claude/sai-plan.md` or `commands/opencode/sai-plan.md` is read
- **THEN** it fetches the harness `fetch` skill and `@sai/commands/plan/coordinator.md` and fetches no boot adapter and no `command-bootstrap.md`

### Requirement: Existing proposal and specs win over a block

`/sai-plan` SHALL decide which segments run from what `openspec/changes/{name}/` holds. When both `proposal.md` and a file under `specs/` exist, the spec segment SHALL count as done, a supplied block SHALL NOT rewrite them, and the report SHALL say so. When neither exists and the input is a change name, `/sai-plan` SHALL print `Cannot start /sai-plan for {name}: missing proposal.md and specs/. Pass the Ready to Propose block to create them.` and end writing nothing. When only one of them exists, it SHALL print `Cannot start /sai-plan for {name}: missing {the absent item}. Complete it with /sai-1-spec {name} followed by your feedback, then run /sai-plan {name}.` and end writing nothing. When the input holds neither a block nor a name, it SHALL print `Cannot start /sai-plan: pass a Ready to Propose block (paste it, or use --block-file and --block-hash), or the name of a change that already has proposal.md and specs/.` and end writing nothing.

#### Scenario: specs on disk count as a done spec segment

- **WHEN** `/sai-plan` receives a block for a change that already has `proposal.md` and a spec file
- **THEN** the spec segment counts as done, the specs are not rewritten, and the design segment runs

#### Scenario: a partly present change stops before any dispatch

- **WHEN** `/sai-plan {name}` runs on a change that has `proposal.md` but no file under `specs/`
- **THEN** it prints the partly-present startup literal naming `/sai-1-spec {name}` and dispatches no worker

### Requirement: A segment that does not complete stops the plan run

When the spec segment fails, is stopped, or ends on an escalation the user did not resolve, `/sai-plan` SHALL print that segment's report, SHALL NOT start the design segment, and SHALL end with no closing line. Review findings still pending after the third review round SHALL NOT stop the run: the design segment SHALL start over the specs with those findings listed in the closing report. A change left with specs and no design SHALL continue with `/sai-2-design {name}` or another `/sai-plan {name}`.

#### Scenario: a stopped spec segment does not start design

- **WHEN** the spec segment of a `/sai-plan` run ends stopped
- **THEN** the design segment does not start and the run ends with the spec report and no closing line

#### Scenario: pending spec findings do not stop design

- **WHEN** the spec segment completes with findings still pending after its third review round
- **THEN** the design segment starts and the closing report lists the pending findings

### Requirement: /sai-plan closes with its own line

When both segments completed, or the spec segment counted as done and the design segment completed, `/sai-plan` SHALL replace each segment's closing line with its own, say which artifacts were created, and close the planning report with exactly ``Plan done in openspec/changes/{name}/. Review it and run `/sai-build {name}` in a new chat when ready.`` This literal SHALL close the planning report, not the command interaction. A run with a `yes` publication answer SHALL publish before this literal, and the run SHALL close after it. The command SHALL stop before implementation.

#### Scenario: a completed plan prints the plan closing line
- **WHEN** both segments of a `/sai-plan` run complete
- **THEN** the planning report closes with the `Plan done in openspec/changes/{name}/.` line naming `/sai-build {name}`, any publication of a `yes` answer has already run, the planning run closes, and no implementation is dispatched.

### Requirement: Plan commands accept and ignore fast-track and supervised

`/sai-1-spec`, `/sai-2-design`, and `/sai-plan` SHALL drop every `--fast-track` and `--supervised` token from their invocation, activate nothing from them, and print no fast-track banner. `/sai-2-design` SHALL NOT be listed among the commands that parse `--fast-track` in `sai/policies/fast-track-flag.md`.

#### Scenario: fast-track is ignored

- **WHEN** `/sai-2-design {name} --fast-track` is invoked
- **THEN** the token is dropped, no `> FAST-TRACK MODE ACTIVE` banner is printed, and the run behaves as without the token

### Requirement: /sai-plan resolves its publication answer at the start of the run

`/sai-plan` SHALL resolve a publication answer once, after its input checks pass (block file and hash verification, change resolution, and, when the spec segment runs, its block validation) and before its first worker is created; when the spec segment counts as done, it SHALL resolve the answer right after opening the run. It SHALL take the first value found in this order and ask nothing after it: the `--publish yes|no` argument, the answer recorded in the `publication` field of the `plan-run@1` run view, the `pr.publishAfterRun` project setting when it returns `yes` or `no`, and last one question. It SHALL record the answer in `plan-run@1`. A `--publish` value that differs from the recorded answer SHALL replace it, and the closing report SHALL say so. The question SHALL be asked through Claude Code's `AskUserQuestion` or opencode's `question` with the same text and options, SHALL name the change, the current branch, and its remote, SHALL state that a new request is created as a draft and an open request keeps its draft or ready state, and SHALL offer `Publish draft plan` (`yes`) and `Do not publish` (`no`); a cancelled question SHALL count as `no`. On a detached HEAD the coordinator SHALL ask nothing, record no answer, and say in the closing report that nothing is published because HEAD is detached. The answer SHALL be the held confirmation for exactly the plan-document commit, the non-force push of the branch, and the creation or update of its request.

#### Scenario: Run ending at its input checks asks nothing

- **WHEN** `/sai-plan` ends because its block file does not verify or its change cannot be resolved
- **THEN** no publication question is asked and no answer is recorded

#### Scenario: The argument wins

- **WHEN** `/sai-plan` is invoked with `--publish no` in a project whose `pr.publishAfterRun` is `yes`
- **THEN** the answer is `no`, it is recorded in `plan-run@1`, and no question is asked

#### Scenario: A resumed run reuses its recorded answer

- **WHEN** an interrupted run that recorded `yes` resumes without a `--publish` argument
- **THEN** the run reuses `yes` and asks nothing

#### Scenario: The setting answers the question

- **WHEN** no `--publish` argument and no recorded answer exist and `pr.publishAfterRun` returns `yes`
- **THEN** the answer is `yes`, the setting's warnings are printed verbatim, and no question is asked

#### Scenario: Ask, absent, or invalid setting leads to the question

- **WHEN** no `--publish` argument and no recorded answer exist and `pr.publishAfterRun` is `ask`, absent, or invalid
- **THEN** the coordinator asks the question that names the branch and its remote

#### Scenario: Detached HEAD

- **WHEN** the answer would come from the question and HEAD is detached
- **THEN** no question is asked, no answer is recorded, and the closing report says that nothing is published because HEAD is detached

### Requirement: /sai-plan accepts a --publish argument

`/sai-plan` SHALL take `--publish <answer>` out of its invocation and keep it as the first source of the publication answer. A value other than `yes` or `no`, or a missing value, SHALL end the run before anything is written with `Cannot start /sai-plan: --publish takes yes or no.`. The Claude Code wrapper's argument hint SHALL name `[--publish yes|no]`.

#### Scenario: Invalid publish value

- **WHEN** `/sai-plan my-change --publish maybe` is invoked
- **THEN** the run ends before anything is written and prints `Cannot start /sai-plan: --publish takes yes or no.`

### Requirement: /sai-plan publishes unattended after a successful run with a yes answer

When both segments completed (or the spec segment counted as done and the design segment completed) and the answer is `yes`, `/sai-plan` SHALL publish after the last local commit of the run, the telemetry commit included, and before its closing line, by following `sai/commands/plan/publication.md`, which SHALL ask nothing. It SHALL print a one-paragraph outcome: the verified request URL, or the reason nothing was published. A publication that fails or is skipped SHALL NOT stop the run or change its outcome, and no step SHALL be retried with force. With the answer `no`, without an answer, or when a segment failed, was stopped, or ended on an unanswered escalation, nothing SHALL be published and nothing SHALL be asked. Standalone `/sai-1-spec` and `/sai-2-design` SHALL ask no publication question. When Explore's Plan - Unattended route follows this coordinator without a handed-over answer, the start question SHALL reach the user inside that route and Explore SHALL ask no second publication question.

#### Scenario: Yes answer publishes at the end

- **WHEN** a run with the answer `yes` completes both segments
- **THEN** the coordinator publishes after its last local commit and before the closing line, asks nothing, and prints the publication outcome

#### Scenario: No answer leaves the branch untouched

- **WHEN** a run with the answer `no` completes
- **THEN** the branch and the remote stay untouched and no publication question is asked at the end

#### Scenario: Failed run publishes nothing

- **WHEN** a segment fails, is stopped, or ends on an unanswered escalation in a run whose answer is `yes`
- **THEN** nothing is published

#### Scenario: Skipped publication keeps the run completed

- **WHEN** publication is skipped because the branch is the default branch, the provider or remote is missing, authentication fails, or the push is rejected
- **THEN** the closing report gives the reason, planning stays completed, and nothing is retried with force
