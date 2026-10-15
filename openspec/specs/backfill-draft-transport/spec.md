# backfill-draft-transport Specification

## Purpose
TBD - created by archiving change transfer-file-references-backfill. Update Purpose after archive.

## Requirements

### Requirement: One transfer directory per backfill invocation

The `/sai-backfill` coordinator, and the Explore Direct Build route for its backfill stage, SHALL run `transfer.js open --harness <claude|opencode>` for the active harness before the first backfill worker dispatch and SHALL keep the returned directory as invocation-scoped state. An `open` exit 2, such as a missing harness temp root, SHALL stop the route with the verbatim error before any dispatch and any final write. The directory SHALL remain available until the invocation closes, including between Direct Build prepare and execute, and at close — completed, failed, or cancelled, or for Direct Build when Step 6 is accepted or the route ends non-cleanly — the coordinator SHALL run `transfer.js close` once, removing only that directory.

#### Scenario: A missing temp root stops before dispatch

- **WHEN** `open` exits 2 at backfill invocation start
- **THEN** the coordinator reports the verbatim error and dispatches no worker and writes no file

#### Scenario: The directory survives until close

- **WHEN** a Direct Build backfill stage moves from prepare to execute
- **THEN** the transfer directory still exists, and it is removed only when the stage or invocation closes

### Requirement: Transfer directory disclosed only in task disclosure

The coordinator SHALL deliver the transfer directory to the backfill worker only in the task-disclosure continuation, as one first line `--transfer-dir <dir>` ahead of the envelope, never in the initial dispatch; `original_envelope` SHALL remain exactly `arguments_value`. The worker SHALL strip that line before any other parse and keep the path as invocation-scoped state outside `$ARGUMENTS`. A dispatch that needs the line and lacks it SHALL return `failed` with no changes and a summary naming the missing line, with no inline-content fallback. The archive `--fix-delta-headers` envelope SHALL carry no such line and SHALL keep its inline contract.

#### Scenario: A missing transfer line fails closed

- **WHEN** an ordinary or Direct Build backfill task disclosure lacks the `--transfer-dir` line
- **THEN** the worker returns `failed` naming the missing line and returns no draft content

### Requirement: Worker hands drafts over as references

After composing its drafts, the backfill worker SHALL write each draft with `transfer.js put` at the path that mirrors its destination relative to `openspec/changes/{name}/` (`.openspec.yaml`, `proposal.md`, `specs/<capability>/spec.md`) and SHALL return its terminal `completed` payload with a `draft_references` list carrying exactly one `{path, sha256, destination}` entry per draft and no draft content. The worker SHALL NOT write transfer files through any other tool and SHALL NOT write any repository file on the ordinary route or the prepare stretch. When the helper is unavailable or its invocation is denied, the worker SHALL return `failed` naming the blocked operation and SHALL NOT fall back to inline content.

#### Scenario: Completed payload carries references only

- **WHEN** the worker completes draft composition
- **THEN** its terminal payload lists one reference per draft with its absolute transfer path, sha256, and final destination, and contains no draft text

#### Scenario: A denied helper fails without inline content

- **WHEN** the worker's `transfer.js put` invocation is denied or the helper is unavailable
- **THEN** the worker returns `failed` naming the blocked operation and the route performs no final write

### Requirement: Coordinator verifies references before any use

Before validating drafts, the coordinator SHALL run `transfer.js verify` for every reference and SHALL reject duplicate destinations and any destination other than `openspec/changes/{name}/.openspec.yaml`, `openspec/changes/{name}/proposal.md`, and `openspec/changes/{name}/specs/{capability}/spec.md`. A verification failure — a missing or unreadable file, a sha256 mismatch, a path outside the transfer directory, a repository path, or a path reached through a symbolic link — SHALL cause no final write and SHALL resume the same worker with the verbatim helper report to request a corrected result with new references. With every reference verified, the coordinator SHALL read each transfer file and apply its existing validation rules unchanged.

#### Scenario: A mismatched reference is sent back

- **WHEN** a returned reference fails `verify`
- **THEN** the coordinator writes nothing and resumes the same worker with the verbatim report for corrected references

#### Scenario: A duplicate destination is rejected

- **WHEN** two references name the same destination
- **THEN** the coordinator rejects the result and writes nothing

### Requirement: Latest references supersede earlier ones

A corrected worker result SHALL re-`put` every changed draft and return the complete latest `draft_references` list, which SHALL supersede every earlier reference. The coordinator and any replacement worker SHALL use only the latest references, and continuation, reconstruction, and execute-order state SHALL carry the transfer directory path and those references only, never complete draft contents.

#### Scenario: A correction replaces the reference set

- **WHEN** the worker returns a corrected result after a verification, validation, preflight, or findings continuation
- **THEN** the coordinator discards the earlier references and verifies and validates only the new list

### Requirement: Ordinary route materializes validated drafts

On the ordinary `/sai-backfill` route, after validation and the delta-header preflight pass, the coordinator SHALL re-run `transfer.js verify` for every reference immediately before the first write and SHALL then write each final file with `transfer.js materialize`, using the reference and its destination with the project root as `--cwd`, adding every written path to the changed-files union.

#### Scenario: Validated drafts reach the change directory byte-for-byte

- **WHEN** every draft validates and every reference re-verifies
- **THEN** the coordinator materializes each transfer file to its `openspec/changes/{name}/` destination byte-for-byte

### Requirement: Direct Build execute order carries references

On the Direct Build route, the `--direct-build-execute` order SHALL carry the confirmed change name and the validated references `{path, sha256, destination}` and no draft content. The worker SHALL validate the marker, change name, destination allow-list, duplicate-free destination set, reference identity with its latest prepared references, and pending execution state, SHALL run `transfer.js verify` for every reference, and only when all pass SHALL run `transfer.js materialize` for each. A verification failure SHALL write nothing and return `failed` with the verbatim helper report.

#### Scenario: Execute materializes verified references

- **WHEN** the worker receives a valid execute order of references
- **THEN** it verifies every reference and materializes each to its destination, reporting every realized destination in `changed_files`

#### Scenario: An unverifiable reference writes nothing

- **WHEN** any reference in the execute order fails `verify`
- **THEN** the worker writes no destination and returns `failed` with the verbatim report

### Requirement: Backfill terminal payload carries references, not content

The shared worker core SHALL state that backfill's terminal payload returns `draft_references` to worker-prepared transfer files and never draft content; the only terminal payloads that return content for the coordinator to write SHALL be merge's resolution region text and the archive reroute's corrected delta specs.

#### Scenario: Worker core lists the content exceptions

- **WHEN** `sai/orchestration/worker-core.md` is read
- **THEN** it names merge's resolution region text and the archive reroute's corrected delta specs as the content-returning payloads and states that backfill returns references

### Requirement: Transfer helper grants on command profiles

`sai/install-manifest.json` SHALL add the shell grant `node {sai}/tools/transfer.js *` to the `archive-command`, `backfill-command`, and `merge-command` profiles alongside their existing grants, and SHALL add no new tool for either harness.

#### Scenario: Command profiles carry the transfer grant

- **WHEN** the archive, backfill, and merge command profiles are read from the install manifest
- **THEN** each shell grant list contains `node {sai}/tools/transfer.js *`
