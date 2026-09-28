# step-machine-progress-emit Specification

## Purpose
TBD - created by archiving change emit-validates-progress. Update Purpose after archive.

## Requirements

### Requirement: Progress emit validates before any store read
`bin/sai-state.js` SHALL provide `emit <id> <machineId> --progress [--with-overview true|false] -`, which reads one worker progress payload from stdin. It SHALL validate the raw, unnormalized stdin text through the worker-report validator module with kind `progress` before any session, machine or registry read. An invalid verdict SHALL be written as `{validation}` with exit code 1, SHALL read no store, and SHALL leave the machine untouched. Non-JSON stdin SHALL yield `validation.ok: false` and never `EVENT_UNPARSEABLE`. An invalid payload sent to an unknown or version-mismatched machine SHALL report the invalid verdict, never the machine error.

#### Scenario: Shape-invalid payload never reaches the machine
- **WHEN** a payload missing `step_ids` is piped to `emit <id> spec-standalone@1 --progress -`
- **THEN** the process exits 1 with `validation.ok` false and its `errors`, and the session file is unchanged

#### Scenario: Non-JSON stdin is an invalid verdict
- **WHEN** `not-json` is piped to `emit <id> spec-standalone@1 --progress -`
- **THEN** the output carries `validation.ok` false with the validator's invalid-JSON error and no `reason: "EVENT_UNPARSEABLE"`

#### Scenario: Validation wins over a corrupt store or wrong machine
- **WHEN** an invalid payload is piped to a progress emit whose session file is corrupt or whose machine id mismatches the registry version
- **THEN** the output reports only the invalid `validation` block, with no `SESSION_FILE_CORRUPT` warning and no `VERSION_MISMATCH` error

### Requirement: Progress verdict parity and single clock
`sai/tools/worker-report-validator.js` SHALL export a pure `validateText(text, kind)` function that builds the closed verdict (`ok`, `action`, `kind`, `errors`, and `validated_at` on a valid verdict) from stdin text. Both the `validate` CLI and the progress emit SHALL obtain their verdict from it, so the verdict shape and the `validated_at` clock stay single-sourced. The progress emit SHALL return a `validation` block identical to what `worker-report-validator.js validate --kind progress --json` returns for the same stdin bytes. `validate --kind progress` SHALL remain available and behave identically.

#### Scenario: BOM-prefixed and padded payloads get the same verdict
- **WHEN** the same BOM-prefixed or whitespace-padded progress payload is sent to both `validate --kind progress --json` and a progress emit
- **THEN** the `ok` and `errors` of both verdicts are identical

#### Scenario: Validator CLI output is unchanged
- **WHEN** a payload of any kind is piped to `worker-report-validator.js validate --kind <kind>`
- **THEN** the verdict shape, `validated_at` format, and exit codes are the same as before the extraction

### Requirement: Progress emit derives the event and returns the verdict with the routing
On a valid verdict the progress emit SHALL derive the machine event `{"step_ids": payload.step_ids}` and apply it through the same transition logic as an event emit. It SHALL write one object carrying `validation` plus the ordinary emit fields (`stage`, `next`, `rejected?`, `warnings?`, or `error` with `next`), unchanged. Exit code 1 SHALL cover both an invalid verdict and a machine error, and callers SHALL discriminate by `validation.ok`. A valid verdict that meets a store failure (`SESSION_FILE_CORRUPT`, `VERSION_MISMATCH`, `UNKNOWN_MACHINE`, or an unreachable store) SHALL keep its `validation` block and `validated_at` unaltered alongside the machine's error or warnings. An empty `step_ids` list SHALL be valid and SHALL leave the pointer where it was. Undeclared ids SHALL validate and the machine SHALL ignore them.

#### Scenario: Valid payload validates and advances in one call
- **WHEN** a valid progress payload reporting `prereqs-and-change` is piped to `emit <id> spec-standalone@1 --progress -` after reset
- **THEN** the process exits 0 with `validation.ok` true, a `validated_at`, and the `next.follow` of the following step

#### Scenario: Store failure keeps the verdict intact
- **WHEN** a valid progress payload is piped to a progress emit whose session file is corrupt or whose machine id mismatches the registry version
- **THEN** the output carries `validation.ok` true with its `validated_at` plus the machine's `SESSION_FILE_CORRUPT` warning or `VERSION_MISMATCH` error

#### Scenario: Empty step_ids leaves the pointer unchanged
- **WHEN** a valid progress payload with `step_ids: []` is piped to a progress emit
- **THEN** the process exits 0 with `validation.ok` true and the same `next.follow` as before

### Requirement: Design variant option on the progress emit
The progress emit SHALL accept `--with-overview true|false` only on `design-standalone@1` and SHALL add `withOverview` to the derived event. On any other machine, or with a value other than `true` or `false`, it SHALL be a usage error with exit code 2. The coordinator SHALL pass the option on the first progress emit after the segment's machine reset, even when that event reports no ids, and SHALL omit it on later progress emits.

#### Scenario: First emit seeds the design variant
- **WHEN** the design coordinator's first progress emit after reset passes `--with-overview true` with `step_ids: []`
- **THEN** the machine adopts the opted-in seven-step plan

#### Scenario: Option on another machine is a usage error
- **WHEN** `--with-overview true` is passed to a progress emit on `spec-standalone@1`
- **THEN** the process exits 2 with a stderr message naming `design-standalone@1`

### Requirement: Validator module resolution relative to the store CLI
The progress emit SHALL load the validator module relative to `bin/sai-state.js` from two fixed candidates, in order: `../tools/worker-report-validator.js` (installed layout `sai/{bin,sai-state,tools}`), then `../sai/tools/worker-report-validator.js` (source layout `{bin,sai-state,sai/tools}`). When neither exists, it SHALL exit 2 naming the tried paths and SHALL never emit without validation. The invocation SHALL be byte-identical whichever tool-resolution candidate for `sai-state.js` wins.

#### Scenario: Missing validator never emits
- **WHEN** a progress emit runs from a layout where neither validator candidate exists
- **THEN** the process exits 2 with a stderr message naming both tried paths and the session is unchanged

#### Scenario: Installed layout resolves the validator
- **WHEN** a progress emit runs from a copy laid out as `sai/{bin,sai-state,tools}`
- **THEN** it loads `sai/tools/worker-report-validator.js` and validates the payload

### Requirement: Progress mode accepts only progress payloads and leaves event emits unchanged
A terminal, notice, `needs_input`, or `conflict_detected` payload piped to a progress emit SHALL return `validation.ok: false`. Those kinds SHALL keep validating through `worker-report-validator.js validate --kind <kind>`. `emit` without `--progress` SHALL keep its shape, operation order, and exit codes for every machine, including `explore-idea`, `explore-slice`, `apply-standalone`, and `recovery-ledger`.

#### Scenario: Non-progress kind is rejected
- **WHEN** a terminal `completed` payload is piped to a progress emit
- **THEN** the output carries `validation.ok` false and the machine is untouched

#### Scenario: Event emit is unchanged
- **WHEN** an event JSON is piped to `emit <id> explore-idea@1 -` without `--progress`
- **THEN** the output and exit code carry no `validation` field and match the pre-change contract

### Requirement: Step-machine coordinators route progress through the progress emit
When the active adapter declares a `step_machine`, the coordinator SHALL pipe the worker's progress payload, as received, into the progress emit instead of running a separate `validate --kind progress` call and then hand-composing event JSON. An invalid `validation` block SHALL take the existing malformed-payload route. The Milestone Stamp SHALL read `validation.validated_at` with no conversion. The same invocation SHALL apply on Claude Code and opencode, with no `allowed-tools` entry added or removed and no opencode permission field added. Meta-review SHALL keep its security → performance → accessibility single-writer order. Questions, feedback, `continue_after_recovery`, and replacement-worker reconstruction SHALL invoke no emit. Adapters without a `step_machine` SHALL keep the separate `validate --kind progress` call.

#### Scenario: One call validates and routes a progress event
- **WHEN** a step-machine coordinator receives a worker progress event
- **THEN** it runs one progress emit and builds the two-line pointer continuation from that call's `next.follow`

#### Scenario: Stamp comes from the validation block
- **WHEN** a step-machine progress emit marks a step completed
- **THEN** the step's Milestone Stamp is the `HH:mm` of `validation.validated_at` with no wall-clock call

### Requirement: Progress emit behavior is tested through the spawned CLI
The repository SHALL test the progress emit by spawning `node bin/sai-state.js emit … --progress -` as a real process. The tests SHALL cover invalid shapes, non-JSON stdin, verdict parity, validation-before-store-read, store failures with the verdict intact, a missing validator module, the installed layout, `--with-overview` seeding and misuse, empty `step_ids`, non-progress kinds, and unchanged plain emit. The existing validator tests SHALL pass unchanged.

#### Scenario: Suite exercises the real process
- **WHEN** `test/sai-state-progress-emit.test.js` runs
- **THEN** every progress-emit case spawns the CLI and asserts on its stdout JSON, stderr, and exit code
