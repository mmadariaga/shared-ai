> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

The draft PR/MR offer of `/sai-plan` arrived only after planning finished, and the publication it started then asked two more approvals (the local plan inclusion and the exact remote approval). An unattended plan run therefore still waited for a human at its end. Moving the publication answer to the start of the run, and letting a SAI coordinator that holds that answer publish without further approval tokens, removes the last human wait from a plan run.

## What Changes

- `/sai-plan` resolves a publication answer once at its start, after its input checks pass (block verification, change resolution, and the spec segment's block validation when it runs) and before its first worker is created. The order is: the `--publish yes|no` argument, the answer recorded in `plan-run@1`, the `pr.publishAfterRun` project setting when it reads `yes` or `no`, and last one question. The question names the change, the current branch, and its remote, and states that a new request is a draft and an open request keeps its state. A cancelled question counts as `no`; a detached HEAD asks nothing and records nothing.
- `/sai-plan` accepts `--publish yes|no`; any other value, or a missing value, ends the run before anything is written with `Cannot start /sai-plan: --publish takes yes or no.`. The Claude Code wrapper's argument hint names the option.
- The answer is recorded with a new `publication` event of the shared run core, enabled for `plan-run@1`. The `run` view returns it (`''` until answered); a resumed run reuses it; an explicit `--publish` replaces it and the closing report says so.
- The post-completion offer (`Create or update a draft PR/MR with the complete plan for {name}?`) is removed. With a `yes` answer and both segments completed, the coordinator publishes after the last local commit, telemetry commit included, and before the closing line. A failed, stopped, or unanswered run publishes nothing. A publication that fails or is skipped never stops the run or changes its outcome.
- `sai/commands/plan/publication.md` becomes the unattended publication: destination resolution without questions, `plan-query`, `plan-commit --unattended`, fresh `/to-pr` collection with `draft:true`, `push --unattended`, `prepare`, and `publish --unattended`, with read-only `recover` on `uncertain` or `partial_failure`, and one short outcome paragraph.
- `sai/tools/to-pr.js` gains an `--unattended` flag accepted only on `plan-commit`, `push`, and `publish`. The flag, never a request field, replaces the `approved`/`confirmation` checks and keeps every other check. In unattended mode the tool refuses, with `status: blocked` and a `refusal` field, a force push (`force-push`), a detached HEAD (`detached-head`), the provider's default branch (`default-branch`), a provider without a closed-request query (`provider-unsupported`), a publication of a branch not at the pushed commit (`not-published`), and a branch with no open request whose last request was merged or closed (`request-merged`, `request-closed`, with the `request` named). In unattended mode an open request keeps its draft or ready state: `draft:true` only decides the state of a request created now.
- `sai/tools/plan-publication.js` `commit` accepts the unattended request: the confirmation of the plan just queried replaces the approval token, and the recheck before the commit still ends the commit when the plan, index, or HEAD change.
- The GitHub, GitLab, and Azure DevOps adapters gain `closedRequests`, which reports the branch's merged and closed requests (GitHub `state=closed` with `merged_at`; GitLab `state=merged` and `state=closed`; Azure DevOps `completed` and `abandoned`), each filtered by the exact source and target. Their provider documents describe the read.
- `skills/universal/to-pr/SKILL.md` gains § 5 Unattended publication, for a SAI coordinator that holds a recorded `yes` answer only; the approval rule now says that unattended mode authorizes nothing outside that coordinator. The interactive flow is unchanged for every other invocation.
- `sai/tools/project-settings.js` gains `pr.publishAfterRun` (`yes`, `no`, or `ask`; normalized to lower case). It is not a `/to-pr` destination field and the settings screen does not list it.
- Explore's Plan - Unattended route (`pipeline-plan-unattended.md`) lets the plan coordinator ask its start question inside the route when no answer is handed over, and hands over no `--publish` line yet.
- `AGENTS.md`, `README.md`, `docs/commands/sai-plan.md`, `docs/commands/to-pr.md`, `docs/on-demand-commands.md`, and `docs/project-settings.md` describe the start-of-run answer, the unattended mode, and the setting; `AGENTS.md` states that ADR 0209b decision 4 no longer applies to a run that holds a recorded answer.
- Tests cover the start question, the `publication` event, the setting, and each unattended refusal.

Scope drift (not an implementation error): `to-pr.js` refuses unattended mode with `provider-unsupported` when the provider adapter has no closed-request query. The selected diff evidences this behavior, but the supplied intent statement did not name it.

Scope drift (not an implementation error): `/sai-plan` ends before writing anything when `--publish` carries no value or a value other than `yes` or `no`. The selected diff evidences this behavior, but the supplied intent statement did not name it.

## Capabilities

### New Capabilities

None

### Modified Capabilities

- `plan-command`: the post-completion publication offer is replaced by a start-of-run publication answer, the `--publish` argument, and unattended publication at the end of a successful run.
- `plan-artifact-publication`: plan inclusion and remote publication run unattended under the recorded answer, with failures skipping only publication.
- `plan-segment-cycle`: `plan-run@1` records the publication answer through the shared run core's `publication` event, and only the `/sai-plan` publication of a `yes` run pushes.
- `to-pr`: the unattended mode for a SAI coordinator that holds a recorded answer, its refusals, and the merged and closed request query of each provider.
- `project-settings`: the `pr.publishAfterRun` key.
- `explore-pipeline-supervision`: the Plan - Unattended route lets the plan coordinator ask its start question inside the route and hands over no `--publish` line.
- `change-telemetry`: `/sai-plan` collects telemetry before its publication and its closing line.

## Impact

- Modified: `sai/commands/plan/coordinator.md`, `sai/commands/plan/publication.md`, `sai/commands/explore/steps/pipeline-plan-unattended.md`, `commands/claude/sai-plan.md`
- Modified: `sai-state/machines/run-core.js`, `sai-state/machines/plan-run.js`
- Modified: `sai/tools/to-pr.js`, `sai/tools/plan-publication.js`, `sai/tools/to-pr-github.js`, `sai/tools/to-pr-gitlab.js`, `sai/tools/to-pr-azuredevops.js`, `sai/tools/project-settings.js`
- Modified: `skills/universal/to-pr/SKILL.md`, `skills/universal/to-pr/providers/github.md`, `skills/universal/to-pr/providers/gitlab.md`, `skills/universal/to-pr/providers/azuredevops.md`
- Modified: `AGENTS.md`, `README.md`, `docs/commands/sai-plan.md`, `docs/commands/to-pr.md`, `docs/on-demand-commands.md`, `docs/project-settings.md`
- Modified: `test/plan-publication.test.js`, `test/plan-family.test.js`, `test/to-pr.test.js`, `test/project-settings.test.js`, `test/azure-publication.test.js`
- Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

Follow-up slices of https://github.com/mmadariaga/shared-ai/issues/460, outside this change: https://github.com/mmadariaga/shared-ai/issues/462 (`pr-publication-answer-at-build-start`) owns the provider mark-ready operation with verified readback, the `implement-run@1` exposure of the `publication` field, and the `/sai-build` start question; its issue text still lists the full I3 and I5 and should drop the parts this change delivers. https://github.com/mmadariaga/shared-ai/issues/463 (`pr-publication-answer-in-explore`) owns the round-3 question, which hands its answer to `/sai-plan` through `--publish`. Explore's round 2 already uses "publication approval" for the backlog item, so the round-3 question needs distinct visible wording such as "PR/MR publication".
