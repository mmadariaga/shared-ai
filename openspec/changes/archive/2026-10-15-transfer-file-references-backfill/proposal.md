> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

The backfill coordinator received draft documents inline from its worker, re-emitted them to stage the delta-header preflight in an OS-temp directory, and, on the Explore Direct Build route, re-emitted them again inside the `--direct-build-execute` order. Each re-emission duplicated large draft text as coordinator output tokens. Backfill workers now hand drafts over as references to worker-prepared transfer files outside the repository, so the coordinator reads each draft once for validation and never re-emits its content.

## What Changes

- New `sai/tools/temp-root.js`: shared harness temp root resolver. opencode on Linux resolves to `/tmp/opencode`; every other harness/platform pair resolves to `os.tmpdir()`. The root must be an existing directory that is not a symbolic link; the module never creates, repairs, or chmods it, and a missing root is reported as a concrete blocker.
- New `sai/tools/transfer.js` CLI with one JSON object per call and exit codes 0 (success), 1 (check failure), 2 (usage or IO failure, including a missing temp root):
  - `open --harness <claude|opencode>` creates one unique `sai-transfer-XXXXXX` directory under the temp root (mode `0700` on POSIX) with a `.sai-transfer` marker and returns its absolute path.
  - `put --dir <dir> --path <relative>` writes standard input to a relative path inside the transfer directory and returns `{path, sha256}`; absolute, escaping, empty-segment, backslash, and reserved-marker paths are rejected.
  - `verify` confirms a reference lies inside the directory, passes through no symbolic link, is a regular file, and matches its sha256.
  - `materialize` verifies, then copies the verified bytes byte-for-byte to a destination confined to the `--cwd` project root, creating parent directories.
  - `close` removes only that transfer directory; a directory already gone is not an error.
  - A transfer directory is recognized by its name, its marker file, and (POSIX) ownership by the current user; any other directory is refused.
- `sai/commands/backfill/coordinator.md`: the coordinator opens one transfer directory before the first worker dispatch (exit 2 stops with no dispatch and no write), discloses it only in the task-disclosure continuation as a first `--transfer-dir <dir>` line, verifies every returned reference, rejects duplicate or non-allow-listed destinations, reads the transfer files for its unchanged validation rules, runs `check-delta-headers.js --delta-dir <dir>/specs` directly on the transfer files (the `sai-delta-preflight-` staging is removed), re-verifies before the first write, writes final files with `transfer.js materialize`, and closes the directory when the invocation completes, fails, or is cancelled. Reconstruction state carries the directory path and latest references, never draft content.
- `sai/commands/backfill/worker.md` and `sai/commands/backfill/instructions.md`: the worker strips the `--transfer-dir` line, writes each draft with `transfer.js put` at a path mirroring its destination under `openspec/changes/{name}/`, and returns a `draft_references` list of `{path, sha256, destination}` with no content. A corrected result re-puts changed drafts and returns the complete latest list. A missing `--transfer-dir` line, or an unavailable or denied helper, returns `failed` with no inline fallback. The Direct Build execute order carries references; the worker verifies every reference, then materializes each one. The `--fix-delta-headers` reroute keeps its inline contract.
- `sai/commands/explore/steps/pipeline-direct-build.md`: the Direct Build route opens the transfer directory before the backfill prepare dispatch, keeps the directory path and latest references (never content) in retained execution state, verifies references in the Step 4 spec review, issues the Step 6 execute order as references, and closes the directory when Step 6 is accepted or the route ends non-cleanly.
- `sai/orchestration/worker-core.md`: backfill's terminal payload returns references, not content; the content-returning exceptions are merge's resolution region text and the archive reroute's corrected delta specs.
- `sai/install-manifest.json`: the `archive-command`, `backfill-command`, and `merge-command` profiles add the shell grant `node {sai}/tools/transfer.js *`; no new tool is added for either harness.
- `sai/policies/tool-resolution.md` lists `transfer.js` among the resolved tool names; `GLOSSARY.md` adds **Transfer File**; `AGENTS.md` describes the reference-based backfill handover.
- Tests: `test/temp-root.test.js` and `test/transfer-tool.test.js` cover root resolution per harness and platform, the missing root, symbolic-link and out-of-directory rejection, sha256 mismatch, byte-identical materialization, and `close` removing only its own directory; `test/direct-build-writes-openspec-yaml.test.js` pins the reference-based Step 6 wording.
- Validation rules, authorization gates, and final-write owners are unchanged on every route. Claude Code and opencode share the same contracts.

## Capabilities

### New Capabilities

- `transfer-file-transport`: shared harness temp root resolver and the `transfer.js` CLI that opens, writes, verifies, materializes, and closes per-invocation transfer files outside the repository.
- `backfill-draft-transport`: standalone and Direct Build backfill exchange drafts as `{path, sha256, destination}` references to transfer files, with the transfer directory lifecycle, reference verification, and materialization.

### Modified Capabilities

- `routed-backfill-command`: the worker writes no repository file and returns draft references instead of draft content; the coordinator verifies and reads the transfer files before validation and writes final files by materialization.
- `auto-fast-backfill-execution`: the Direct Build execute order carries validated references instead of draft contents, and the worker verifies and materializes them.
- `delta-header-preflight`: the backfill preflight runs directly on the transfer directory's `specs/` tree with no OS-temp staging copy.
- `delta-header-tool-paths`: the backfill invocation passes the transfer directory's `specs/` tree as `--delta-dir`; archive keeps its own staging directory.
- `explore-pipeline-supervision`: Direct Build retained execution state includes the backfill transfer directory path and the latest draft references, never draft content.

## Impact

New files:

- `sai/tools/temp-root.js`
- `sai/tools/transfer.js`
- `test/temp-root.test.js`
- `test/transfer-tool.test.js`

Modified files:

- `AGENTS.md`
- `GLOSSARY.md`
- `sai/commands/backfill/coordinator.md`
- `sai/commands/backfill/instructions.md`
- `sai/commands/backfill/worker.md`
- `sai/commands/explore/steps/pipeline-direct-build.md`
- `sai/install-manifest.json`
- `sai/orchestration/worker-core.md`
- `sai/policies/tool-resolution.md`
- `test/direct-build-writes-openspec-yaml.test.js`

Known limitations: the coordinator still loads each draft once as input to validate it, and a third temp-preparation implementation coexists with `sai/tools/to-pr.js` and `skills/universal/to-backlog/scripts/prepare-temp.js`, which stay unchanged. The archive `--fix-delta-headers` correction route, Ready to Propose input blocks, review-fix findings, commit messages, and generic worker reconstruction history keep their current transport.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

Follow-up, outside this change: migrate `sai/tools/to-pr.js` and `skills/universal/to-backlog/scripts/prepare-temp.js` to the shared temp root resolver, and verify whether opencode still requires `/tmp/opencode` or can use `os.tmpdir()`. Unverified assumption behind I7: delegated workers invoking `node <sai>/tools/transfer.js` receive no permission prompt on either harness, as with the existing `merge.js` calls.
