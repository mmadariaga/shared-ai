# plan-segment-cycle Specification

## Purpose
The plan segment cycle is the shared unattended run of a `/sai-1-spec` or `/sai-2-design` segment, alone or inside `/sai-plan`: run state, worker lifetime and report, answers to worker questions, mechanical checks, review rounds, commits, obstacles, resume, and close.

## Requirements

### Requirement: Plan run state lives in plan-run@1 and a private run directory

The segment cycle (`sai/commands/plan/cycle.md`) SHALL keep its run state in the `plan-run@1` machine, built on the shared run core, with the segments `spec` and `design` and the events `start`, `segment-start`, `segment-done`, `attempt`, `escalate`, `answer`, `record`, `publication`, `close`, and `status`. The state SHALL hold identifiers and paths only, and the run's publication answer. The session key SHALL be `plan-{name}`, shared by `/sai-1-spec`, `/sai-2-design`, and `/sai-plan`. A fresh run SHALL create its run directory outside the repository with `temp-root.js mkdtemp --harness <claude|opencode> --prefix plan-{name}-`, passing no other argument (in particular no `--cwd`), and free text (assumptions, reports, findings, baselines, hand-over files) SHALL live in files in that directory. Whoever opened the run SHALL close it: inside `/sai-plan` the plan coordinator opens and closes the run and each segment only emits `segment-start` and `segment-done`. `implement-run@1` SHALL keep its behavior.

The shared run core SHALL offer the `publication` event only to a machine built with `publication: true`. Such a machine SHALL hold a `publication` state field, `''` until answered, SHALL accept `publication` with a value from the machine's own `publicationAnswers` list only while the run is running, SHALL let a later explicit value replace the recorded one, and SHALL return the field in its `run` view. `implement-run@1` SHALL declare `['yes', 'no', 'draft']` and `plan-run@1` SHALL declare `['yes', 'no']`, so `implement-run@1` accepts `draft` while `plan-run@1` rejects it. `plan-run@1` SHALL be built with `publication: true`.

#### Scenario: a fresh run opens a private run directory

- **WHEN** `/sai-1-spec` starts with no interrupted run of the change
- **THEN** it spawns the `plan-{name}` session, creates a `plan-{name}-` child of the SAI temp root, and emits `start` with that directory

#### Scenario: plan-run@1 is registered

- **WHEN** `sai-state/registry.js` is loaded
- **THEN** `plan-run@1` is registered and `implement-run@1` keeps its id, events, and behavior

#### Scenario: the mkdtemp call uses only documented arguments

- **WHEN** the segment cycle instruction tells a fresh run to create its run directory
- **THEN** the `mkdtemp` invocation carries only `--harness <claude|opencode>` and `--prefix plan-{name}-`, and no `--cwd`

#### Scenario: the publication answer is recorded

- **WHEN** a running `plan-run@1` receives `publication` with `value` `yes`
- **THEN** the `run` view returns `publication: yes`, and a later `publication` with `value` `no` replaces it

#### Scenario: an invalid publication answer is rejected

- **WHEN** a running `plan-run@1` receives `publication` with a value other than `yes` or `no`, or a run that is not running receives it
- **THEN** the event is rejected and the recorded answer is unchanged

#### Scenario: each machine declares its own publication answers

- **WHEN** `implement-run@1` receives `publication` with `value` `draft` and `plan-run@1` receives `publication` with `value` `draft`
- **THEN** `implement-run@1` records `draft` in its run view and `plan-run@1` rejects the event with `publication must be yes or no`

### Requirement: Segment workers are standalone and report through a file

Each segment SHALL create its worker once, with the ready handshake: the creation dispatch carries only the ready prompt, the worker returns `event: ready`, and the task arrives in the next message to the same worker. The worker SHALL be continued with `SendMessage` on Claude Code and with `subagent` carrying the same `agent` used at creation, the captured `sessionID`, and `background: true` on opencode. The spec worker SHALL be `sai-1-spec-proposal-worker` and the design worker SHALL be `sai-2-design-worker`, with bindings rendered from the standalone binding template. Both workers SHALL follow the author side of `sai/policies/worker-report-transport.md`: each message names a new report name `{segment}-{k}.yaml`, and the worker SHALL save every response, a question included, as a new report file in the run's report directory with `transfer.js put` and return only the `{path, sha256}` reference that `put` prints, with the `warming: true|false` line of `@sai/policies/cache-warming.md` beside it when a warming line reached it; the coordinator SHALL keep that `warming` value per `cache-warming.md`. For every response after ready, the coordinator SHALL run `transfer.js receive --dir <report directory> --path <path> --sha256 <sha256> --kind terminal --command <spec|design>`, which checks the duplicate, validates the report with `worker-report-validator.js`, and records the reference in the ledger in one call, on the reference before it reads any field (the plan RED of the design segment with `--command implement`), SHALL act on the accepted `validation.payload` without reading the file again, and SHALL record the accepted path. A message that carries its result inline SHALL be an invalid report. When the validator cannot be resolved, the run SHALL stop on that obstacle without interpreting the report. The worker SHALL run no git command that changes the repository.

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

Each segment SHALL check every commit path with `git check-ignore -q`, stage only the paths that are not ignored without force-adding, leave out paths that were already modified before the segment began and are not its artifacts, and commit locally with `git commit -m "<subject>" -- <paths>`. Unrelated changes in the working tree SHALL stay unstaged. A segment whose commit paths are all ignored SHALL close without a commit and say so in its report. Invoking the command SHALL authorize these local commits only, and no segment SHALL push. Only the `/sai-plan` publication of a run that holds a recorded `yes` publication answer SHALL push the branch, after the last segment.

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

The spec and design workers SHALL report with a `status` of `completed`, `needs_input`, `failed`, or `cancelled`, and SHALL keep `step_ids`, `warnings`, and `notes` as role fields; the spec worker SHALL also carry `research_files`, a list of `{path, sha256}` references, required on `completed`, and the design worker SHALL carry no such field. A `needs_input` report SHALL add `question` and `options`. `done` and `blocked` SHALL be invalid statuses. A step that cannot finish, a spec defect the design worker cannot patch, a failed artifact write or verification, and a failed overview generation SHALL report `failed` with the reason. The coordinator SHALL advance the segment's step machine only from the `step_ids` of an accepted report.

#### Scenario: a done status is invalid

- **WHEN** a spec worker saves a report with `status: done`
- **THEN** the validator rejects it with `--command spec` and the coordinator reads no field of it

#### Scenario: a spec defect the design worker cannot patch reports failed

- **WHEN** the design worker meets a contradiction in `proposal.md` or `specs/**` whose correct amendment it cannot determine
- **THEN** it reports `failed`, naming the defect, its location, and that the correction belongs to `/sai-1-spec`

#### Scenario: accepted step ids advance the machine

- **WHEN** the coordinator accepts a design report whose `step_ids` is not empty
- **THEN** it emits those ids, copied from the accepted payload, to `design-steps@1` and sends the next pointer from the response

#### Scenario: a completed spec report without research_files is invalid

- **WHEN** a spec worker saves a `completed` report that carries no `research_files`
- **THEN** the validator rejects it with `--command spec`, while a `completed` design report without the field is accepted

### Requirement: The plan run hands spec research to design through a research directory

Research the spec worker already did SHALL reach the design segment of the same `/sai-plan` run, the `/sai-explore` Plan - Unattended route included, as pointers to the explorers' original reports, never as a rewrite or summary. When the spec segment runs, the plan coordinator SHALL open a second private directory with `transfer.js open --harness <claude|opencode>` right after the report directory and SHALL record it in `plan-run@1` as a `record` of kind `research-dir`; the machine SHALL admit that kind and list it as `research_dirs` in its run view. The spec brief SHALL name `research_dir: <path>`, and the watch of the spec segment SHALL list that path among the worker's writable paths. After each accepted `completed` spec report, the coordinator SHALL write that report's `research_files`, copied from the accepted payload, to `research-files.json` in the run directory. Before composing the design brief, it SHALL check each reference with `transfer.js verify` and SHALL put only the valid ones into the brief as `inherited research:` pointers. A research directory that cannot be opened, or a reference that fails the check, SHALL never stop the run and SHALL spend no attempt: the closing report SHALL carry one line about it and design SHALL research what the lost references covered. A completed run SHALL close the research directory together with the report directory; a stopped run, a blocked run, and an unanswered escalation SHALL keep it. A segment that runs alone and `/sai-explore`'s own research SHALL neither save nor inherit research.

#### Scenario: a plan run records its research directory

- **WHEN** `/sai-plan` starts a run whose spec segment runs
- **THEN** it opens the research directory right after the report directory, emits `record` (`research-dir`) with the returned path, and names it as `research_dir` in the spec brief and in the spec watch's writable paths

#### Scenario: an unusable reference costs one closing-report line

- **WHEN** a `research_files` reference is missing, has a different hash, or its research directory is gone before the design brief
- **THEN** the coordinator leaves it out of the design brief, the closing report carries one `Research hand-over:` line, and the run continues

#### Scenario: specs already on disk leave nothing to inherit

- **WHEN** `/sai-plan` starts with `proposal.md` and `specs/` already on disk, so the spec segment counts as done
- **THEN** there is no spec report and no `research-files.json`, and design researches as it does alone with no warning

#### Scenario: an interrupted run resumes the hand-over

- **WHEN** a `/sai-plan` run interrupted between spec and design resumes
- **THEN** it reads `research-files.json` from the run directory and checks each reference against the research directory recorded in `research_dirs`

#### Scenario: a completed run closes the research directory

- **WHEN** a `/sai-plan` run that holds a research directory completes
- **THEN** the research directory is closed with `transfer.js close` in the same batch as the report directory, and a stopped run keeps it

### Requirement: The spec worker saves its research for the design segment

The spec worker SHALL open every `budget-explorer` task with the line `--report-dir <dir>`, where `<dir>` is `research_dir` when its brief names it and otherwise a helper directory the worker opens and closes itself, and SHALL accept each returned reference with `transfer.js accept` before reading the report. When its brief names `research_dir`, it SHALL keep each returned reference without rewriting, summarizing, or re-saving the report; an explorer message without a valid reference is an undelivered report, and a reference it could not accept is not a research file. It SHALL save its exceptions only, once, when the `research` step ends, as `spec-annotations.md` in the research directory with `transfer.js put --exclusive`, and only when it has at least one entry. Each entry SHALL be one line `<kind> <path>:<line> - <reason>`, with `kind` one of `corrected`, `rejected`, `own-read`, or `gap`; an unannotated citation SHALL mean that spec did not contradict it, not that spec confirmed it. Every `completed` spec report SHALL list in `research_files` the reference of each saved report and of the annotations file, and every later `completed` report SHALL repeat the whole list unchanged. Without `research_dir`, `research_files` SHALL be an empty list. The annotations write SHALL be the one write the spec worker makes outside its run directory, its report directory, and its helper directory.

#### Scenario: no exception means no annotations file

- **WHEN** the spec worker ends its `research` step with no exception to any explorer report
- **THEN** it saves no `spec-annotations.md`, and `research_files` lists only the explorer reports

#### Scenario: standalone spec lists no research files

- **WHEN** `/sai-1-spec` runs alone and its brief names no `research_dir`
- **THEN** its explorers save their reports in a helper directory that the spec worker opens and closes itself, and every `completed` spec report carries an empty `research_files` list
