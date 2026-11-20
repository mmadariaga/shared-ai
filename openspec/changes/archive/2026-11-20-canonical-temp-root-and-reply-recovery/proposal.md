> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

An opencode `/sai-archive` run stalled for twelve minutes and never archived. The worker's `edit` grant named the Windows 8.3 short temp path, built from the raw `os.tmpdir()` in `sai/tools/temp-root.js` `harnessRoot()` and derived into `bin/capabilities.js`, while the report directory that `makeTempDir` created had the long real path, so the worker's report save was denied. The coordinator then obeyed two instruction rules whose combination deadlocks a warming opencode worker that replies without a reference: the opencode binding's rule to send no message to a worker whose last status is `running`, and the transport policy's "Not a result" rule to keep waiting with the watch armed. It never recovered.

## What Changes

- `sai/tools/temp-root.js`: `harnessRoot()` builds the harness root from the real form of the temp base (`realpathSync.native` on Windows, `realpathSync` elsewhere, injectable through `io`): `/tmp` on Linux, `os.tmpdir()` on Windows and macOS. Permission rules, state stores, cache-warm waits, and created folders therefore share one spelling. A missing temp base raises `TEMP_ROOT_MISSING` naming it; a temp base that cannot be resolved raises a blocker naming it, with no fallback to the raw form. `realpathFor` is exported.
- `sai/tools/temp-root.js`: on Linux the symbolic-link guard now covers only the harness folder and below, because the temp base is already real; a linked `/tmp` passes and a linked harness folder still blocks.
- `skills/universal/to-backlog/scripts/prepare-temp.js`: resolves the working directory with the same real-path resolver as the temp root, so the two compare equal when the temp base has a second spelling.
- `sai/policies/worker-report-transport.md`: a worker message that carries no reference and is not a protocol literal gets one immediate scan of that worker's report directory (`transfer.js watch --settle 0s --max 1s` with the task's writable-paths file); a report found is processed as delivered, and none found makes the message an invalid report (first back to the same worker, second replaces it, each one obstacle attempt). Protocol literals keep the wait. The Terms gain **Protocol literal**, **Unledgered report**, and **Scan**.
- `sai/policies/cache-warming.md`: § Wake acknowledgement points a non-literal reply to the reply-without-reference handling.
- `sai/orchestration/workers/bindings/opencode/standalone-worker-template.md`: a `running` notification whose background work is only the worker's own `wait.js warm` marks an idle worker that the coordinator processes and may continue; a refused continuation is one obstacle attempt, recovered by stopping the worker's shells with `dispose-shells.js` and continuing again. The Claude Code template is unchanged.
- `AGENTS.md` and `docs/doctor.md`: state that the temp base always appears in its real form and that rules installed earlier keep the old spelling until the next install.
- Tests: `test/temp-root.test.js` (real-form expectations, Windows short name, macOS `/var`, linked Linux `/tmp`, unresolvable base, linked harness folder), `test/capability-profiles.test.js` (rules cover the folders `makeTempDir` creates when the temp base is a link), the policy-text assertions in `test/undelivered-report-recovery.test.js` (protocol literals keep the wait, a reply without a reference is scanned at once), and fixture updates in `test/cache-warmer.test.js`, `test/claude-default-preset-alignment.test.js`, and `test/to-pr.test.js` that inject a real-path resolver.

Scope drift (not an implementation error): `skills/universal/to-backlog/scripts/prepare-temp.js` resolves its working directory with the temp root's real-path resolver. The selected diff evidences this behavior, but the supplied intent statement did not name it.

## Capabilities

### New Capabilities

None

### Modified Capabilities

- `sai-temp-root`: the SAI temp root is built from the real form of the temp base on every platform; an unresolvable base is a blocker; the Linux link guard covers the harness folder and below; the root and created children share one spelling.
- `undelivered-report-recovery`: a worker reply without a reference that is not a protocol literal triggers an immediate scan and, when nothing is found, the invalid-report recovery instead of a passive wait.
- `transfer-file-transport`: transfer directories live under the real form of the temp base.
- `opencode-temp-access-grant`: the opencode `external_directory` grant names the real SAI temp root, so a linked Linux `/tmp` gets a grant for its real root beside the literal `/tmp/opencode/*` grant.
- `agent-self-warming`: a translated or reworded literal is handled as a reply without a reference instead of keeping the wait.
- `opencode-subagent-calls`: an opencode worker whose `running` notification shows only its own cache-warm wait may be continued, and a refused continuation is recovered through `dispose-shells.js`.

## Impact

- Modified files: `sai/tools/temp-root.js`, `skills/universal/to-backlog/scripts/prepare-temp.js`, `sai/policies/worker-report-transport.md`, `sai/policies/cache-warming.md`, `sai/orchestration/workers/bindings/opencode/standalone-worker-template.md`, `AGENTS.md`, `docs/doctor.md`, `test/temp-root.test.js`, `test/capability-profiles.test.js`, `test/undelivered-report-recovery.test.js`, `test/cache-warmer.test.js`, `test/claude-default-preset-alignment.test.js`, `test/to-pr.test.js`.
- New files: none.
- `bin/capabilities.js` is unchanged and keeps deriving every temp rule from `harnessRoot()`, so its generated rules now name the real temp base.
- Permission rules installed before this change keep the raw spelling until the next install regenerates them; no installed profile is migrated.
- Accepted trade-offs: a reply such as "Ending this turn" now spends an obstacle attempt when the scan finds no report; the `dispose-shells.js` recovery ends the worker's cache warming.
- Not added: a `doctor` check for a mismatch between rule paths and real paths, and a way to save a report without the native file-write tool.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

Future scope, outside this change: a `doctor` warning when the temp-root path in installed rules differs from its real form, and a way for a worker to save its report when the native file-write tool is denied (a `transfer.js` subcommand that writes the draft itself). Both were proposed in the same retrospective and deferred.
