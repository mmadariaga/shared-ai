> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

SAI temp roots followed different rules: `sai/tools/to-pr.js` duplicated the root map, the to-backlog `prepare-temp.js` hardcoded `/tmp` and refused every platform except Linux, `bin/sai-state.js` used its own `TMPDIR`, `TEMP`, `TMP`, `os.tmpdir()` chain with no ownership check, and `azure-publication.js` and `slice-path-scope.js` wrote straight into `os.tmpdir()`. Every remaining temp writer now resolves its root through the shared `sai/tools/temp-root.js` resolver and its checks, on Claude Code and opencode alike.

## What Changes

- `sai/tools/temp-root.js` exports `harnessFromInstalledPath(file)`: the harness is opencode when the nearest harness folder above the file is `.opencode` or `opencode`, and Claude Code otherwise (`.claude`, or a source checkout).
- `sai/tools/temp-root.js` `makeTempDir` now verifies every created child on POSIX before returning it. These are the checks that moved out of `prepare-temp.js`: the Linux root real-path check, a private-child lstat check, a no-follow descriptor identity check with `fchmod` 0700 and re-verification, and a final device, inode, and real-path recheck of root and child. Every caller receives them; Windows creates the child without them.
- `bin/sai-state.js` stores sessions in `sai-state/` under the SAI temp root of the harness its installed copy runs from, ignoring `TMPDIR`, `TEMP`, and `TMP`; it loads `temp-root.js` beside its detector, and a temp-root blocker prints `sai-state: <message>` on stderr with exit code 2 instead of crashing. Sessions stored in the old location are no longer found.
- `sai/tools/to-pr.js` preparation calls `makeTempDir(harness, 'to-pr-')` instead of its own root map and checks.
- `sai/tools/azure-publication.js` creates its payload directory with `makeTempDir` under the SAI temp root instead of `os.tmpdir()`.
- `sai/tools/slice-path-scope.js` writes each snapshot record as `record.json` in its own private `slice-path-scope-XXXXXX` directory under the SAI temp root; the snapshot reference is that directory name, replacing the 64-character hexadecimal digest and the fixed-name file in `os.tmpdir()`, so simultaneous snapshots never collide.
- The to-backlog `scripts/prepare-temp.js` imports the resolver shipped in the SAI tools, runs on every platform, takes an optional harness argument (derived from its installed root when absent), and keeps only the outside-repository check of its own; root and child safety checks come from the resolver.
- `skills/universal/to-backlog/SKILL.md`, `prepare-temp.md`, and the GitHub, GitHub update, and Azure DevOps provider instructions drop the Linux-only and Windows-specific temporary-directory wording; `sai/commands/explore/instructions.md` drops "on Linux" from the to-backlog exception.
- `AGENTS.md`, `docs/commands/sai-explore.md`, and `sai/policies/stage-machine.md` name the SAI temp root instead of the system temp directory.
- `.github/workflows/ci.yml` prepares `/tmp/claude-$(id -u)` alongside `/tmp/opencode` on Linux.
- Tests cover the harness derivation, a source guard that no tool other than `temp-root.js` names `os.tmpdir()`, `TMPDIR`, or `/tmp`, session placement per harness, distinct snapshot records, and cross-platform preparation.

## Capabilities

### New Capabilities

- None

### Modified Capabilities

- `sai-temp-root`: the resolver derives the harness from an installed path, verifies every created child, and every SAI temp writer resolves its root through it.
- `stage-machine-cli-interface`: session files live in the SAI temp root of the harness.
- `session-state-lifecycle`: session discovery is SAI-temp-root-relative instead of `TMPDIR`-relative.
- `slice-path-scope`: snapshot records live in private directories under the SAI temp root, referenced by directory name.
- `to-pr`: preparation uses the SAI temp root.
- `to-backlog-conversation-capture`: preparation runs on every platform; the Linux-only activation is removed.
- `to-backlog-github-publication`: the preparation helper runs on every platform with an optional harness argument and delegates root safety to the resolver.
- `to-backlog-harness-installation`: preparation regression coverage applies on every platform.
- `explore-read-only-discipline`: the scoped to-backlog exception is no longer Linux-only.

## Impact

- Modified: `bin/sai-state.js`, `sai/tools/temp-root.js`, `sai/tools/to-pr.js`, `sai/tools/azure-publication.js`, `sai/tools/slice-path-scope.js`, `skills/universal/to-backlog/scripts/prepare-temp.js`, `skills/universal/to-backlog/SKILL.md`, `skills/universal/to-backlog/prepare-temp.md`, `skills/universal/to-backlog/providers/azuredevops.md`, `skills/universal/to-backlog/providers/github-update.md`, `skills/universal/to-backlog/providers/github.md`, `sai/commands/explore/instructions.md`, `sai/policies/stage-machine.md`, `docs/commands/sai-explore.md`, `AGENTS.md`, `.github/workflows/ci.yml`.
- Tests modified: `test/temp-root.test.js`, `test/sai-state.test.js`, `test/sai-state-ready-to-propose-emit.test.js`, `test/slice-path-scope-tool.test.js`, `test/to-pr.test.js`, `test/to-backlog-prepare-temp.test.js`, `test/ci-workflow.test.js`.
- Known limitation: `sai-state` sessions stored in the old `TMPDIR`-based location are not found after the change.
- Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill
