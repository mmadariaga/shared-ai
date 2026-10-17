# stored-block-dispatch Specification

## Purpose
Define how Plan - Unattended and Direct Build - Unattended obtain block text and its hash from the `sai-state` store, so a compaction of the conversation cannot lose or alter a validated block before dispatch.

## Requirements

### Requirement: Block verb returns the stored block and its hash

Without export, `sai-state block <id> <change-name>` SHALL retain its existing `{received_at, hash, text}` response for a recorded slice. Missing entries SHALL answer `BLOCK_NOT_FOUND` with exit 1; missing identifiers SHALL be usage errors with exit 2. With `--export --harness <claude|opencode>`, the verb SHALL verify the stored block hash, write the stored UTF-8 bytes directly through the transfer utility into a private file under the selected harness temp root, and return `{received_at, hash, block_file, transfer_dir}` without text. It SHALL preserve Unicode, the final separator, and the absence of a final newline. Export failure SHALL answer `BLOCK_EXPORT_FAILED` with a reason and exit 1; omitted or invalid export harness SHALL exit 2.

#### Scenario: Recorded slice returns its stored block

- **WHEN** a block emit has recorded `slice-a` and the caller invokes `sai-state block <id> slice-a`
- **THEN** the process exits 0 and returns the stored text of `slice-a` with the hash the emit stored for it

#### Scenario: Missing block answers BLOCK_NOT_FOUND

- **WHEN** the session, the stored blocks, or the requested change name is absent, including after the session was closed
- **THEN** the process exits 1 with `error: "BLOCK_NOT_FOUND"` and returns no text

#### Scenario: Private export preserves stored bytes

- **WHEN** a recorded block with Unicode and no final newline is exported for either supported harness
- **THEN** the private file contains the stored bytes and the response supplies its paired path and unchanged block hash without inline text.

### Requirement: Plan and Direct Build take block text only from the store

Claude Code and opencode SHALL obtain stored blocks only from `sai-state`. Before each fresh Plan spec, Direct Build implementer, or backfill-prepare dispatch, including retries and replacements, the coordinator SHALL run `sai-state block <id> <change-name> --export --harness <claude|opencode>` and send only the returned paired `--block-file` and `--block-hash` lines. No model SHALL transcribe stored content into messages or heredocs. Later coordinator readings SHALL use the store, not conversation text. After amendment the coordinator SHALL export anew and never pair an old file with a new hash. Transfer directories SHALL remain available while continuations or recovery can need them and SHALL be closed through `transfer.js close` only afterward. `last_crystallization_set` SHALL hold names only; execute continuations SHALL carry validated draft references, not the block.

#### Scenario: A compaction leaves the next dispatch unaffected

- **WHEN** the conversation is compacted between crystallization and the next slice's dispatch
- **THEN** the coordinator reads that slice's block from the store and dispatches a fresh private-file reference containing the same validated text with its stored hash

#### Scenario: A retry reads the store again

- **WHEN** Plan - Unattended retries the spec-worker dispatch
- **THEN** the retry envelope carries the paired file and hash returned by a new `sai-state block --export` call

#### Scenario: Amendment refresh keeps old references usable

- **WHEN** a block is amended while recovery may still need its previous export
- **THEN** the next dispatch receives a fresh export and its new hash while the previous directory remains available until no longer needed.

### Requirement: A missing stored block dispatches nothing

When a selected block export answers `BLOCK_NOT_FOUND` or `BLOCK_EXPORT_FAILED`, Plan - Unattended and Direct Build - Unattended SHALL dispatch nothing and close with stop options. Options SHALL include retrying the export or re-emitting the block, including `--amend` for a pending or stopped slice.

#### Scenario: Missing block stops before dispatch

- **WHEN** the block verb answers `BLOCK_NOT_FOUND` for the active slice
- **THEN** no worker is dispatched and the stop options include re-emitting the block

#### Scenario: Export error prevents dispatch

- **WHEN** private-file export fails
- **THEN** no worker is dispatched and the error and retry or re-emission options are reported.
