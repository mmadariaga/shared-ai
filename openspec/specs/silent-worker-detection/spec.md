# silent-worker-detection Specification

## Purpose
TBD - created by archiving change detect-silent-workers. Update Purpose after archive.

## Requirements

### Requirement: The report watch SHALL end silent after a window without worker activity

`sai/tools/transfer.js watch` SHALL accept `--silent-after <window>` (default 20 minutes; a bare whole number is minutes, and a whole number followed by `ms`, `s`, `m`, or `h` is accepted) and SHALL end with `ended: silent`, an empty `reports` list, and `silent_for_ms` when, for the whole window, no file of the report directory other than the marker and the ledger was created or changed and no file below the writable paths named by `--input-file` changed its modification time. The window MUST start no earlier than the start of the watch. A settled undelivered report MUST be reported before silence. A non-positive or malformed window MUST be refused as a usage error.

#### Scenario: No activity for the whole window ends the watch silent
- **WHEN** a watch runs with `--silent-after 20` and neither the report directory nor any writable path changes for 20 minutes
- **THEN** the watch ends with `ended: silent`, an empty `reports` list, and `silent_for_ms` of at least the window

#### Scenario: A changed writable path or a new draft counts as activity
- **WHEN** a file below a writable path changes its modification time, or a draft file appears in the report directory, during the window
- **THEN** the watch does not end silent at that moment and measures silence from that activity

#### Scenario: An untouched path is not silent at once
- **WHEN** a watch starts on a writable path whose files were last modified long before the watch started
- **THEN** the watch does not end silent until the full window has passed since the watch started

#### Scenario: A settled report wins over silence
- **WHEN** the report directory holds a settled report that is not in the ledger
- **THEN** the watch ends with that report in `reports` and not with `ended: silent`

#### Scenario: A bad window is refused
- **WHEN** the watch is invoked with `--silent-after 0` or a value that is not a whole number with an optional unit
- **THEN** the call fails with a usage error and does not watch

### Requirement: The watch SHALL read the worker's writable paths from an input file

The watch SHALL accept `--input-file <path>` holding JSON that is either an array of non-empty strings or an object with a `paths` array of non-empty strings, each resolved against `--cwd` (default the working directory) when relative. A directory path MUST count every file below it, skipping `.git` and `node_modules`. Input that is not such JSON MUST be refused as a usage error. Without the input file, only the report directory MUST count as activity.

#### Scenario: Relative writable paths resolve against the project root
- **WHEN** the input file holds `["src/module.js"]` and the watch runs with `--cwd /project`
- **THEN** the watch treats `/project/src/module.js` as a writable path

#### Scenario: Malformed input is refused
- **WHEN** the input file holds invalid JSON or an array with a non-string entry
- **THEN** the watch fails with a usage error naming the accepted forms

### Requirement: A coordinator SHALL treat a silent watch as an obstacle of the step

A coordinator that waits for a worker under the undelivered-report recovery of `sai/policies/worker-report-transport.md` SHALL pass the paths the worker's brief lets it write as the watch's writable paths when the worker writes outside the report directory, and SHALL handle `ended: silent` as an ordinary obstacle of the step under the existing budget of 3 attempts, with no user question of its own. The first `silent` MUST ask the same worker once for its report without repeating work and relaunch the watch; a second consecutive `silent` with no report between them MUST replace the worker with a coordinator-written hand-over. Each counts as one attempt. Claude Code and opencode MUST behave alike.

#### Scenario: First silent asks the same worker
- **WHEN** a `/sai-3-implement` coordinator's watch for a RED or GREEN worker ends `silent` for the first time in a run of consecutive silent results
- **THEN** the coordinator records one attempt of the step's obstacle, asks the same worker once for its result or blocker, and launches the watch again

#### Scenario: Second consecutive silent replaces the worker
- **WHEN** the relaunched watch ends `silent` again with no report found between the two
- **THEN** the coordinator records a second attempt and replaces the worker with a hand-over, without asking the user

#### Scenario: A report ends the silent run
- **WHEN** the worker answers the ask, or a report is found, after a first `silent`
- **THEN** the next `silent` counts as a first silent again
