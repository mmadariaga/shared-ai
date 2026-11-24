# stored-block-dispatch Specification

## Purpose
Define how Plan - Unattended and Direct Build - Unattended obtain block text and its hash from the `sai-state` store, so a compaction of the conversation cannot lose or alter a validated block before dispatch.

## Requirements

### Requirement: Block verb returns the stored block and its hash

The store SHALL keep change documents. Without export, `sai-state block <id> <change-name>` SHALL retain its existing `{received_at, hash, text}` response for a recorded slice, the text being that slice's stored change document. Missing entries SHALL answer `BLOCK_NOT_FOUND` with exit 1; missing identifiers SHALL be usage errors with exit 2. With `--export --harness <claude|opencode>`, the verb SHALL check that the stored text is one change document whose hash matches the stored hash, write the stored UTF-8 bytes directly through the transfer utility into a private `document.md` file under the selected harness temp root, and return `{received_at, hash, document_file, transfer_dir}` without text. It SHALL preserve Unicode and the absence of a final newline. Export failure SHALL answer `BLOCK_EXPORT_FAILED` with a reason and exit 1; omitted or invalid export harness SHALL exit 2.

#### Scenario: Recorded slice returns its stored block

- **WHEN** a document emit has recorded `slice-a` and the caller invokes `sai-state block <id> slice-a`
- **THEN** the process exits 0 and returns the stored change document text of `slice-a` with the hash the emit stored for it

#### Scenario: Missing block answers BLOCK_NOT_FOUND

- **WHEN** the session, the stored documents, or the requested change name is absent, including after the session was closed
- **THEN** the process exits 1 with `error: "BLOCK_NOT_FOUND"` and returns no text

#### Scenario: Private export preserves stored bytes

- **WHEN** a recorded change document with Unicode and no final newline is exported for either supported harness
- **THEN** the private `document_file` contains the stored bytes and the response supplies its path and the unchanged document hash without inline text

### Requirement: Plan and Direct Build take block text only from the store

Claude Code and opencode SHALL obtain stored change documents only from `sai-state` on the `/sai-explore` routes. Before each fresh Plan spec, Direct Build implementer, or backfill-prepare dispatch of those routes, including retries and replacements, the coordinator SHALL run `sai-state block <id> <change-name> --export --harness <claude|opencode>` and send only the returned paired `--document-file` and `--document-hash` lines. The one exception is `/sai-direct-build`: it has no `sai-state` store, so the caller-supplied `--document-file` and `--document-hash` pair, once verified with `change-document.js verify-file`, SHALL serve every dispatch of its run, retries and replacements included, and the command SHALL neither export a document nor close or remove that file. No model SHALL transcribe stored content into messages or heredocs. Later coordinator readings SHALL use the store, or for `/sai-direct-build` the verified file, not conversation text. After amendment the coordinator SHALL export anew and never pair an old file with a new hash. Transfer directories SHALL remain available while continuations or recovery can need them and SHALL be closed through `transfer.js close` only afterward. `last_crystallization_set` SHALL hold names only; execute continuations SHALL carry validated draft references, not the document.

#### Scenario: A compaction leaves the next dispatch unaffected

- **WHEN** the conversation is compacted between crystallization and the next slice's dispatch
- **THEN** the coordinator reads that slice's change document from the store and dispatches a fresh private-file reference containing the same validated text with its stored hash

#### Scenario: A retry reads the store again

- **WHEN** Plan - Unattended retries the spec-worker dispatch
- **THEN** the retry envelope carries the paired `--document-file` and `--document-hash` returned by a new `sai-state block --export` call

#### Scenario: Amendment refresh keeps old references usable

- **WHEN** a change document is amended while recovery may still need its previous export
- **THEN** the next dispatch receives a fresh export and its new hash while the previous directory remains available until no longer needed

#### Scenario: Direct Build command reuses the caller's verified pair

- **WHEN** `/sai-direct-build` dispatches the implementer, the backfill prepare worker, or a replacement worker
- **THEN** each envelope carries the caller-supplied `--document-file` and `--document-hash` pair it verified at start, with no `sai-state` export

### Requirement: A missing stored block dispatches nothing

When a selected block export answers `BLOCK_NOT_FOUND` or `BLOCK_EXPORT_FAILED`, Plan - Unattended and Direct Build - Unattended SHALL dispatch nothing and close with stop options. Options SHALL include retrying the export or re-emitting the block, including `--amend` for a pending or stopped slice.

#### Scenario: Missing block stops before dispatch

- **WHEN** the block verb answers `BLOCK_NOT_FOUND` for the active slice
- **THEN** no worker is dispatched and the stop options include re-emitting the block

#### Scenario: Export error prevents dispatch

- **WHEN** private-file export fails
- **THEN** no worker is dispatched and the error and retry or re-emission options are reported.

### Requirement: A retired Ready to Propose block is rejected, never converted

The `Ready to Propose` block SHALL be a retired format on Claude Code and opencode alike. `sai-state emit` SHALL exit 2 with a message naming the retired format when it receives `--ready-to-propose` or `--block-file`, and a `--document-file` whose content is a block (a `## Ready to Propose` heading or a `**Change name**:` label) SHALL answer `error: "INVALID_EVENT"` with `reason: "RETIRED_FORMAT"` and record nothing. Every receiver of a crystallized change (`/sai-1-spec`, `/sai-plan`, `/sai-direct-build`, the Direct Build implementer, and backfill) SHALL reject a block, or a `--block-file` or `--block-hash` line, with a message that says the format is retired, write nothing, and SHALL NOT convert the block into a change document. No compatibility SHALL exist with blocks already stored in `sai-state`.

#### Scenario: Block emit is retired

- **WHEN** a caller runs `sai-state emit <id> explore-slice@1 --ready-to-propose --block-file <path> --verdicts-file <path>`
- **THEN** the process exits 2 naming the retired format and the store is unchanged

#### Scenario: A block given as a document is rejected

- **WHEN** a caller passes a file holding a `Ready to Propose` block to `sai-state emit <id> explore-slice@1 --document-file <path>`
- **THEN** the response carries `reason: "RETIRED_FORMAT"`, nothing is recorded, and the block is not converted
