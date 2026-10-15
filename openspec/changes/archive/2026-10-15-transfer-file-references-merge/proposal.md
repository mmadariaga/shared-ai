> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

The merge coordinator received the worker's complete resolution result, including every authored region text, as message text and then re-emitted it byte-for-byte into the `--source` file for `merge.js resolution`. That region text is consumed only by `merge.js`, so carrying it through the coordinator duplicated the largest repeated payload in merge as coordinator tokens. The merge worker now hands the complete result over as a transfer file, returns inline only the application outcome the coordinator presents, and the coordinator uses the transfer file itself as the validation source.

## What Changes

- `sai/commands/merge/coordinator.md`: new **Transfer directory** section. The coordinator resolves `transfer.js`, runs `transfer.js open --harness <claude|opencode>` before the first stage (exit 2 stops with no dispatch and no write), discloses the directory only in the task-disclosure continuation as a first `--transfer-dir <dir>` line ahead of the `Active stage:` pointer (for the first worker and every replacement, never in the dispatch envelope), and runs `transfer.js close` when the invocation completes, fails, or is cancelled. A merge reference is `{path, sha256}` with no destination; a resolution or correction `completed` payload carries exactly one `resolution_reference`, and a corrected result supersedes earlier ones. Replacement reconstruction fields carry the transfer directory path and the latest reference, never resolution content. The received validation source for a resolution result is the transfer file.
- `sai/commands/merge/coordinator-stages.md`: resolution validation verifies the reference with `transfer.js verify`; a verify failure stages nothing and continues the same worker for a corrected result with a new reference, never an inline payload. The coordinator pipes the transfer file to the shared validator, passes the same path as `--source` to `merge.js resolution`, never reads, copies, reconstructs, or summarizes the file, and adds no inline-versus-file consistency check. The `--confirmed` input stays a separate coordinator file in the harness-approved temporary area; the `--source` and `--confirmed` references and hashes are retained until close. Review corrections return through a new transfer file and reference. Closure closes the transfer directory before the final summary.
- `sai/commands/merge/instructions.md`: the worker writes its complete original result (envelope, `summary` with `## Complete resolution payload`, and `changed_files`) with `transfer.js put` to a fresh relative path per result (`resolution-1.json`, `resolution-2.json`, ...) and returns a `completed` payload whose `summary` holds only the application-outcome text plus `resolution_reference`. An unavailable or denied helper returns `failed`; there is no inline fallback.
- `sai/commands/merge/worker.md`: the worker strips the outermost `--transfer-dir` line before any other parse and retains it across continuations; reaching `apply` without it returns `failed` with no write. Transfer files are the only other files the worker creates, live outside the repository, and never enter `changed_files`.
- `sai/commands/merge/mechanics.md`: the worker's complete resolution result is named as one of the external invocation records, identified by its `{path, sha256}` reference.
- `sai/orchestration/worker-core.md`: merge's terminal payload returns only the application outcome and one `resolution_reference`; the archive reroute's corrected delta specs remain the only content-returning terminal payload.
- Strategy confirmations, `--confirmed` evidence, every `merge.js resolution` check, the worker's ownership of `merge.js write`, and the coordinator's ownership of staging and finalization are unchanged. Claude Code and opencode share the same contracts.

## Capabilities

### New Capabilities

- `merge-resolution-transport`: the merge invocation's transfer directory lifecycle, task-disclosure delivery of the directory, the worker's reference-based hand-over of the complete resolution result, coordinator verification and validation of the transfer file without reading it, and reference-only reconstruction.

### Modified Capabilities

- `sai-merge-command`: complete resolution payload validation takes the verified transfer file as the original received worker result and `--source`.
- `merge-presentation-seam`: successful application presents the inline application outcome and retains the full result only as its transfer-file reference; the inline summary is never compared with the validation source.
- `merge-worker-discipline`: continuation and replacement state includes the transfer directory path and the latest `resolution_reference`, never resolution content.
- `backfill-draft-transport`: the worker-core content-exception list no longer names merge's resolution region text; merge returns a reference.

## Impact

- Modified: `sai/commands/merge/coordinator.md`, `sai/commands/merge/coordinator-stages.md`, `sai/commands/merge/instructions.md`, `sai/commands/merge/worker.md`, `sai/commands/merge/mechanics.md`, `sai/orchestration/worker-core.md`.
- New files: none.
- Depends on `transfer-file-references-backfill` for `sai/tools/transfer.js` and the `merge-command` profile's `node {sai}/tools/transfer.js *` shell grant.
- Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill
