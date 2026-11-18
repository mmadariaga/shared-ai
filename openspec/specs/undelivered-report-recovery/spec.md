# undelivered-report-recovery Specification

## Purpose
TBD - created by archiving change recover-undelivered-worker-reports. Update Purpose after archive.

## Requirements

### Requirement: Single source of undelivered-report reception

`sai/policies/worker-report-transport.md` SHALL hold a `## Undelivered reports` section that is the single source of how a coordinator recovers a worker report that is saved in the report directory while its reference never reached the coordinator. The rules SHALL apply to every worker that reports through that policy, on Claude Code and opencode alike, whether cache warming is on or off. The `budget-*` helpers, which reply in text, and the `--no-specs` POC, which keeps its own transport, SHALL stay outside it. Each coordinator that receives reports through the policy (implement, review, audit, deep-review, the plan cycle, commit, archive, backfill, merge, and Direct Build) SHALL point to that section and SHALL NOT restate it; archive and backfill apply it on their ordinary route.

#### Scenario: Every receiving coordinator points to the section

- **WHEN** a coordinator card that receives worker reports through the transport policy is read
- **THEN** it names `worker-report-transport.md` § Undelivered reports

#### Scenario: Helpers stay outside the recovery

- **WHEN** a coordinator waits for a `budget-*` helper or for the `--no-specs` POC
- **THEN** the undelivered-report rules do not apply

### Requirement: Accepted references are recorded and duplicates ignored

After a coordinator has processed a report reference, it SHALL record it with `transfer.js accept` in the ledger of the report directory. A report that fails validation SHALL be recorded after it is returned to its author as invalid. For every reference, from a worker message or from the watch, the coordinator SHALL look it up with `transfer.js accept --check`: for a terminal report inside the paired check of § Receiver boundary, which issues the validation in the same turn, and for a progress report before its emit. A reference already in the ledger (same `path` and `sha256`) SHALL be treated like a wake acknowledgement (`sai/policies/cache-warming.md` § Wake acknowledgement): no validation result acted on, no event emitted, no attempt spent, and no continuation sent. Because the ledger lives in the report directory that the run state keeps, a reference accepted before a context compaction or a resumed run SHALL NOT be processed again.

#### Scenario: A repeated reference costs nothing

- **WHEN** a worker's wake repeats a reference that the coordinator already accepted
- **THEN** the coordinator acts on no validation result, emits nothing, spends no attempt, and sends no continuation

#### Scenario: Acceptance survives compaction

- **WHEN** a coordinator resumes after a context compaction and receives a reference that the ledger already holds
- **THEN** it does not process that report again

### Requirement: Background watch while waiting for a worker

Each time a coordinator starts waiting for the result of a worker that reports through the transport policy, it SHALL launch `transfer.js watch --dir <report-dir> --input-file <paths-file> --cwd <project root>` in the background (Claude Code `Bash` with `run_in_background: true` and the description `watch-reports`; opencode shell with `background: true`), whatever the warming setting, with the input file holding the paths the worker's brief lets it write, or `[]` when the report directory is the only place the worker writes. Every relaunch of a watch for the same worker task (after an empty end, after a first `silent`, and for a replacement worker) SHALL pass the same input file. When the watch exits 2 because `--input-file` is missing, the coordinator SHALL relaunch it with the file and SHALL spend no obstacle attempt. When the watch ends with an empty list and not `silent`, the coordinator SHALL launch it again, SHALL send nothing to the worker, and SHALL write nothing to the user. When the watch ends `silent`, the coordinator SHALL handle it as an obstacle of the step under the existing budget, with no user question of its own: the first `silent` asks the same worker once for its report and relaunches the watch, and a second consecutive `silent` with no report between them replaces the worker. When the expected result arrives by any path, the coordinator SHALL stop the watch (Claude Code `TaskStop`, opencode removal of its shell), and SHALL also stop it before it disposes the worker and closes the report directory; a later firing SHALL have no effect. When the watch cannot be launched (no shell, permission refused), the coordinator SHALL print one notice and continue without it, and the run SHALL NOT stop. On cache-warming responses the coordinator SHALL follow `cache-warming.md` for the main-session continuation check or subagent protocol, as applicable. Only the watch SHALL look for undelivered reports; a warming notification SHALL NOT trigger report polling.

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
- **THEN** it follows the applicable warming protocol without polling for undelivered reports or duplicating running work, leaving report discovery to the watch

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

When the watch ends with reports, the coordinator SHALL process each in creation order exactly as if the worker had delivered it: the duplicate check, the validation (a `progress-` report goes to the step machine's progress emit), the same invalid-report recovery that counts as an obstacle attempt, and then the record. A worker message that is not a reference, such as a wake acknowledgement, a translated or reworded literal, or "Ending this turn", SHALL NOT be a result: the coordinator SHALL keep waiting with the watch armed. A worker turn that ends with the wake literal, the stop literal, or `ok` instead of its report reference SHALL trigger the same recovery. `sai/policies/worker-report-transport.md` SHALL name the wake and stop literals by their term with a pointer to `sai/policies/cache-warming.md`, and SHALL spell neither literal nor a bare `ok`.

#### Scenario: A found report is processed as delivered

- **WHEN** the watch reports a saved report whose reference never arrived
- **THEN** the coordinator validates and processes it as if the worker had returned its reference

#### Scenario: An invalid found report is an obstacle attempt

- **WHEN** a report found by the watch fails validation
- **THEN** the coordinator applies the invalid-report recovery, counts one obstacle attempt, and records the reference so the watch does not report it again

#### Scenario: A non-result message keeps the wait

- **WHEN** a worker sends a message that carries no reference, such as a wake acknowledgement, a translated literal, or "Ending this turn"
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

The shared `coordinator` capability profile in `sai/install-manifest.json` SHALL allow `node {sai}/tools/transfer.js accept *` and `node {sai}/tools/transfer.js watch *`, so every coordinator profile that extends it can run both verbs on Claude Code and opencode.

#### Scenario: A coordinator may run accept and watch

- **WHEN** the capability profiles are compiled for a coordinator command
- **THEN** its shell grants include `transfer.js accept` and `transfer.js watch`

### Requirement: Terminal reports run a paired same-turn duplicate check and validation

For each terminal report reference after ready, the coordinator SHALL run the paired check of `sai/policies/worker-report-transport.md` § Receiver boundary: `transfer.js accept --check` and `worker-report-validator.js validate --kind terminal --command <command>` issued as two independent calls in one model response (a same-turn batch), on Claude Code and opencode alike. The coordinator SHALL read no field of the report before it has both answers. When `--check` answers `already: true`, the coordinator SHALL discard the validate result, spend no attempt, and send no continuation. On any other `--check` answer, the coordinator SHALL handle the validate result by the existing receiver rules, invalid-report recovery included. A call of the batch that comes back cancelled or without a result SHALL be re-issued alone in the next turn; that cancellation SHALL NOT be an obstacle attempt, and a validate result SHALL never be acted on without the `--check` answer of the same reference. The paired check SHALL cover terminal reports only: a `progress-` report SHALL keep `accept --check` and `sai-state emit … --progress` in sequence, because the emit advances the step machine and never runs speculatively. The paired check SHALL be stated only in that policy, and `sai/tools/transfer.js` and `sai/tools/worker-report-validator.js` SHALL stay unchanged.

#### Scenario: A duplicate terminal report discards its validation

- **WHEN** the paired check runs for a terminal reference and `accept --check` answers `already: true`
- **THEN** the coordinator discards the validate result, spends no attempt, and sends no continuation

#### Scenario: A new terminal report follows the receiver rules

- **WHEN** the paired check runs for a terminal reference and `accept --check` does not answer `already: true`
- **THEN** the coordinator handles the validate result by the existing receiver rules, including invalid-report recovery

#### Scenario: A cancelled call of the pair is re-issued alone

- **WHEN** one call of the paired batch comes back cancelled or without a result
- **THEN** the coordinator re-issues that call alone in the next turn, counts no obstacle attempt, and acts on no validate result before it has the `--check` answer of the same reference

#### Scenario: A progress report keeps the sequential order

- **WHEN** the coordinator receives a `progress-` report reference
- **THEN** it runs `accept --check` first and runs `sai-state emit … --progress` only after the check does not answer `already: true`

### Requirement: Each coordinator SHALL state its worker's writable paths as a fact of its own card

Every report-receiving coordinator card SHALL name the writable paths of its worker as a fact of that card, while the watch mechanics SHALL stay single-sourced in `sai/policies/worker-report-transport.md` § Undelivered reports. The paths SHALL reach the watch as the required input file, written once per worker task in a directory outside the report directory. The facts SHALL be:

- `/sai-3-implement`: the paths the step's brief lets the worker write, plus the worker's scratch folder in the run directory.
- Direct Build: for the implementer, the repository paths the verified block cites, written without their `:line` ranges, plus its scratch folder `scratch-implementer` in the slice run directory; for the backfill worker, its transfer directory; for the archive worker, `[]`.
- `/sai-1-spec`, `/sai-2-design`, and `/sai-plan`: `openspec/changes/{name}/`, `GLOSSARY.md` in the spec segment, plus the scratch folder `scratch-{segment}` in the run directory.
- `/sai-merge`: the files the worker's brief names, plus the scratch folder `scratch` in the run directory.
- `/sai-4-review`: `openspec/changes/{name}/review.md` plus a scratch folder opened with `transfer.js open`.
- The audit coordinator: the audit's report plus a scratch folder opened with `transfer.js open`.
- `/sai-commit` and `/sai-archive`: `[]`.
- `/sai-backfill`: its transfer directory.

The rule SHALL be the same on Claude Code and opencode.

#### Scenario: Direct Build implementer paths drop line ranges
- **WHEN** the verified block cites `sai/tools/transfer.js:41-57`
- **THEN** the implementer's writable paths list `sai/tools/transfer.js`, without the line range, beside its scratch folder

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
