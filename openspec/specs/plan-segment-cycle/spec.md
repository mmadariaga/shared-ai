# plan-segment-cycle Specification

## Purpose
The plan segment cycle is the shared unattended run of a `/sai-1-spec` or `/sai-2-design` segment, alone or inside `/sai-plan`: run state, worker lifetime and report, answers to worker questions, mechanical checks, review rounds, commits, obstacles, resume, and close.

## Requirements

### Requirement: Plan run state lives in plan-run@1 and a private run directory

The segment cycle (`sai/commands/plan/cycle.md`) SHALL keep its run state in the `plan-run@1` machine, built on the shared run core, with the segments `spec` and `design` and the events `start`, `segment-start`, `segment-done`, `attempt`, `escalate`, `answer`, `record`, `close`, and `status`. The state SHALL hold identifiers and paths only. The session key SHALL be `plan-{name}`, shared by `/sai-1-spec`, `/sai-2-design`, and `/sai-plan`. A fresh run SHALL create its run directory outside the repository with `temp-root.js mkdtemp --harness <claude|opencode> --prefix plan-{name}-`, passing no other argument (in particular no `--cwd`), and free text (assumptions, reports, findings, baselines, hand-over files) SHALL live in files in that directory. Whoever opened the run SHALL close it: inside `/sai-plan` the plan coordinator opens and closes the run and each segment only emits `segment-start` and `segment-done`. `implement-run@1` SHALL keep its behavior.

#### Scenario: a fresh run opens a private run directory

- **WHEN** `/sai-1-spec` starts with no interrupted run of the change
- **THEN** it spawns the `plan-{name}` session, creates a `plan-{name}-` child of the SAI temp root, and emits `start` with that directory

#### Scenario: plan-run@1 is registered

- **WHEN** `sai-state/registry.js` is loaded
- **THEN** `plan-run@1` is registered and `implement-run@1` keeps its id, events, and behavior

#### Scenario: the mkdtemp call uses only documented arguments

- **WHEN** the segment cycle instruction tells a fresh run to create its run directory
- **THEN** the `mkdtemp` invocation carries only `--harness <claude|opencode>` and `--prefix plan-{name}-`, and no `--cwd`

### Requirement: Segment workers are standalone and report through a file

Each segment SHALL create its worker once, with the ready handshake: the creation dispatch carries only the ready prompt, the worker returns `event: ready`, and the task arrives in the next message to the same worker. The worker SHALL be continued with `SendMessage` on Claude Code and with `subagent` carrying the same `agent` used at creation, the captured `sessionID`, and `background: true` on opencode. The spec worker SHALL be `sai-1-spec-proposal-worker` and the design worker SHALL be `sai-2-design-worker`, with bindings rendered from the standalone binding template. Both workers SHALL follow the author side of `sai/policies/worker-report-transport.md`: each message names a new report name `{segment}-{k}.yaml`, and the worker SHALL save every response, a question included, as a new report file in the run's report directory with `transfer.js put` and return only the `{path, sha256}` reference that `put` prints, with the `warming: true|false` line of `@sai/policies/cache-warming.md` beside it when a warming line reached it; the coordinator SHALL keep that `warming` value per `cache-warming.md`. For every response after ready, the coordinator SHALL run `worker-report-validator.js validate --kind terminal --command <spec|design>` on the reference before it reads any field, SHALL act on the accepted payload without reading the file again, and SHALL record the accepted path. A message that carries its result inline SHALL be an invalid report. When the validator cannot be resolved, the run SHALL stop on that obstacle without interpreting the report. The worker SHALL run no git command that changes the repository.

#### Scenario: the worker returns only its report path

- **WHEN** a segment worker completes a step
- **THEN** it saves the report under the name the message gives in the report directory and returns only its `{path, sha256}` reference with no report content, plus its warming line when one reached it, and the coordinator validates the reference, acts on the accepted payload, and records the path

### Requirement: The coordinator answers worker questions as assumptions

A worker report with `status: needs_input` SHALL be answered by the coordinator. When the Ready to Propose block, the change's artifacts, or the repository answers the question, the coordinator SHALL give that answer, append the question, the answer, and its source to `assumptions.md` in the run directory, and continue the worker with the answer alone. When none of them answers it and the answer would not change the artifacts, the coordinator SHALL choose the most conservative reading and record it with the source `judgment`. When none of them answers it and the answer would change the artifacts, the coordinator SHALL escalate it through the native picker. Assumptions SHALL NOT be written into the change or the repository; the closing report SHALL list them.

#### Scenario: a block-answered question becomes an assumption

- **WHEN** a spec worker asks a question that the Ready to Propose block answers
- **THEN** the coordinator answers it, records it in `assumptions.md` with the block as its source, and asks the user nothing

#### Scenario: an unanswerable artifact-changing question escalates

- **WHEN** a worker asks a question that neither the block, the artifacts, nor the repository answers and whose answer would change the artifacts
- **THEN** the coordinator escalates it through the native picker with the worker's options as the ways to continue

### Requirement: Mechanical checks are obstacles, not findings

The coordinator SHALL run the segment's mechanical checks through the budget executor after the last step is reported, before each review round, and before the segment closes: `openspec validate {name}`, `check-delta-headers.js`, `check-cited-paths.js`, and, in the design segment, `file-manifest.js verify`. A failing check SHALL be an obstacle of the segment with a budget of 3 attempts, never a review finding, and the segment SHALL NOT close while a check fails. A check whose tool cannot be resolved SHALL be reported as skipped and SHALL NOT stop the run.

#### Scenario: a failing check blocks the segment close

- **WHEN** `openspec validate {name}` fails after the last step
- **THEN** the coordinator sends the failing lines to the worker as an attempt and does not close the segment until the check passes

### Requirement: The coordinator reviews the segment artifacts in up to three incremental rounds

The coordinator SHALL review the segment's artifacts itself, following `sai/policies/incremental-review.md` with the segment's artifacts as the reviewed set and `review-delta.js` snapshots over their paths, and SHALL form findings in the shape of `sai/policies/artifact-review-contract.md`. The first pass SHALL be full and later passes SHALL read the delta since the previous snapshot. Each round SHALL send its open findings to the same worker; at most 3 fix rounds SHALL run, followed by one final report-only pass. Findings still open after the third round SHALL be written to `findings.md` in the run directory, listed in the closing report, and SHALL NOT stop the run or escalate. Scope observations SHALL be neither fixed nor recorded as pending findings.

#### Scenario: findings left after round three are pending

- **WHEN** the final pass after the third fix round still reports an open finding
- **THEN** the finding is recorded as pending, listed in the closing report, and the segment continues to its commit

### Requirement: Each segment commits only its own paths locally

Each segment SHALL check every commit path with `git check-ignore -q`, stage only the paths that are not ignored without force-adding, leave out paths that were already modified before the segment began and are not its artifacts, and commit locally with `git commit -m "<subject>" -- <paths>`. Unrelated changes in the working tree SHALL stay unstaged. A segment whose commit paths are all ignored SHALL close without a commit and say so in its report. Invoking the command SHALL authorize these local commits only, and nothing SHALL be pushed.

#### Scenario: an ignored change directory leaves no commit

- **WHEN** the repository ignores `openspec/changes/**` and a design segment completes
- **THEN** no commit is created and the closing report says the paths were left uncommitted because the project ignores them

### Requirement: Obstacles spend a budget of three attempts and then escalate

An obstacle (a failing check, a report that does not validate or cannot be read, a silent or drifting worker, a failing tool) SHALL have a budget of 3 attempts, each with an approach different from the previous one: a corrected instruction, a mechanical repair that adds, removes, or rewrites no content, or a new worker that receives a hand-over file `handover-{segment}-{k}.md` in the run directory instead of the old worker's history. A report that does not validate SHALL be the obstacle `report-{k}`: the first invalid report SHALL go back to the same worker with the validator's errors, and a second consecutive invalid report from that worker SHALL replace it. A hung, drifting, or unreadable worker SHALL be asked again first and then replaced, each counting as an attempt. An exhausted budget, an unanswerable artifact-changing question, an operation that needs human authorization, or foreign work in a commit path SHALL escalate at once through the native picker with coordinator-written options, one of which stops the run; a `continue` answer SHALL reset that obstacle's counter.

#### Scenario: an unreadable report leads to a replacement worker

- **WHEN** a worker's report stays unreadable after it was asked again
- **THEN** the coordinator replaces it with a new worker that receives a hand-over file, and both responses count as attempts of the obstacle

#### Scenario: a second consecutive invalid report replaces the worker

- **WHEN** a spec worker's report fails validation, the coordinator returns the validator's errors to it, and its next report fails validation too
- **THEN** the coordinator replaces the worker with a new one whose first task message opens with the recorded `--report-dir` line, and both reports count as attempts of the `report-{k}` obstacle

### Requirement: An interrupted plan run resumes from the store or the disk

When opening the run finds a `running` or `escalated` stage whose directory lies inside the SAI temp root, the coordinator SHALL resume: it SHALL emit `status`, read the referenced files, compare them with the artifacts on disk and `git log`, and continue at the first segment whose artifacts are not complete, with the disk winning over the store. A new worker created on resume SHALL receive the ready handshake and a hand-over file and spend no attempt. Without the store, the coordinator SHALL rebuild progress from the artifacts on disk and `git log` and start the run state fresh with every counter at zero. A run started under an earlier session key SHALL NOT resume.

#### Scenario: resume without the store rebuilds from the disk

- **WHEN** the run store of an interrupted plan run is gone and the change has a complete `proposal.md` and specs
- **THEN** the coordinator treats the spec segment as done and continues at the design segment with fresh counters

### Requirement: The plan run persists nothing beyond its artifacts and commits

At close, a completed run SHALL remove its run directory with `temp-root.js remove`; a stopped run, a blocked run, and an unanswered escalation SHALL keep it. No file in the change or the repository SHALL record the assumptions, the pending findings, or the scope observations; the found and pending finding counts that the optional `telemetry.md` records are not findings and are exempt. The closing report SHALL always list the assumptions and the pending findings, saying explicitly when there are none.

#### Scenario: a completed run leaves no run directory

- **WHEN** a plan run completes and its reports have been read
- **THEN** the run directory is removed and the closing report lists the assumptions and pending findings or says there are none

#### Scenario: telemetry records counts, not findings

- **WHEN** a plan run with change telemetry enabled closes
- **THEN** `telemetry.md` carries only the found and pending finding counts per severity, and no finding text, assumption, or scope observation

### Requirement: The artifact review contract enumerates the plan review rounds

`sai/policies/artifact-review-contract.md` SHALL name exactly two surfaces that form artifact findings under the contract: the manual `sai-explore` post-crystallization Review Engine and the incremental review rounds of the plan coordinators (`/sai-1-spec`, `/sai-2-design`, and `/sai-plan`). `sai/policies/incremental-review.md` SHALL name the artifact review rounds of the `/sai-1-spec` and `/sai-2-design` segments among the coordinator review-fix loops it governs, reviewing the segment's artifact paths instead of a diff. No worker-owned planning review loop and no supervised in-session round SHALL be named.

#### Scenario: the contract names the plan review rounds

- **WHEN** the surface enumeration of `sai/policies/artifact-review-contract.md` is read
- **THEN** it names the manual Review Engine and the plan coordinators' incremental review rounds, and no worker-owned loop or supervised round

### Requirement: The plan run opens one report directory and reuses it

The segment cycle SHALL open the report directory of a fresh run with `transfer.js open --harness <claude|opencode>` after creating its run directory and SHALL record the returned path in `plan-run@1` as a `record` of kind `report-dir`; the `plan-run@1` machine SHALL admit that record kind. When the directory cannot be opened, the run SHALL print the tool's error and end before any dispatch, after removing the run directory. The first task message to a worker, a replacement included, SHALL open with the line `--report-dir <report directory>`, and no later message to that worker SHALL carry it. A replacement worker and a resumed run SHALL reuse the recorded report directory while it still exists, and SHALL open and record a new one when it is gone. A completed run SHALL close the report directory with `transfer.js close` after the last report is validated and handled; a stopped run, a blocked run, and an unanswered escalation SHALL keep it.

#### Scenario: a fresh run records its report directory

- **WHEN** `/sai-1-spec` starts a fresh run of a change
- **THEN** it opens a report directory with `transfer.js open`, emits `record` (`report-dir`) with the returned path, and the first task message to the spec worker opens with `--report-dir <that path>`

#### Scenario: a replacement worker reuses the report directory

- **WHEN** the coordinator replaces a design worker during a run whose report directory still exists
- **THEN** the replacement's first task message opens with the same `--report-dir` line the run recorded

#### Scenario: a stopped run keeps its report directory

- **WHEN** a plan run stops on an exhausted obstacle budget
- **THEN** the run keeps both its run directory and its report directory

### Requirement: Spec and design reports use the unified status schema

The spec and design workers SHALL report with a `status` of `completed`, `needs_input`, `failed`, or `cancelled`, and SHALL keep `step_ids`, `warnings`, and `notes` as role fields; a `needs_input` report SHALL add `question` and `options`. `done` and `blocked` SHALL be invalid statuses. A step that cannot finish, a spec defect the design worker cannot patch, a failed artifact write or verification, and a failed overview generation SHALL report `failed` with the reason. The coordinator SHALL advance the segment's step machine only from the `step_ids` of an accepted report.

#### Scenario: a done status is invalid

- **WHEN** a spec worker saves a report with `status: done`
- **THEN** the validator rejects it with `--command spec` and the coordinator reads no field of it

#### Scenario: a spec defect the design worker cannot patch reports failed

- **WHEN** the design worker meets a contradiction in `proposal.md` or `specs/**` whose correct amendment it cannot determine
- **THEN** it reports `failed`, naming the defect, its location, and that the correction belongs to `/sai-1-spec`

#### Scenario: accepted step ids advance the machine

- **WHEN** the coordinator accepts a design report whose `step_ids` is not empty
- **THEN** it emits those ids, copied from the accepted payload, to `design-steps@1` and sends the next pointer from the response
