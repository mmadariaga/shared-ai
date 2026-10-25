# backfill-draft-transport Specification

## Purpose
TBD - created by archiving change transfer-file-references-backfill. Update Purpose after archive.

## Requirements

### Requirement: One transfer directory per backfill invocation

The `/sai-backfill` coordinator and Explore Direct Build route SHALL run `transfer.js open --harness <claude|opencode>` before the first backfill worker dispatch and retain its returned directory as invocation-scoped state. Exit 2 SHALL report the verbatim error and stop before dispatch or final writes. Ordinary backfill SHALL retain its invocation-close cleanup and close only its named directory on completed, failed, or cancelled closure. Direct Build SHALL retain its separate draft directory through archive, corrections, validation, recovery, interruption, and exhausted or otherwise unresolved closure. Its report and draft evidence SHALL be cleaned up only after accepted route closure when no continuation or recovery needs them.

#### Scenario: A missing temp root stops before dispatch
- **WHEN** `open` exits 2 at backfill invocation start
- **THEN** the coordinator reports the verbatim error and dispatches no worker and writes no file

#### Scenario: The directory survives until close
- **WHEN** a Direct Build backfill stage moves from prepare to execute
- **THEN** the transfer directory still exists through archive and corrections and remains available until accepted terminal closure permits cleanup

#### Scenario: Unresolved close retains drafts
- **WHEN** Direct Build closes with interrupted or exhausted report verification
- **THEN** the draft transfer directory and references remain retained with the report evidence rather than being removed at that unresolved close

### Requirement: Transfer directory disclosed only in task disclosure

The coordinator SHALL deliver the transfer directory to the backfill worker only in the task-disclosure continuation through `--transfer-dir <dir>` ahead of the envelope, never in the initial dispatch; `original_envelope` SHALL remain exactly `arguments_value`. For ordinary backfill that line SHALL be first. For the full Direct Build route the outermost `--report-dir <absolute path>` line SHALL precede it; the worker SHALL strip the report line first, then the transfer line, and keep both paths as invocation-scoped state outside `$ARGUMENTS`. A dispatch needing the transfer line and lacking it SHALL return `failed` with no changes and a summary naming the missing line, with no inline draft-content fallback. Full-route reports SHALL use private report references, with draft references retained inside the report and their own separate directory. The archive `--fix-delta-headers` envelope SHALL carry no transfer line and SHALL keep its inline contract.

#### Scenario: A missing transfer line fails closed
- **WHEN** an ordinary or Direct Build backfill task disclosure lacks the `--transfer-dir` line
- **THEN** the worker reports failed naming the missing line, performs no draft writes, and returns no draft content, using full-route private report transport only when that mode applies

#### Scenario: Full Direct Build has two separate directory lines
- **WHEN** full Direct Build discloses the backfill task after ready
- **THEN** report-dir is outermost, transfer-dir follows it, and both are stripped before ordinary envelope parsing without changing standalone behavior

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

On the Direct Build route, the `--direct-build-execute` order SHALL carry the confirmed change name and validated references `{path, sha256, destination}` without draft content. The worker SHALL validate the marker, name, destination allow-list, duplicate-free destination set, identity with its latest prepared references, and pending execution state. It SHALL verify every reference and repeat scenario-preservation checking against current main specs using prepared, coordinator-approved temporary exception metadata before materializing any draft. Only after all checks pass SHALL it materialize the verified drafts byte-for-byte. A failed reference verification or preservation check SHALL write nothing and return the concrete failure. Temporary metadata SHALL NOT become a materialization destination.

#### Scenario: Execute materializes verified references
- **WHEN** the worker receives a valid execute order of references
- **THEN** it verifies every reference, repeats scenario-preservation checking, and only after success materializes each destination and reports every realized destination in `changed_files`

#### Scenario: An unverifiable reference writes nothing
- **WHEN** any reference in the execute order fails `verify`
- **THEN** the worker writes no destination and returns `failed` with the verbatim report

#### Scenario: Changed main specs invalidate stale preservation evidence
- **WHEN** current main specs cause preservation checking to fail before the execute continuation materializes drafts
- **THEN** the worker writes no draft destination and reports the failed comparison

### Requirement: Transfer helper grants on command profiles

`sai/install-manifest.json` SHALL add the shell grant `node {sai}/tools/transfer.js *` to the `archive-command` and `backfill-command` profiles alongside their existing grants, and SHALL add no new tool for either harness. The `merge-command` profile SHALL carry no `transfer.js` grant, because `/sai-merge` no longer uses transfer files.

#### Scenario: Command profiles carry the transfer grant

- **WHEN** the archive, backfill, and merge command profiles are read from the install manifest
- **THEN** the archive and backfill shell grant lists contain `node {sai}/tools/transfer.js *` and the merge profile has no such grant

### Requirement: Temporary scenario metadata is separate and verified

The backfill worker SHALL write `scenario-exceptions.json` through `transfer.js put` inside its transfer directory, using an empty array when no exceptions are proposed. It SHALL return its `{path, sha256}` as `scenario_exception_reference` separately from destination-bearing `draft_references`. Every corrected result SHALL return the complete latest metadata reference and drafts. Receivers SHALL verify metadata before every use and independently approve each exception against explicit accepted scope. Changed bytes SHALL require fresh approval and checking. Metadata SHALL never be a scenario or repository artifact and SHALL NOT enter materialization, staging, archive artifacts, or commits.

#### Scenario: No proposed exceptions still produces metadata
- **WHEN** the worker proposes no scenario removal or rename
- **THEN** it returns a separate reference to an empty JSON array written through the transfer helper

#### Scenario: Metadata has no destination
- **WHEN** a receiver processes the worker's temporary exception reference
- **THEN** it verifies that reference separately without adding it to the allowed draft destination list

#### Scenario: Corrected metadata supersedes prior bytes
- **WHEN** a corrected result changes temporary exceptions
- **THEN** the receiver uses the complete latest references and repeats metadata verification, approval, and preservation checking

### Requirement: Direct Build corrections are verified before rewriting drafts

After a Direct Build archive failure, the same backfill worker SHALL recompose only the named draft sections from existing grounding and failure evidence. It SHALL put corrected drafts and metadata into transfer files, run the author preservation check, and return the complete latest references without rewriting repository files. Only after independent receiver validation and explicit authorization of those exact corrected references SHALL it verify again, repeat preservation checking, and materialize the named corrected drafts. This SHALL complete the pending correction rather than replay the consumed initial execution order and SHALL grant no commit authorization. Repeating a defect without progress SHALL end corrections with the verbatim failure.

#### Scenario: Correction first returns temporary references
- **WHEN** the worker receives archive-failure feedback naming draft sections to correct
- **THEN** it returns checked temporary references without rewriting repository drafts

#### Scenario: Receiver approves exact corrected bytes
- **WHEN** the coordinator independently validates corrected references and authorizes those exact references
- **THEN** the worker verifies and checks them again before rewriting only the named drafts and reporting the rewritten paths

#### Scenario: Correction does not replay execution or authorize commit
- **WHEN** an authorized correction finishes
- **THEN** it closes the pending correction without replaying the original execute order or gaining commit authorization

### Requirement: The backfill worker contract states its reference-only payload

`sai/commands/backfill/worker.md` SHALL state that the backfill worker returns `draft_references` to worker-prepared transfer files and never draft content, with a separate `scenario_exception_reference: {path, sha256}` for temporary exception metadata. The archive reroute's header-fix continuation SHALL remain the only backfill payload that returns artifact content for the coordinator to write.

#### Scenario: The worker contract names its content exception

- **WHEN** `sai/commands/backfill/worker.md` is read
- **THEN** its Draft transfer section returns references only, and its Delta header fix continuation is the one place that returns corrected spec content
