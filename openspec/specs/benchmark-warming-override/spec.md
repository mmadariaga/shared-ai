# benchmark-warming-override Specification

## Purpose
TBD - created by archiving change subagent-cache-warming-core. Update Purpose after archive.

## Requirements

### Requirement: Permitted warming override

Before it measures, `sai-context-cache-ttl-benchmark` SHALL ask the user through the native picker for permission to write a warming override, stating that it replaces the `warming` entry of `.sai/settings.local.jsonc` (creating the file when absent), that every SAI session in the project stops warming from its next arm, that a wait another session already armed can still wake once, that the user's comments in that file are absent while it measures, and that an interrupted run leaves warming off until the next run restores the file. When the user declines, the benchmark SHALL stop without measuring and write nothing. With permission, the `warming_override.js apply` action SHALL record the file's exact bytes, or the fact that it was absent, plus the hash of the override, in a restoration record under the SAI temp root, then write the file's current values re-serialized with `warming` off for both roles. `apply` SHALL refuse with `ok: false` when a restoration record is waiting (`record-found`), when the local file cannot be parsed as a JSON object (`unreadable`), or when the write fails (`write-failed`, removing the record it wrote). The helper SHALL use no `jsonc-parser` dependency.

#### Scenario: User declines
- **WHEN** the user declines the warming override permission
- **THEN** the benchmark stops without measuring and `.sai/settings.local.jsonc` is unchanged

#### Scenario: Override created on an absent file
- **WHEN** `.sai/settings.local.jsonc` is absent and the user grants permission
- **THEN** `apply` records the file as absent and creates it with `warming` off for both roles

#### Scenario: Unparseable local file
- **WHEN** the local file cannot be parsed as a JSON object
- **THEN** `apply` returns `ok: false` with status `unreadable` and does not overwrite the file

### Requirement: Verified quiet before measuring

After it writes the override and before it measures, the benchmark SHALL stop the wait its own session armed, dispose every agent that session keeps armed, and run `verify`, which SHALL report `ok: true` only when the resolver returns `off` for both roles. When any check fails, the benchmark SHALL restore the prior state and stop without measuring.

#### Scenario: Verification fails
- **WHEN** `verify` reports a role whose warming is not `off`
- **THEN** the benchmark runs `restore` and stops without measuring

### Requirement: Byte-exact restoration

Whatever ends the run (a declined plan consent, a successful or failed measurement, or cancellation), the benchmark SHALL run `restore` as its last tool call before the final report. `restore` SHALL write the recorded bytes back, or delete the file when it was absent before, and remove the record. When the file's hash no longer matches the written override, `restore` SHALL leave the file in place, move the record aside as a `.stale` copy, and return a warning that restoring it is up to the user, which the report repeats. At start, a `status` that returns `record-found` SHALL lead the benchmark to run `restore` first and then ask for permission again.

#### Scenario: Restore after a measurement
- **WHEN** a measurement ends and the local file still holds the written override
- **THEN** `restore` writes the original bytes back exactly and deletes the restoration record

#### Scenario: Changed file is left in place
- **WHEN** the local file changed after the override was written
- **THEN** `restore` leaves it as it is, keeps the original in a `.stale` record, and warns that restoring it is up to the user

#### Scenario: Interrupted earlier run
- **WHEN** the benchmark starts and `status` returns `record-found`
- **THEN** it runs `restore`, reports the result, and asks for permission again before writing a new override
