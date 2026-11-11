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

After a coordinator has processed a report reference, it SHALL record it with `transfer.js accept` in the ledger of the report directory. A report that fails validation SHALL be recorded after it is returned to its author as invalid. Before it validates any reference, from a worker message or from the watch, the coordinator SHALL look it up with `transfer.js accept --check`; a reference already in the ledger (same `path` and `sha256`) SHALL be treated like an `ok`: no validation, no event emitted, no attempt spent, and no continuation sent. Because the ledger lives in the report directory that the run state keeps, a reference accepted before a context compaction or a resumed run SHALL NOT be processed again.

#### Scenario: A repeated reference costs nothing

- **WHEN** a worker's wake repeats a reference that the coordinator already accepted
- **THEN** the coordinator validates nothing, emits nothing, spends no attempt, and sends no continuation

#### Scenario: Acceptance survives compaction

- **WHEN** a coordinator resumes after a context compaction and receives a reference that the ledger already holds
- **THEN** it does not process that report again

### Requirement: Background watch while waiting for a worker

Each time a coordinator starts waiting for the result of a worker that reports through the transport policy, it SHALL launch `transfer.js watch --dir <report-dir>` in the background with its defaults (Claude Code `Bash` with `run_in_background: true` and the description `watch-reports`; opencode shell with `background: true`), whatever the warming setting. When the watch ends with an empty list, the coordinator SHALL launch it again, SHALL send nothing to the worker, and SHALL write nothing to the user. When the expected result arrives by any path, the coordinator SHALL stop the watch (Claude Code `TaskStop`, opencode removal of its shell), and SHALL also stop it before it disposes the worker and closes the report directory; a later firing SHALL have no effect. When the watch cannot be launched (no shell, permission refused), the coordinator SHALL print one notice and continue without it, and the run SHALL NOT stop. The coordinator's own cache-warming wake SHALL keep performing no work; only the watch looks for reports.

#### Scenario: The watch runs with warming off

- **WHEN** a coordinator with cache warming off waits for a worker's result
- **THEN** a `transfer.js watch` process over that worker's report directory runs in the background

#### Scenario: An empty watch is relaunched silently

- **WHEN** the watch ends at its maximum with an empty list
- **THEN** the coordinator launches it again and sends no message to the worker or the user

#### Scenario: A watch that cannot start does not stop the run

- **WHEN** launching the watch fails because no shell is available or the permission is refused
- **THEN** the coordinator prints one notice and keeps waiting for the worker without the watch

### Requirement: Found reports follow the delivered-report path

When the watch ends with reports, the coordinator SHALL process each in creation order exactly as if the worker had delivered it: the duplicate check, the validation (a `progress-` report goes to the step machine's progress emit), the same invalid-report recovery that counts as an obstacle attempt, and then the record. A worker message that is neither a reference nor `ok`, such as "Ending this turn", SHALL NOT be a result: the coordinator SHALL keep waiting with the watch armed.

#### Scenario: A found report is processed as delivered

- **WHEN** the watch reports a saved report whose reference never arrived
- **THEN** the coordinator validates and processes it as if the worker had returned its reference

#### Scenario: An invalid found report is an obstacle attempt

- **WHEN** a report found by the watch fails validation
- **THEN** the coordinator applies the invalid-report recovery, counts one obstacle attempt, and records the reference so the watch does not report it again

#### Scenario: A non-result message keeps the wait

- **WHEN** a worker sends a message that carries neither a reference nor exactly `ok`
- **THEN** the coordinator records no result and keeps waiting with the watch armed

### Requirement: One watch per report directory for parallel workers

When several workers run in parallel, the coordinator SHALL watch each report directory separately and SHALL attribute a report to the worker of its directory. In `/sai-deep-review`, each audit cycle SHALL have one watch on that cycle's own report directory, and the driving session SHALL process the found reports in the fixed order of its `sai-state` calls and commits.

#### Scenario: Parallel audits are watched separately

- **WHEN** `/sai-deep-review` runs several audit cycles at once
- **THEN** each cycle's report directory has its own watch and a report found there belongs to that cycle's worker

### Requirement: Coordinator profiles grant the recovery verbs

The shared `coordinator` capability profile in `sai/install-manifest.json` SHALL allow `node {sai}/tools/transfer.js accept *` and `node {sai}/tools/transfer.js watch *`, so every coordinator profile that extends it can run both verbs on Claude Code and opencode.

#### Scenario: A coordinator may run accept and watch

- **WHEN** the capability profiles are compiled for a coordinator command
- **THEN** its shell grants include `transfer.js accept` and `transfer.js watch`
