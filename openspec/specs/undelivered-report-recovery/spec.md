# undelivered-report-recovery Specification

## Purpose
TBD - created by archiving change recover-undelivered-worker-reports. Update Purpose after archive.

## Requirements

### Requirement: Accepted references are recorded and duplicates ignored

For every worker report reference, from a worker message or from the watch, the coordinator SHALL run `transfer.js receive`, which records the reference in the ledger of the report directory in the same call that checks and validates it, before the coordinator acts on it. A report that fails validation SHALL be recorded by that same call, and the coordinator SHALL return it to its author as invalid. A reference already in the ledger (same `path` and `sha256`) SHALL answer `already: true`, and the coordinator SHALL treat it like a wake acknowledgement (`sai/policies/cache-warming.md` § Wake acknowledgement): no validation result acted on, no event emitted, no attempt spent, and no continuation sent. One exception: a repeated reference that answers a message the coordinator sent is a rejected continuation, handled under `sai/policies/worker-lifecycle.md` § Continuation timing, not a duplicate. Because the ledger lives in the report directory that the run state keeps, a reference recorded before a context compaction or a resumed run SHALL NOT be processed again; a run that resumes SHALL resume from its run state and the artifacts on disk. The budget agents' dispatcher SHALL keep `transfer.js accept`, because the budget agents have no validator.

#### Scenario: A repeated reference costs nothing

- **WHEN** a worker's wake repeats a reference that the coordinator already received, and the coordinator has sent the worker no message since
- **THEN** `receive` answers `already: true`, and the coordinator acts on no validation result, emits nothing, spends no attempt, and sends no continuation

#### Scenario: Acceptance survives compaction

- **WHEN** a coordinator resumes after a context compaction and receives a reference that the ledger already holds
- **THEN** it does not process that report again

#### Scenario: A repeated reference that answers a sent message

- **WHEN** a worker answers a message the coordinator sent with a reference the coordinator already received
- **THEN** the coordinator handles the reply as a rejected continuation under `sai/policies/worker-lifecycle.md` § Continuation timing

### Requirement: Background watch while waiting for a worker

Each time a coordinator starts waiting for the result of a worker that reports through the transport policy, it SHALL launch `transfer.js watch --dir <report-dir> --input-file <paths-file> --cwd <project root>` in the background (Claude Code `Bash` with `run_in_background: true` and the description `watch-reports`; opencode shell with `background: true`), whatever the warming setting, with the input file holding the paths the worker's brief lets it write, or `[]` when the report directory is the only place the worker writes. Every relaunch of a watch for the same worker task (after an empty end, after a first `silent`, and for a replacement worker) SHALL pass the same input file. When the watch exits 2 because `--input-file` is missing, the coordinator SHALL relaunch it with the file and SHALL spend no obstacle attempt. When the watch ends with an empty list and not `silent`, the coordinator SHALL launch it again, SHALL send nothing to the worker, and SHALL write nothing to the user. When the watch ends `silent`, the coordinator SHALL handle it as an obstacle of the step under the existing budget, with no user question of its own: the first `silent` asks the same worker once for its report and relaunches the watch, and a second consecutive `silent` with no report between them replaces the worker. When the expected result arrives by any path, the coordinator SHALL stop the watch (Claude Code `TaskStop`, opencode removal of its shell), and SHALL also stop it before it disposes the worker and closes the report directory; a later firing SHALL have no effect. When the watch cannot be launched (no shell, permission refused), the coordinator SHALL print one notice and continue without it, and the run SHALL NOT stop. On cache-warming responses the coordinator SHALL follow `cache-warming.md` for the main-session continuation check or subagent protocol, as applicable. Only the watch, the immediate one-shot scan of a worker reply without a reference, and the one-shot `transfer.js status` query SHALL look for undelivered reports; a warming notification SHALL trigger no scan of its own, and a coordinator wake during a worker wait SHALL run only the `status` query, receiving a report it lists.

#### Scenario: The watch runs with warming off
- **WHEN** a coordinator with cache warming off waits for a worker's result
- **THEN** a `transfer.js watch` process over that worker's report directory runs in the background

#### Scenario: An empty watch is relaunched silently
- **WHEN** the watch ends at its maximum with an empty list
- **THEN** the coordinator launches it again and sends no message to the worker or the user

#### Scenario: A watch that cannot start does not stop the run
- **WHEN** launching the watch fails because no shell is available or the permission is refused
- **THEN** the coordinator prints one notice and keeps waiting for the worker without the watch

#### Scenario: Continuation check does not poll for reports
- **WHEN** a coordinator receives a warming notification while waiting for a worker
- **THEN** it follows the applicable warming protocol, runs no watch scan and duplicates no running work, and runs only the one-shot `status` query, receiving any report that query lists

#### Scenario: A silent watch is an obstacle, not a relaunch
- **WHEN** the watch ends with `ended: silent`
- **THEN** the coordinator spends one attempt of the step's obstacle and asks the same worker once for its report instead of relaunching silently

#### Scenario: Every relaunch reuses the same writable paths
- **WHEN** the coordinator relaunches the watch after an empty end, after a first `silent`, or for a replacement worker of the same task
- **THEN** the relaunch passes the same input file as the first watch

#### Scenario: A watch launched without its writable paths
- **WHEN** a watch exits 2 because `--input-file` is missing
- **THEN** the coordinator relaunches it with the file and records no obstacle attempt

### Requirement: Found reports follow the delivered-report path

When the watch ends with reports, the coordinator SHALL process each in creation order exactly as if the worker had delivered it: one `transfer.js receive` call (a `progress-` report is received and then goes to the step machine's progress emit), and the same invalid-report recovery that counts as an obstacle attempt. Because `receive` records a report that fails validation, the watch SHALL NOT report it again. A worker message that is a protocol literal SHALL NOT be a result: the coordinator SHALL keep waiting with the watch armed. A worker message that carries no reference and is not a protocol literal SHALL follow the immediate scan of the reply-without-reference rule instead of a passive wait. A worker turn that ends with the wake literal, the stop literal, or `ok` instead of its report reference SHALL trigger the same recovery through the watch. `sai/policies/worker-report-transport.md` SHALL name the wake and stop literals by their term with a pointer to `sai/policies/cache-warming.md`, and SHALL spell neither literal nor a bare `ok`.

#### Scenario: A found report is processed as delivered

- **WHEN** the watch reports a saved report whose reference never arrived
- **THEN** the coordinator receives and processes it as if the worker had returned its reference

#### Scenario: An invalid found report is an obstacle attempt

- **WHEN** a report found by the watch fails validation
- **THEN** the coordinator applies the invalid-report recovery and counts one obstacle attempt, and the `receive` call has recorded the reference so the watch does not report it again

#### Scenario: A non-result message keeps the wait

- **WHEN** a worker sends a protocol literal, such as a wake acknowledgement, instead of a reference
- **THEN** the coordinator records no result and keeps waiting with the watch armed

#### Scenario: A literal in place of the reference
- **WHEN** a worker's turn ends with `warming context cache up`, `cache warming stopped`, or `ok` instead of the reference of a report it saved
- **THEN** the coordinator keeps waiting, and the watch finds the saved report, which the coordinator processes as if the worker had delivered it

### Requirement: One watch per report directory for parallel workers

When several workers run in parallel, the coordinator SHALL watch each report directory separately and SHALL attribute a report to the worker of its directory. In `/sai-deep-review`, each audit cycle SHALL have one watch on that cycle's own report directory, whose writable paths SHALL list only that audit's report and scratch folder, so the activity of one audit never delays the `silent` end of another, and the driving session SHALL process the found reports in the fixed order of its `sai-state` calls and commits.

#### Scenario: Parallel audits are watched separately

- **WHEN** `/sai-deep-review` runs several audit cycles at once
- **THEN** each cycle's report directory has its own watch and a report found there belongs to that cycle's worker

#### Scenario: One audit's activity does not hide another's silence

- **WHEN** the security audit writes to its report while the performance worker writes nothing for a whole window
- **THEN** the performance cycle's watch ends `silent`, because its writable paths list only the performance report and its own scratch folder

### Requirement: Coordinator profiles grant the recovery verbs

The shared `coordinator` capability profile in `sai/install-manifest.json` SHALL allow `node {sai}/tools/transfer.js accept *`, `node {sai}/tools/transfer.js receive *`, `node {sai}/tools/transfer.js status *`, and `node {sai}/tools/transfer.js watch *`, so every coordinator profile that extends it can run these verbs on Claude Code and opencode.

#### Scenario: A coordinator may run accept and watch

- **WHEN** the capability profiles are compiled for a coordinator command
- **THEN** its shell grants include `transfer.js accept`, `transfer.js receive`, `transfer.js status`, and `transfer.js watch`

### Requirement: Each coordinator SHALL state its worker's writable paths as a fact of its own card

Every report-receiving coordinator card SHALL name the writable paths of its worker as a fact of that card, while the watch mechanics SHALL stay single-sourced in `sai/policies/worker-report-transport.md` § Undelivered reports. The paths SHALL reach the watch as the required input file, written once per worker task in a directory outside the report directory. The facts SHALL be:

- `/sai-3-implement`: the paths the step's brief lets the worker write, plus the worker's scratch folder in the run directory, written once per step, because the RED and GREEN workers live for the whole run and each step names other paths.
- Direct Build: for the implementer, the directory of each repository path the verified block cites, taken without its `:line` range (a cited path at the repository root is listed as that file alone, never the root directory, and a cited path whose directory does not exist yet is listed through its nearest existing parent directory below the root, or as the path itself when that parent would be the root), plus its scratch folder `scratch-implementer` in the slice run directory; for the backfill worker, its transfer directory; for the archive worker, `[]`.
- `/sai-1-spec`, `/sai-2-design`, and `/sai-plan`: `openspec/changes/{name}/`, `GLOSSARY.md` in the spec segment, plus the scratch folder `scratch-{segment}` in the run directory.
- `/sai-merge`: the files the worker's brief names, plus the scratch folder `scratch` in the run directory.
- `/sai-4-review`: `openspec/changes/{name}/review.md` plus a scratch folder opened with `transfer.js open`.
- The audit coordinator: the audit's report plus a scratch folder opened with `transfer.js open`.
- `/sai-commit` and `/sai-archive`: `[]`.
- `/sai-backfill`: its transfer directory.

The rule SHALL be the same on Claude Code and opencode.

#### Scenario: Direct Build implementer watches the directory of a cited path
- **WHEN** the verified block cites `sai/tools/transfer.js:41-57`
- **THEN** the implementer's writable paths list the directory `sai/tools`, beside its scratch folder

#### Scenario: Direct Build root-level cited path stays a file
- **WHEN** the verified block cites `AGENTS.md` at the repository root
- **THEN** the implementer's writable paths list `AGENTS.md` alone, never the repository root directory

#### Scenario: Direct Build cited path in a directory that does not exist yet
- **WHEN** the verified block cites `sai/tools/new/feature.js` and `sai/tools/new/` does not exist
- **THEN** the implementer's writable paths list `sai/tools`, its nearest existing parent directory below the root

#### Scenario: A short-lived worker passes an empty list
- **WHEN** `/sai-commit` waits for its worker's result
- **THEN** its watch receives an input file that holds `[]`, written in a directory other than the report directory

#### Scenario: Watch mechanics are not restated
- **WHEN** a reader opens a coordinator card's undelivered-report paragraph
- **THEN** it names its worker's writable paths and points to `worker-report-transport.md` § Undelivered reports for the watch mechanics

### Requirement: A coordinator SHALL name a scratch folder in its run directory without creating it

A worker that can run a long command SHALL receive a scratch folder: a private folder outside the repository that its brief names and its writable paths list. When the scratch folder is a path inside the coordinator's run directory (Direct Build, the plan cycle, and `/sai-merge`), the coordinator SHALL only name it, and the worker SHALL create it when it does not exist. `/sai-4-review` and the audit coordinator SHALL open the scratch folder with `transfer.js open`, give a replacement worker the same folder, and close it with the report directory in one same-turn batch; in `/sai-deep-review` each cycle's scratch folder SHALL close with that cycle's report directory.

#### Scenario: The worker creates a named scratch folder
- **WHEN** the Direct Build coordinator sends the implementer a `Scratch folder: <path>` line for a path that does not exist
- **THEN** the coordinator has created nothing at that path and the worker creates the folder before logging to it

#### Scenario: Review closes its scratch folder with the report directory
- **WHEN** a `/sai-4-review` run ends with `Review done.`
- **THEN** the coordinator closes the report directory and the scratch folder in one same-turn batch

### Requirement: A reply without a reference is scanned at once

A worker message that carries no report reference and is not a protocol literal (`event: ready`, or the wake literal, the stop literal, or the legacy alias of `sai/policies/cache-warming.md` § Wake acknowledgement), such as a translated or reworded literal, "Ending this turn", or text that carries its result inline, SHALL make the coordinator act at once: waiting for a `silent` end of the watch SHALL NOT be the recovery. The coordinator SHALL run one scan of that worker's own report directory, a foreground `transfer.js watch --dir <report-dir> --input-file <paths-file> --cwd <project-root> --settle 0s --max 1s` with the same writable-paths file as the watch of the worker task, so no new tool flag is added. A report the scan finds SHALL be processed exactly as a delivered report. When the scan finds none, the message SHALL be an invalid report: the first SHALL go back to the same worker asking for the report of the work already done, with the note that no reference arrived, a second consecutive one SHALL replace the worker, each SHALL spend one attempt of the step's obstacle, and the exhausted budget SHALL escalate with options. The watch of the step SHALL stay armed meanwhile, and a report that arrives by any path SHALL end the run of consecutive invalid replies. This rule SHALL live in `sai/policies/worker-report-transport.md` and SHALL apply to every coordinator on Claude Code and opencode.

#### Scenario: A reply without a reference finds the saved report

- **WHEN** a worker replies "Ending this turn" and its report directory holds an unledgered report
- **THEN** the coordinator's immediate scan finds it and the coordinator processes it as a delivered report

#### Scenario: A reply without a reference and no saved report

- **WHEN** a worker replies with text that carries no reference and the scan finds no unledgered report
- **THEN** the coordinator returns the message to the same worker as an invalid report, asking for the report of the work already done, and counts one obstacle attempt

#### Scenario: A second consecutive reply without a reference replaces the worker

- **WHEN** the same worker again replies without a reference and the scan again finds no report
- **THEN** the coordinator replaces the worker with a hand-over it writes and counts a second obstacle attempt, without waiting for a `silent` watch end

### Requirement: Single source of undelivered-report reception for workers and budget agents

`sai/policies/worker-report-transport.md` SHALL hold a `## Undelivered reports` section that is the single source of how a dispatcher recovers a report that is saved in a report directory while its reference never reached the dispatcher. The rules SHALL apply to every worker that reports through that policy and to the three budget agents (`budget-explorer`, `budget-subagent`, `budget-executor`), whose dispatchers apply them to their helper report directory as § Budget agents says, on Claude Code and opencode alike, whether cache warming is on or off. Only the `--no-specs` POC, which keeps its own transport, SHALL stay outside it. Each coordinator that receives reports through the policy (implement, review, audit, deep-review, the plan cycle, commit, archive, backfill, merge, and Direct Build) SHALL point to that section and SHALL NOT restate it; archive and backfill apply it on their ordinary route.

#### Scenario: Every receiving coordinator points to the section

- **WHEN** a coordinator card that receives worker reports through the transport policy is read
- **THEN** it names `worker-report-transport.md` § Undelivered reports

#### Scenario: Budget agents are inside the recovery

- **WHEN** a dispatcher waits for a `budget-*` agent whose message carries no valid reference
- **THEN** it scans its helper report directory and accepts a saved report absent from the `.sai-accepted` ledger before asking the agent again

#### Scenario: Only the POC stays outside the recovery

- **WHEN** a coordinator waits for the `--no-specs` POC
- **THEN** the undelivered-report rules do not apply

### Requirement: Worker reports are received in one call

For each worker report reference after ready, from a worker message or from the watch, the coordinator SHALL run `transfer.js receive --dir <report-dir> --path <path> --sha256 <sha256> --kind terminal --command <command>` (or `--kind progress` with no `--command` for a `progress-` report), with `--paths-file` and `--cwd` naming the writable-paths file and project root of the watch, on Claude Code and opencode alike. The coordinator SHALL read no field of the report before `receive` has answered, and SHALL act on the `validation.payload` of an accepted answer without reading the file again. The ledger SHALL hold the reference when the call returns, before the coordinator acts on it, so no separate recording call follows. On `outcome: report-invalid` or `delivery-failed` the coordinator SHALL apply the existing invalid-report recovery. A progress report (`outcome: recorded`) SHALL go next to `sai-state emit … --progress` with the same reference. A `receive` call that comes back cancelled or without a result SHALL be re-issued alone in the next turn without counting an obstacle attempt; when the re-issue answers `already: true` for a reference the coordinator has not processed yet, the coordinator SHALL validate it read-only with `worker-report-validator.js validate` and act on that verdict. When `transfer.js` cannot be resolved, the run SHALL stop on that obstacle and the coordinator SHALL never interpret a report by reading it. `sai/policies/worker-report-transport.md` SHALL be the single source of this receipt, and the ten coordinator cards (`archive`, `audit`, `backfill`, `commit`, `deep-review`, `explore/direct-build-coordinator.md`, `implement`, `merge`, `plan/cycle.md`, `review`) SHALL name `receive` in their pointer to it.

#### Scenario: An accepted terminal report is acted on from the answer
- **WHEN** a worker returns the reference of a valid terminal report
- **THEN** the coordinator runs one `receive` call and acts on its `validation.payload` without reading the report file or running a separate validation or recording call

#### Scenario: A progress report is received before its emit
- **WHEN** the coordinator receives a `progress-` report reference
- **THEN** it runs `receive --kind progress` and then `sai-state emit … --progress` with the same reference

#### Scenario: A lost receive call is re-issued alone
- **WHEN** a `receive` call comes back cancelled and its re-issue answers `already: true` for a reference the coordinator has not processed
- **THEN** the coordinator counts no obstacle attempt, validates the report read-only with `worker-report-validator.js validate`, and acts on that verdict

#### Scenario: Coordinator pointers name receive
- **WHEN** a coordinator card points to the undelivered-report rules of the transport policy
- **THEN** the pointer names `receive`

### Requirement: The watch is relaunched from the receive answer

The `watch` field of every `receive` answer SHALL be the exact command that watches that report directory. While the coordinator still waits for a worker of that directory (its next step, a fix round, or the answer to its question), it SHALL launch that command again in the background. At the worker's last use it SHALL launch nothing, stop the watch, and dispose the worker.

#### Scenario: Watch relaunched for the next step
- **WHEN** the coordinator has received a report and sends the same worker its next step
- **THEN** it launches the `watch` command of the `receive` answer in the background

#### Scenario: No watch after the last use
- **WHEN** the coordinator has received the last report it expects from a worker
- **THEN** it launches no watch, stops the running one, and disposes the worker

### Requirement: Waiting messages name the worker role

Every message a coordinator prints about a wait SHALL name the role of the worker it waits on (spec, design, plan RED, fix RED, GREEN, review, security, performance, accessibility, commit, archive, backfill, merge, or Direct Build implementer), so a user who sees several workers, or two workers of the same family, can tell which one is meant. `sai/policies/worker-report-transport.md` SHALL be the only statement of this rule, and the coordinator cards SHALL NOT repeat it.

#### Scenario: Design and plan RED are told apart
- **WHEN** the design coordinator waits for the plan RED worker
- **THEN** its wait message names the plan RED role, not only the `sai-2-` agent family

#### Scenario: Parallel audits each get their own line
- **WHEN** `/sai-deep-review` waits for several audit workers at once
- **THEN** the coordinator prints one line per worker, each naming its own audit role

### Requirement: Activity line on request and on coordinator wakes during a worker wait

To show whether a waited-on worker is still working, the coordinator SHALL run the one-shot `transfer.js status --dir <report-dir> --input-file <paths-file> --cwd <project-root> --role <role> [--since <time>] [--handle <handle>]`, with the same writable-paths file as the watch of that worker, and SHALL print its `line` when the user asks for the status of a wait and on each of its own cache-warm wakes while it waits for a worker. Several workers waited on at once SHALL take one `status` call each, in one same-turn batch. When `unledgered` lists a report, the coordinator SHALL run `receive` on it in the same turn. The coordinator SHALL never send the worker a status request. With cache warming off, the activity line SHALL appear only when the user asks for it, and a wake with no worker being waited on SHALL keep the main-session literal, printed as its template `➡️ Warming context cache up - <wake_local>.` with the time the result carries, or its no-time form `➡️ Warming context cache up.` when the result carries no `wake_local`. The activity line SHALL stay unchanged by the time-bearing template and SHALL carry no time.

#### Scenario: User asks for the status of a wait
- **WHEN** the user asks whether the waited-on worker is still working
- **THEN** the coordinator runs `transfer.js status` and prints its activity line without sending the worker any message

#### Scenario: Saved report found by the status query
- **WHEN** `status` lists a report in `unledgered`
- **THEN** the coordinator runs `receive` on that report in the same turn

#### Scenario: Wake with no worker being waited on
- **WHEN** a coordinator cache-warm wake opens a turn while no worker is being waited on and there is nothing to handle
- **THEN** the coordinator prints the main-session literal `➡️ Warming context cache up - <wake_local>.` with the `wake_local` of its wait result, or the no-time form `➡️ Warming context cache up.` when the result carries none
