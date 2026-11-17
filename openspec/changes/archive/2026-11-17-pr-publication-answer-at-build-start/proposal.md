> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

`/sai-build` had no publication step, so the draft PR/MR that `/sai-plan` leaves stayed a draft until the user published it by hand. The build now resolves a publication answer at its start and, with a `yes`, publishes a request that is ready for review at its end with no further confirmation, marking an existing draft request ready.

## What Changes

- `sai/commands/build/coordinator.md` gains a `## Start` section that strips `--fast-track`, takes `--publish yes|no` out of the arguments (ending the run before any write when the value is missing or invalid), and a `## Publication answer` section. The answer is resolved inside segment 1, between its Start step 4 and step 5, in the order `--publish`, the `publication` recorded in `implement-run@1`, the `pr.publishAfterRun` setting, then one question through `AskUserQuestion` (Claude Code) or `question` (opencode) with the options `Publish ready request` and `Do not publish`. A detached HEAD asks nothing and records nothing.
- The answer is recorded in `implement-run@1` right after segment 1 opens its run and again right after segment 3 opens its new run. The `implement-{name}` `sai-state` session stays open across the build's segments, and `/sai-build` closes it at its own Close after the publication step; a failed, stopped, or blocked run leaves it open so a rerun finds the recorded answer.
- After the telemetry commit, a completed build with a `yes` answer follows the new `sai/commands/build/publication.md`, which runs the `to-pr` destination, query, non-force push, and `publish --unattended` with `ready:true`, with no plan-commit step. A failed or skipped publication, or a failed mark-ready, is reported and never changes the build's completed outcome.
- `sai/commands/implement/coordinator.md` Close step 7 skips only the session `close` inside `/sai-build`.
- `sai-state/machines/implement-run.js` builds its machine with `publication: true`, so `implement-run@1` carries the `publication` field and event.
- `sai/tools/to-pr.js` accepts an explicit `ready:true` request state for `publish --unattended` only, rejects any other `ready` value and its combination with `draft:true`, and verifies the ready state in publication and read-only recovery (a `ready` result field with `requested` and `status`).
- The provider adapters mark a draft request ready: GitHub through the GraphQL `markPullRequestReadyForReview` mutation after the content update, GitLab by writing the title without the `Draft: ` prefix, and Azure DevOps by setting `isDraft:false` on an update of a draft request.
- The `build-command` capability profile in `sai/install-manifest.json` gains the `fetch`, `to-pr`, and `safe-operations` skills; `commands/claude/sai-build.md` names `--publish yes|no` in its `argument-hint`.
- `pr.publishAfterRun` is documented as the answer for both `/sai-plan` and `/sai-build`; the `to-pr` skill, its provider references, `README.md`, `AGENTS.md`, and the command docs describe the build publication and the ready request state.

## Capabilities

### New Capabilities

- `build-publication`: start-of-run publication answer, its recording in `implement-run@1`, and unattended ready-for-review publication for `/sai-build`.

### Modified Capabilities

- `to-pr`: unattended `ready:true` request state with mark-ready on GitHub, GitLab, and Azure DevOps and verified readback; the unattended mode admits `/sai-build`.
- `project-settings`: `pr.publishAfterRun` answers the publication question of `/sai-build` as well as `/sai-plan`.

## Impact

- New: `sai/commands/build/publication.md`, `test/build-publication.test.js`.
- Modified: `sai/commands/build/coordinator.md`, `sai/commands/implement/coordinator.md`, `sai-state/machines/implement-run.js`, `sai/tools/to-pr.js`, `sai/tools/to-pr-github.js`, `sai/tools/to-pr-gitlab.js`, `sai/tools/to-pr-azuredevops.js`, `sai/tools/project-settings.js`, `sai/install-manifest.json`, `commands/claude/sai-build.md`, `skills/universal/to-pr/SKILL.md`, `skills/universal/to-pr/providers/github.md`, `skills/universal/to-pr/providers/gitlab.md`, `skills/universal/to-pr/providers/azuredevops.md`, `AGENTS.md`, `README.md`, `docs/commands/sai-build.md`, `docs/commands/sai-plan.md`, `docs/commands/to-pr.md`, `docs/project-settings.md`, `test/azure-publication.test.js`, `test/implement-family.test.js`, `test/implement-run-machine.test.js`, `test/orchestration-source-layout-step-2.test.js`, `test/plan-family.test.js`, `test/to-pr.test.js`.
- Known limitations: the build changes the state of a request that `/sai-plan` created with no question at that moment, and every `implement-run@1` run, a direct `/sai-3-implement` run and the `/sai-deep-review` fix segment included, carries an unused empty `publication` field.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill
