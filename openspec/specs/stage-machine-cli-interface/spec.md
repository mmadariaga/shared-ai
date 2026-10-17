# stage-machine-cli-interface Specification

## Purpose
TBD - created by archiving change replace-state-sidecar-with-cli. Update Purpose after archive.

## Requirements

### Requirement: Deterministic UUID derivation

The `spawn --key <stable-key>` verb SHALL derive a well-formed UUIDv4 from the stable key by hashing with SHA-256, then fixing the version (4) and variant (RFC 4122) nibbles in the resulting string, producing a value that:
- Matches the pattern `^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$` (case-insensitive)
- Remains stable across multiple invocations with the same key
- Allows callers to predict the session id from the key without a separate lookup

#### Scenario: Same key always derives the same session id

- **WHEN** `spawn --key mykey` is invoked twice
- **THEN** both invocations return the same `{id}` value

#### Scenario: Different keys derive different session ids

- **WHEN** `spawn --key key1` and `spawn --key key2` are invoked
- **THEN** the returned `id` values differ

### Requirement: Session file store on local filesystem

The store SHALL persist each session's state in a JSON file under `$TMPDIR/sai-state/<id>.json` (or platform equivalent) with owner-only permissions (0600 semantics, closest Windows equivalent). File writes SHALL be atomic using temp-file-plus-rename so a process crash mid-write never leaves a truncated session file.

#### Scenario: Session file stores persisted machine state

- **WHEN** `emit` applies a transition and persists the outcome
- **THEN** the session file contains the per-machine ledger and state in JSON form `{createdAt, stateVersion, stateByMachine: {machineId: {state, rev, lastEventId, lastOutcome}}}`

#### Scenario: Reset atomically updates machine state

- **WHEN** `reset <id> <machineId>` is invoked with other machines in the session
- **THEN** the session file is atomically rewritten with only that machine reset to initialState and other machines' state preserved

#### Scenario: Close deletes the session file

- **WHEN** `close <id>` is invoked
- **THEN** the session file is deleted from the store directory

### Requirement: Closed error vocabulary via JSON error field

Every failed emit (invalid event, unknown machine, version mismatch) SHALL return a JSON response. The response SHALL carry a mandatory `error` field with one of the closed-vocabulary values `INVALID_EVENT`, `UNKNOWN_MACHINE`, `VERSION_MISMATCH`, `ALREADY_RUNNING`, or `READINESS_IS_NOT_INTENT`. It SHALL also carry the current state's `next` pointer. An `INVALID_EVENT` caused by an event read from stdin that cannot be parsed SHALL additionally carry `reason: "EVENT_UNPARSEABLE"`. A block amendment rejected because stdin carries more than one block SHALL carry `reason: "AMEND_BLOCK_COUNT"`, and one rejected because the block's change name differs from the amended slice SHALL carry `reason: "AMEND_NAME_MISMATCH"`. A block emit rejected because the same session's `explore-idea@1` stage is not `crystallize` SHALL carry `reason: "STAGE_NOT_CRYSTALLIZE"` and the found `stage`, with the `explore-idea@1` pointer as its `next`. A file-backed block emit composition failure SHALL carry `reason: "BLOCK_COMPOSITION_FAILED"` with `error: "INVALID_EVENT"` and exit 1 before any state read or write; this pre-state failure need not carry `next`. Every other failed emit SHALL carry no `reason`. Exit code SHALL be 1. In progress mode, stdin that fails validation, including stdin that is not JSON, SHALL produce an invalid `validation` block with exit code 1 and no `error` field, and never `EVENT_UNPARSEABLE`. A machine error after a valid verdict SHALL carry the same `error` vocabulary alongside `validation`. Reset failures also return `error` with closed-vocabulary values, but without a `next` pointer. The `block` verb SHALL answer a missing block with `{error: "BLOCK_NOT_FOUND"}` and export failures with `{error: "BLOCK_EXPORT_FAILED", reason}`, exit 1 and no `next`.

#### Scenario: Invalid machineId returns INVALID_EVENT

- **WHEN** `emit` is called with a missing or unparsable `machineId`
- **THEN** the response carries `{error: "INVALID_EVENT", next: {follow, hint}}` with no `reason`

#### Scenario: Unparseable event returns INVALID_EVENT with reason

- **WHEN** `emit` reads event text from stdin that fails to parse as JSON
- **THEN** the response carries `{error: "INVALID_EVENT", reason: "EVENT_UNPARSEABLE", next: {follow, hint}}` with exit code 1 and no transition

#### Scenario: Unknown machine returns UNKNOWN_MACHINE

- **WHEN** `emit` is called with a registered `machineId` that is not in the code registry
- **THEN** the response carries `{error: "UNKNOWN_MACHINE", next: {follow, hint}}`

#### Scenario: Reset with unknown machine returns error without pointer

- **WHEN** `reset` is called with a machine id not in the code registry
- **THEN** the response carries `{error: "UNKNOWN_MACHINE"}` with exit code 1 and no `next` field

#### Scenario: Rejected amendment carries its reason

- **WHEN** a block amendment carries two blocks or a block for another change name
- **THEN** the response carries `{error: "INVALID_EVENT", reason: "AMEND_BLOCK_COUNT"}` or `{error: "INVALID_EVENT", reason: "AMEND_NAME_MISMATCH"}` with a `next` pointer and exit code 1

#### Scenario: Block emitted before crystallize carries its reason

- **WHEN** a dispatchable block set is emitted while the session's `explore-idea@1` stage is `explore-change`, `review-edge-cases`, or `implementation-details`
- **THEN** the response carries `{error: "INVALID_EVENT", reason: "STAGE_NOT_CRYSTALLIZE", stage}` with the `explore-idea@1` pointer and exit code 1

### Requirement: Minimal wire outcomes
Each CLI verb SHALL return minimal JSON without state serialization, with `received_at` as the first key of every response:
- `spawn`: `{received_at, id}`
- `emit` success: `{received_at, stage, next: {follow, hint}, rejected?, warnings?}`
- `emit` failure: `{received_at, error: <name>, reason?, next: {follow, hint}}`, where the existing reason vocabulary additionally permits `STAGE_NOT_CRYSTALLIZE` and file-backed `BLOCK_COMPOSITION_FAILED`; composition failure before state reads omits `next`
- `emit --progress`: `{received_at, validation}` on an invalid verdict; on a valid verdict, `{received_at, validation, …}` followed by the `emit` success or failure fields above, unchanged
- `reset` success: `{received_at, reset: <machineId>}`, or `{received_at, reset: <machineId>, stage, next: {follow, hint}}` on a machine that exposes a first filed step
- `reset` failure: `{received_at, error: <name>}`
- `close`: `{received_at, closed: id}`
- `block` success: `{received_at, hash, text}`, or with export `{received_at, hash, block_file, transfer_dir}` without text
- `block` failure: `{received_at, error: "BLOCK_NOT_FOUND"}` or `{received_at, error: "BLOCK_EXPORT_FAILED", reason}`

The machine's internal state remains in the session file; no snapshot or state object is serialized to stdout.

#### Scenario: Emit response carries no state object
- **WHEN** `emit` applies a transition that advances the stage
- **THEN** the stdout JSON contains only `{received_at, stage, next, rejected?, warnings?}` without `state`, `snapshot`, or other internal fields

#### Scenario: Reset response carries only machine id
- **WHEN** `reset` completes successfully on a machine that exposes no first filed step
- **THEN** the stdout JSON contains only `{received_at, reset: <machineId>}` without `state`, `snapshot`, or other internal fields
- **AND** on a step machine it contains only `{received_at, reset, stage, next}`, still without `state`, `snapshot`, or other internal fields

### Requirement: Session file version and idempotency
Each session file SHALL carry a `stateVersion` field matching the CLI tool's version. The per-machine ledger (entry.lastEventId, entry.lastOutcome) SHALL be persisted for observability, but the implementation SHALL NOT enforce idempotent replay: `bin/sai-state.js` persists with a fixed empty eventId and does not compare incoming eventIds, so re-emitting the same `eventId` MUST NOT be specified as returning the identical prior outcome without re-applying the transition.

#### Scenario: Replay of same eventId returns stored outcome
- **WHEN** `emit <id> <machineId>` is called twice with the same event identifier
- **THEN** the specification documents ledger persistence only and makes no identical-response-without-advance promise; the second invocation MUST NOT be specified as returning the identical prior outcome without re-applying

### Requirement: No inter-process HTTP, no port discovery, no tokens

The store SHALL operate as a local-only service with no HTTP server, no listening port, no token file, no parent-process polling, and no health-check endpoint. Session state lives only in the temp directory file; callers locate sessions deterministically via the derived session id (from stable key) or carry the id in conversation state.

#### Scenario: No port or token in spawn response

- **WHEN** `spawn` is invoked
- **THEN** the response contains only `{id}` with no `port`, `token`, `pid`, or `reused` field

#### Scenario: No tombstone or delayed close

- **WHEN** `close` is invoked
- **THEN** the session file is deleted immediately with no tombstone delay, graceful shutdown period, or lingering liveness window

### Requirement: Event delivery on stdin
Except for the Ready to Propose block file form, the `emit` verb SHALL read its event JSON only from stdin, marked by `-` as the third and last positional argument, and SHALL read all of stdin as UTF-8. Before parsing, it SHALL strip a leading BOM (`U+FEFF`) and trim surrounding whitespace and line breaks. In progress mode, it SHALL instead pass the raw, unnormalized stdin text to the validator module, so its verdict matches `validate --kind progress` byte-for-byte. `--progress` is a flag that takes no value, so the following `-` stays positional. It SHALL return a usage error with exit code 2, without reading stdin, in any of these cases:
- the id or machine id is missing;
- the third positional argument is not `-`;
- any positional argument follows `-`;
- stdin is an interactive terminal.
The usage-error stderr message SHALL show the canonical form `echo '<json>' | node <tool-path> emit <id> <machineId> -`, or in progress mode the progress form `echo '<progress-payload-json>' | node <tool-path> emit <id> <machineId> --progress [--with-overview true|false] -`. Characters degraded to `?` by the sending shell SHALL be accepted as received, without error. The `spawn`, `reset`, and `close` verbs SHALL be unchanged.

#### Scenario: BOM and CRLF around a valid event are accepted
- **WHEN** the caller pipes `﻿{"intent":"next-step"}\r\n` to `emit <id> explore-idea@1 -`
- **THEN** the process exits 0 with a `stage` in the response, no `reason`, and nothing written to stderr

#### Scenario: Event JSON passed as an argument is a usage error
- **WHEN** the caller invokes `emit <id> explore-idea@1 '{"intent":"next-step"}'`
- **THEN** the process exits 2 without reading stdin, writes no JSON payload to stdout, and writes a stderr message showing the `emit <id> <machineId> -` stdin form

#### Scenario: Missing marker or extra arguments is a usage error
- **WHEN** the caller invokes `emit <id> <machineId>` without `-`, or `emit <id> <machineId> - extra`
- **THEN** the process exits 2

#### Scenario: Payload with spaces and degraded characters is accepted
- **WHEN** the caller pipes `{"recordedList":["E1","a b ?"]}` to `emit <id> explore-idea@1 -`
- **THEN** the process exits 0 and the event is applied as received

### Requirement: Delivery failure reason on unparseable events
When the normalized stdin text fails `JSON.parse`, `emit` SHALL answer `{error: "INVALID_EVENT", reason: "EVENT_UNPARSEABLE", next: {follow, hint}}` with exit code 1 and no transition. This SHALL apply to every parse failure of an event emit, including empty stdin, truncated JSON, trailing text, and broken or escaped quotes. `emit` SHALL write one stderr line showing the canonical stdin form. For ordinary JSON events the `reason` field SHALL appear only on these delivery failures; Ready to Propose file composition separately permits `BLOCK_COMPOSITION_FAILED` before any state read or write. An `INVALID_EVENT` for a valid event that the machine rejects, or for a malformed machine id, SHALL carry no `reason`, and neither SHALL `UNKNOWN_MACHINE` or `VERSION_MISMATCH`. In progress mode, a parse failure SHALL instead be an invalid `validation` verdict carrying the validator's invalid-JSON error, with no `reason` and no machine read. The store SHALL NOT detect quote-stripping or escaped-quote signatures and SHALL NOT write a hint pointing to a quoting section.

#### Scenario: Empty stdin is a delivery failure
- **WHEN** the caller invokes `emit <id> explore-idea@1 -` with empty stdin
- **THEN** the process exits 1 with `error: "INVALID_EVENT"`, `reason: "EVENT_UNPARSEABLE"`, and a `next` pointer, and stderr shows the `emit <id> <machineId> -` form

#### Scenario: Every parse failure carries the reason
- **WHEN** the caller pipes `{"intent":`, `{"intent":"plan"} extra`, `{\"intent\":\"plan\"}`, `{intent:plan}`, or `not-json` to `emit <id> explore-idea@1 -`
- **THEN** each invocation exits 1 with `error: "INVALID_EVENT"` and `reason: "EVENT_UNPARSEABLE"` and no transition

#### Scenario: Non-delivery failures carry no reason
- **WHEN** the caller pipes valid JSON to `emit <id> invalid-machine -` or to `emit <id> no-such-machine@1 -`
- **THEN** the responses carry `INVALID_EVENT` and `UNKNOWN_MACHINE` respectively with exit 1 and no `reason` field

### Requirement: Every JSON response carries received_at as its first key
Every stdout JSON response of `bin/sai-state.js` SHALL carry `received_at` as its first key: `spawn`, `reset`, `emit`, `emit --progress` and `close`, including responses with `rejected` or `warnings` (exit 0) and machine errors with exit 1 (`INVALID_EVENT`, `UNKNOWN_MACHINE`, `VERSION_MISMATCH`). The value SHALL be read once per invocation from the validator module's `generateReceivedAt`, in `YYYY-MM-DDTHH:MM:SS±HH:MM` form with local wall-clock time and a numeric offset, never `Z`. Usage errors (exit 2), a missing validator, IO errors and exceptions SHALL go to stderr and carry no time. Each field named in the other wire-outcome requirements follows `received_at`.

#### Scenario: Reset exposes the segment start time
- **WHEN** the caller invokes `sai-state reset <id> <machineId>` on a step machine
- **THEN** the response is `{received_at, reset, stage, next}` with `received_at` first

#### Scenario: Machine error responses carry the time
- **WHEN** `emit` returns `INVALID_EVENT`, `UNKNOWN_MACHINE` or `VERSION_MISMATCH` with exit 1
- **THEN** the stdout JSON's first key is `received_at` and stderr carries no time

### Requirement: Ready to Propose block emit

`sai-state emit <id> explore-slice@1 --ready-to-propose -` SHALL read a complete `Ready to Propose` block set as text from stdin, optionally followed by a line equal to `<<<VERDICTS>>>` and the bounded-judgment verdicts as a JSON array. It SHALL validate the set with the `dispatchable` profile of `sai/tools/ready-to-propose.js` before any session, machine, or registry read. `--ready-to-propose` SHALL be a flag that takes no value. A dispatchable set SHALL be accepted only while the same session's `explore-idea@1` stage is `crystallize`, where an absent `explore-idea@1` state counts as its initial `explore-change` stage; at any other stage the command SHALL record nothing, leave the machine untouched, answer `INVALID_EVENT` with `reason: "STAGE_NOT_CRYSTALLIZE"`, the found `stage`, and the `explore-idea@1` pointer, and exit 1. A single-slice amendment (`--amend <change-name>`) SHALL be outside this stage check. On a dispatchable verdict at the `crystallize` stage — structurally valid with every flagged line carrying a `context` verdict — the command SHALL derive `{"recordedList": [...]}` from the extracted change names in display order, advance the machine, store per change name each block's text, sha256 hash, and verdicts in the same session-file write, and return the ordinary emit fields. The set SHALL be validated as a whole: a non-dispatchable verdict SHALL exit 1, record no name, and leave the machine untouched. Every response SHALL carry `received_at` as its first key and a `validation` object `{ok, structural_ok, profile, blocks: [{index, line, violations, flagged}], violations, flagged, judgment: {ok, pending, violations, unknown, invalid}}`, where `ok` is true only for a dispatchable set, with no change names on the wire. These inputs SHALL be a delivery failure that answers `INVALID_EVENT` with `reason: "EVENT_UNPARSEABLE"` and a `next` pointer, exits 1, and makes no transition: empty stdin, stdin with no block heading, and a final block cut off before its `---` line. These SHALL be usage errors with exit 2: use on any machine other than `explore-slice@1`; combination with `--progress` or `--with-overview`; a missing id, machine id, or `-` marker; extra positional arguments; and interactive stdin. When the detector module is found in neither candidate location relative to the CLI, the command SHALL exit 2 and name the tried paths.

The block emit SHALL additionally accept `--block-file <path> --verdicts-file <path>` in place of stdin and its `-` marker, for both registration and amendment. It SHALL compose the files through the shared composer before validation or state reads. Composition failures SHALL answer `INVALID_EVENT` with `BLOCK_COMPOSITION_FAILED`, exit 1, and make no transition or write. Successful file composition SHALL enter the same dispatchable validation, crystallize gate, amendment rules, and storage behavior as stdin.

#### Scenario: Valid single block records its name

- **WHEN** a valid single block is piped to `emit <id> explore-slice@1 --ready-to-propose -` with no active slice while the session's `explore-idea@1` stage is `crystallize`
- **THEN** the process exits 0 with `validation.ok` true, stage `waiting`, and the route-selector pointer

#### Scenario: One invalid block fails the whole set

- **WHEN** a set with one valid block and one invalid block is piped
- **THEN** the process exits 1 with a `validation` that identifies the failing block by index, and the machine records nothing

#### Scenario: Duplicate change names fail validation

- **WHEN** two blocks carrying the same change name are piped
- **THEN** validation fails with exit 1 and nothing is recorded

#### Scenario: Empty or cut-off delivery is unparseable

- **WHEN** empty stdin, heading-less text, or a block cut off before its `---` line is piped
- **THEN** the process exits 1 with `error: "INVALID_EVENT"` and `reason: "EVENT_UNPARSEABLE"` and no transition

#### Scenario: Change names stay off the wire

- **WHEN** a valid block set is recorded
- **THEN** the response text contains none of the extracted change names

#### Scenario: Non-English prose validates

- **WHEN** a valid block whose field prose is written in another language is piped
- **THEN** validation passes and its change name is recorded

#### Scenario: Misuse is a usage error

- **WHEN** the option is used on another machine, combined with `--progress` or `--with-overview`, or given without either the `-` marker or paired file options
- **THEN** the process exits 2 with no transition

#### Scenario: Unjudged flagged line records nothing

- **WHEN** a structurally valid set with a flagged line and no verdict is piped
- **THEN** the process exits 1 with `validation.structural_ok` true, the line in `validation.judgment.pending`, and nothing recorded

#### Scenario: Block emitted before crystallize records nothing

- **WHEN** a dispatchable block set is piped while the session's `explore-idea@1` stage is `explore-change`, `review-edge-cases`, or `implementation-details`
- **THEN** the process exits 1 with `reason: "STAGE_NOT_CRYSTALLIZE"` and the found `stage`, and nothing is recorded

#### Scenario: Amendment is not stage-checked

- **WHEN** an accepted slice is amended with `--amend <change-name>` after the `explore-idea@1` stage has left `crystallize`
- **THEN** the amendment is processed without the stage check

### Requirement: Local CLI verb interface
The stage machine store SHALL provide five CLI verbs via the `sai-state` script:
1. `spawn --key <stable-key>` initializes or locates a session, deriving a deterministic UUIDv4 from the stable key, and returns `{received_at, id}` on success.
2. `emit <id> <machineId> -` applies a transition. It accepts the session id and target machine id as arguments and reads the JSON event object from stdin, and it returns the minimal wire outcome. In progress mode, `emit <id> <machineId> --progress [--with-overview true|false] -`, it instead reads a worker progress payload from stdin. It validates the payload, derives the event `{"step_ids": [...]}` from a valid payload, and returns the timeless verdict as `validation` alongside the minimal wire outcome and the top-level `received_at`. With `--ready-to-propose` on `explore-slice@1` it reads a block set as text, and with `--ready-to-propose --amend <change-name>` one amended block.
3. `reset <id> <machineId>` clears only that machine's state to its initialState with an atomic write, leaves other machines untouched, and returns `{received_at, reset: <machineId>}` on success. When the machine exposes a first filed step (the first step whose `follow` is a file), the success response additionally carries `stage` and `next: {follow, hint}` for that step; a machine without one, or whose lookup fails or yields a malformed pointer, returns only `{received_at, reset: <machineId>}`.
4. `close <id>` terminates a session by deleting the session file and returns `{received_at, closed: id}` on success.
5. `block <id> <change-name>` returns `{received_at, hash, text}` for one recorded slice's stored block, or `{received_at, error: "BLOCK_NOT_FOUND"}` with exit code 1 when the block is absent.
Each verb writes minimal JSON to stdout on success and writes error text to stderr on failure. Exit code 0 indicates success; exit code 1 or 2 indicates failure.

Ready to Propose registration and amendment SHALL also accept paired block/verdict file options, composed before validation without shell text re-encoding. `block --export --harness <claude|opencode>` SHALL validate the stored hash and return a private file/hash reference without text. Invalid or omitted export harness SHALL be a usage error with exit 2. Export failure SHALL return `BLOCK_EXPORT_FAILED` with exit 1. Existing non-export and ordinary event forms SHALL remain available.

#### Scenario: CLI spawn returns session id
- **WHEN** the caller invokes `sai-state spawn --key <key>` for a new or existing session
- **THEN** the process outputs a JSON `{received_at, id}` with exit code 0

#### Scenario: CLI emit returns minimal wire outcome
- **WHEN** the caller pipes an event JSON to `sai-state emit <id> <machineId> -`
- **THEN** the process exits 0 and outputs JSON `{received_at, stage, next, rejected?, warnings?}` on success. On failure it exits 1 and outputs `{received_at, error: <name>, reason?, next: {follow, hint}}`.

#### Scenario: CLI reset clears one machine and returns confirmation
- **WHEN** the caller invokes `sai-state reset <id> <machineId>` with a registered machine id
- **THEN** that machine's state is reset to its initialState with an atomic write, other machines in the session remain untouched, and the process outputs `{received_at, reset: <machineId>}` with exit code 0
- **AND** for each of the seven step machines the output also carries `stage` and `next` naming that machine's first filed step

#### Scenario: CLI reset with missing arguments returns usage error
- **WHEN** the caller invokes `sai-state reset` with missing id or machineId
- **THEN** the process exits with code 2 and writes a usage message to stderr

#### Scenario: CLI reset with unknown machine returns error
- **WHEN** the caller invokes `sai-state reset <id>` with a machine id not in the registry
- **THEN** the process outputs `{received_at, error: "UNKNOWN_MACHINE"}` with exit code 1

#### Scenario: CLI close deletes and returns confirmation
- **WHEN** the caller invokes `sai-state close <id>`
- **THEN** the session file is deleted from the store directory and the process outputs `{received_at, closed: id}` with exit code 0

#### Scenario: CLI block returns the stored block
- **WHEN** the caller invokes `sai-state block <id> <change-name>` for a recorded slice
- **THEN** the process outputs `{received_at, hash, text}` with exit code 0
