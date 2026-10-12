# stored-block-dispatch Specification

## Purpose
Define how Plan - Unattended and Direct Build - Unattended obtain block text and its hash from the `sai-state` store, so a compaction of the conversation cannot lose or alter a validated block before dispatch.

## Requirements

### Requirement: Block verb returns the stored block and its hash

`sai-state block <id> <change-name>` SHALL return `{received_at, hash, text}` for one recorded slice, where `text` is the exact validated block text and `hash` its sha256 as the block emit or the latest accepted amendment stored them. When the session, the stored `blocks` map, or that change name's entry is absent, or the entry lacks a non-empty text or hash, the verb SHALL return `{received_at, error: "BLOCK_NOT_FOUND"}` with no text and no `next`, and exit 1. A missing id or change name SHALL be a usage error with exit 2. The verb SHALL perform no hash check of its own.

#### Scenario: Recorded slice returns its stored block

- **WHEN** a block emit has recorded `slice-a` and the caller invokes `sai-state block <id> slice-a`
- **THEN** the process exits 0 and returns the stored text of `slice-a` with the hash the emit stored for it

#### Scenario: Missing block answers BLOCK_NOT_FOUND

- **WHEN** the session, the stored blocks, or the requested change name is absent, including after the session was closed
- **THEN** the process exits 1 with `error: "BLOCK_NOT_FOUND"` and returns no text

### Requirement: Plan and Direct Build take block text only from the store

Plan - Unattended and Direct Build - Unattended SHALL take block text only from `sai-state block <id> <change-name>`, identically on Claude Code and opencode. Before every dispatch that carries a block (the Plan spec-worker dispatch including a retry, the Direct Build implementer dispatch, and the Direct Build backfill prepare dispatch), the coordinator SHALL run the verb for the active slice, send the returned `text` unaltered in the envelope, and put the returned `hash` on the envelope's `--block-hash` line. Every later coordinator reading of the block on those routes, including auto-answer grounding, Review Engine inputs, and the Direct Build review, draft review, and ADR/DDR pass, SHALL come from the same verb. The coordinator SHALL never retain the block in conversation or reconstruct, trim, or summarize it, and `last_crystallization_set` SHALL hold change names only. The Direct Build execute continuations SHALL carry validated draft paths and contents, not the block.

#### Scenario: A compaction leaves the next dispatch unaffected

- **WHEN** the conversation is compacted between crystallization and the next slice's dispatch
- **THEN** the coordinator reads that slice's block from the store and dispatches the same validated text with its stored hash

#### Scenario: A retry reads the store again

- **WHEN** Plan - Unattended retries the spec-worker dispatch
- **THEN** the retry envelope carries the text and hash returned by a new `sai-state block` call

### Requirement: A missing stored block dispatches nothing

When `sai-state block` answers `BLOCK_NOT_FOUND`, the Plan - Unattended or Direct Build - Unattended coordinator SHALL dispatch nothing and SHALL close with stop options per `sai/policies/stop-options.md`. Those options SHALL include re-emitting the slice's block, through the crystallization emit or through `--amend` for one pending or stopped slice.

#### Scenario: Missing block stops before dispatch

- **WHEN** the block verb answers `BLOCK_NOT_FOUND` for the active slice
- **THEN** no worker is dispatched and the stop options include re-emitting the block
