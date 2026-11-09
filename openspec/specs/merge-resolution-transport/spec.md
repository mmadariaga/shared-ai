# merge-resolution-transport Specification

## Purpose
TBD - created by archiving change transfer-file-references-merge. Update Purpose after archive.

## Requirements

### Requirement: Merge worker results travel as run-directory files

The merge coordinator SHALL open one report directory per run with `transfer.js open --harness <claude|opencode>`, through the `transfer.js open` grant the `merge-command` profile inherits from `coordinator`; the `merge-command` profile SHALL carry no `transfer.js` shell grant of its own. The merge worker SHALL save each step report in that report directory with `transfer.js put` and return only its `{path, sha256}` reference, with the `warming: true|false` line of `@sai/policies/cache-warming.md` beside it when a warming line reached it. Before reading any field the coordinator SHALL validate each reference with `worker-report-validator.js validate --kind terminal --command merge --json --report-dir <report directory> --report-file <path> --report-hash <sha256>`. It SHALL hand on the accepted references' paths (the strategy report to the `apply` step, the apply report to `merge.js resolution --source`), SHALL check an accepted apply report with `merge.js resolution --source <report>`, and SHALL give a replacement worker a hand-over file instead of reconstruction fields. `merge.js` SHALL keep its own `validateText(..., 'terminal', { command: 'merge' })` check of the apply report in `resolutionFromSource`, closed to the merge role fields.

#### Scenario: Apply report is checked from its path

- **WHEN** the worker returns the reference of an apply report
- **THEN** the coordinator validates it with `--command merge` and passes the accepted report's path to `merge.js resolution --source`, which validates the report again itself

#### Scenario: An invalid merge report is an obstacle

- **WHEN** the merge worker returns an inline result or a report whose status is `blocked`, `done`, or `escalate`
- **THEN** the validator rejects it and the coordinator treats it as an obstacle of the step it answers, reading none of its fields
