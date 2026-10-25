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

Ordinary backfill SHALL require schema and preservation preflight plus successful receiver-side complete-set OpenSpec CLI validation before materialization. Immediately before the first repository write the coordinator SHALL check the accepted fingerprint against the same complete reference set and current specifications, configuration, and schemas, then reverify all references. A mismatch SHALL require repeated validation without writes. Only a fully validated, fresh set SHALL be materialized through transfer.js to its allowed destinations with every realized path added to changed_files.

#### Scenario: Validated drafts reach the change directory byte-for-byte
- **WHEN** all checks pass and accepted inputs remain unchanged immediately before writing
- **THEN** the coordinator materializes the verified files to their change destinations byte-for-byte

### Requirement: Direct Build execute order carries references

The Direct Build execute order SHALL contain the confirmed change name, exact latest validated draft references, and the accepted receiver-validation fingerprint, never draft content. The worker SHALL validate marker, name, allow-list, duplicate-free destination set, reference identity, and pending execution state. It SHALL verify every reference, repeat scenario preservation against current main specs without exceptions, and check the accepted fingerprint over the complete draft set and current specifications, configuration, and schemas before its first write. Missing or stale evidence or failed checks SHALL write nothing and return diagnostics for repeated receiver validation. Only all-passing checks SHALL permit byte-for-byte materialization.

#### Scenario: Execute materializes verified references
- **WHEN** the worker receives a valid pending order with the accepted fingerprint and exact references
- **THEN** it verifies references, preservation, and complete-set fingerprint freshness before materializing only the named destinations and reporting realized paths

#### Scenario: An unverifiable reference writes nothing
- **WHEN** a reference fails verification
- **THEN** the worker writes no destination and returns failed with the helper report

#### Scenario: Changed main specs invalidate stale preservation evidence
- **WHEN** main specifications change after receiver validation
- **THEN** the worker rejects stale validation evidence and writes no draft until repeated receiver validation succeeds

### Requirement: Transfer helper grants on command profiles

`sai/install-manifest.json` SHALL add the shell grant `node {sai}/tools/transfer.js *` to the `archive-command` and `backfill-command` profiles alongside their existing grants, and SHALL add no new tool for either harness. The `merge-command` profile SHALL carry no `transfer.js` grant, because `/sai-merge` no longer uses transfer files.

#### Scenario: Command profiles carry the transfer grant

- **WHEN** the archive, backfill, and merge command profiles are read from the install manifest
- **THEN** the archive and backfill shell grant lists contain `node {sai}/tools/transfer.js *` and the merge profile has no such grant

### Requirement: Direct Build corrections are verified before rewriting drafts

After an archive failure, the same backfill worker SHALL recompose only named draft sections from existing grounding and diagnostic evidence, put corrected drafts into transfer files, run author preservation checking, and return the complete latest references without repository writes. The receiver SHALL independently verify and validate the complete corrected set with the OpenSpec CLI and check freshness before authorizing exact corrected references with the accepted fingerprint. The worker SHALL reverify references and repeat preservation and full-set freshness checking before rewriting only the named corrected drafts. Correction SHALL complete the pending correction without replaying an initial order or granting commit authority. A repeated defect without progress SHALL end corrections with its verbatim failure.

#### Scenario: Correction first returns temporary references
- **WHEN** archive-failure feedback names sections to correct
- **THEN** the worker returns author-checked temporary draft references without rewriting repository files

#### Scenario: Receiver approves exact corrected bytes
- **WHEN** the receiver validates the complete corrected set and authorizes exact references with their fresh accepted fingerprint
- **THEN** the worker repeats reference, preservation, and freshness checks before rewriting only the named drafts and reporting each path

#### Scenario: Correction does not replay execution or authorize commit
- **WHEN** an authorized correction finishes
- **THEN** it closes only the pending correction without replaying execution or authorizing a commit

### Requirement: The backfill worker contract states its reference-only payload

The worker contract SHALL return draft_references to transfer files and never draft content on ordinary or Direct Build paths. It SHALL retire scenario_exception_reference and temporary exception metadata. The archive header-fix continuation SHALL remain the sole content-returning exception.

#### Scenario: The worker contract names its content exception
- **WHEN** the backfill worker contract is read
- **THEN** Draft transfer returns draft references only, no scenario-exception reference, and Delta header fix remains the sole corrected-content payload
