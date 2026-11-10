> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

Grandchildren survive the kill of `runProcess`'s direct child (`sai/tools/backlog-process.js:14-25`), plan publication runs git with no timeout and resets owned index entries on the real index (`sai/tools/plan-publication.js:72`), and the Azure DevOps adapter reports `content_status: complete` while the draft is still pending (`sai/tools/to-pr-azuredevops.js:62-63`). This change makes the external processes started by `to-backlog`, `to-pr`, `from-backlog`, and plan publication end within their bound together with every descendant, reads back a timed-out push or commit and reports it as uncertain, keeps plan publication from dropping content the user staged for a plan path, and holds the Azure DevOps risk comment until the draft state is verified. It closes findings F21, F22, F23, F24, and F25 of issue #399.

## What Changes

- `sai/tools/backlog-process.js`: `runProcess` becomes asynchronous. It starts each process as the leader of its own process group (detached on POSIX), resolves with a `spawnSync`-shaped result, and on reaching its bound (120 s by default) kills the whole group (`process.kill(-pid, 'SIGKILL')` on POSIX, `taskkill /PID <pid> /T /F` on Windows) and rejects with `reason: 'process-timeout'`. While a group runs, the module ends it when the calling process receives `SIGINT` or `SIGTERM` or exits; with no other handler left for the signal, the default action of that signal is applied. Output beyond `maxBuffer` ends the group and returns an `ENOBUFS` error.
- The backlog tools (`to-backlog*.js`, `from-backlog*.js`, `from-next-backlog-item*.js`, `backlog-*.js`, `azure-publication.js`), `to-pr.js`, `to-pr-comments.js`, and the provider adapters reached through `io.run` (`to-pr-github.js`, `to-pr-gitlab.js`, `to-pr-azuredevops.js`) become asynchronous along their call chains, with no other change to their outputs.
- `sai/tools/to-pr.js`: a `git push` that reaches the process bound returns `status: uncertain`, `reason: push-timeout`, and `remote_state` (`at-approved-commit`, `not-at-approved-commit`, or `unverified`) read back from the remote; the push is never repeated on its own and the result is never `blocked`. The request status becomes `complete` only when its content and any requested draft state are both verified, so the risk comment stays `pending` until then.
- `sai/tools/to-pr-azuredevops.js`: recovery reports `content_status: pending` while the requested draft state is still pending.
- `sai/tools/plan-publication.js`: every git call runs through the asynchronous `runProcess` with its 120 s bound and process-group kill, instead of its own `execFileSync` wrapper. `query` lists in `staged_conflicts` the owned paths whose index entry differs from both `HEAD` and the working tree and returns `status: blocked`, `reason: staged-content`; `commit` throws on that result before any write, leaving the real index unchanged. A `commit` timeout reads `HEAD` back and returns `status: uncertain`, `reason: commit-timeout`, and `head_state` (`unverified`, `unchanged`, or `moved`) without repeating the commit; a timeout of the owned-entry reset returns `status: uncertain`, `reason: reset-timeout`.
- `sai/commands/plan/publication.md`, `skills/universal/to-pr/SKILL.md`, and `docs/commands/to-pr.md` describe the blocked staged-content result, the 120 s bound, and the uncertain push and commit timeouts.
- Tests cover the process-group kill of a grandchild, the interrupt cleanup, the push timeout readback, the staged-content block, the commit timeout readback, and the Azure DevOps comment ordering; `test/helpers/spawn-stub.js` stubs the asynchronous runner for the existing provider tests.

Known limitations and trade-offs accepted: the callers of `runProcess`, plan publication included, change to an asynchronous contract; a git hook or credential prompt that needs more than 120 s ends plan publication with an uncertain result. A remote readback right after a push timeout can race a surviving git process, so that result is reported as uncertain rather than as failed. Follow-up findings F28, F29, F30, F31, F32, F33, F34, F37, and F38 stay tracked in issue #399, and the refuted findings F20, F35, and F36 are dropped. The functional fix loop of the implementation reported no findings (High=0 Medium=0 Low=0).

## Capabilities

### New Capabilities

None

### Modified Capabilities

- `backlog-publication`: the external processes of the backlog tools end together with their process group at the bound and when the calling tool is interrupted.
- `plan-artifact-publication`: plan publication blocks on staged content it would drop, bounds every git call, and reads back a timed-out commit as uncertain.
- `to-pr`: a timed-out push is read back and reported as uncertain, and the risk comment waits for a verified draft state.

## Impact

New files:

- `test/helpers/spawn-stub.js`

Modified files:

- `docs/commands/to-pr.md`
- `sai/commands/plan/publication.md`
- `sai/tools/azure-publication.js`
- `sai/tools/backlog-assignment-github.js`
- `sai/tools/backlog-process.js`
- `sai/tools/backlog-provider-assignment.js`
- `sai/tools/backlog-provider-import.js`
- `sai/tools/backlog-provider-set.js`
- `sai/tools/backlog-set-github.js`
- `sai/tools/backlog-set-origin.js`
- `sai/tools/backlog-set-update.js`
- `sai/tools/backlog-slice-identity.js`
- `sai/tools/from-backlog-azuredevops.js`
- `sai/tools/from-backlog-github.js`
- `sai/tools/from-backlog-gitlab.js`
- `sai/tools/from-backlog.js`
- `sai/tools/from-next-backlog-item-azuredevops.js`
- `sai/tools/from-next-backlog-item-github.js`
- `sai/tools/from-next-backlog-item-gitlab.js`
- `sai/tools/from-next-backlog-item.js`
- `sai/tools/plan-publication.js`
- `sai/tools/to-backlog-azuredevops.js`
- `sai/tools/to-backlog-github.js`
- `sai/tools/to-backlog-gitlab.js`
- `sai/tools/to-backlog.js`
- `sai/tools/to-pr-azuredevops.js`
- `sai/tools/to-pr-comments.js`
- `sai/tools/to-pr-github.js`
- `sai/tools/to-pr-gitlab.js`
- `sai/tools/to-pr.js`
- `skills/universal/to-pr/SKILL.md`
- `test/azure-publication-corrections.test.js`
- `test/azure-publication.test.js`
- `test/backlog-gitlab.test.js`
- `test/backlog-process.test.js`
- `test/backlog-set-update.test.js`
- `test/backlog-slice-provider-parity.test.js`
- `test/from-backlog-azuredevops.test.js`
- `test/from-backlog.test.js`
- `test/from-next-backlog-item.test.js`
- `test/github-backlog-slice-lifecycle.test.js`
- `test/issue-origin-preservation.test.js`
- `test/plan-publication.test.js`
- `test/project-settings.test.js`
- `test/to-backlog-update.test.js`
- `test/to-backlog.test.js`
- `test/to-pr.test.js`

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

This change is one of four themed changes from issue https://github.com/mmadariaga/shared-ai/issues/399. It carries its own child issue as Backlog origin, so archiving it closes #403 while #399 stays open for the follow-ups; the user closes #399 by hand. A remote readback right after a push timeout can race a git process that survived the bound, which is why the result is reported as uncertain rather than as failed.
