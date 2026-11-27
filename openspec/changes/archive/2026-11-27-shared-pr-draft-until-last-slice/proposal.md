> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

When `/sai-explore` crystallizes a set of several slices on one shared branch and the publication answer is `yes`, every Direct Build - Unattended slice followed `sai/commands/build/publication.md`, which always requested `ready:true`. The shared request was therefore marked ready for review after the first slice, while later slices of the set were still pending, so a reviewer saw unfinished work presented as finished. The coordinator could not tell whether slices remained, because the `run` view of `explore-slice@1` exposed only `publication` and `moves`, and the branch strategy lived only in conversation state. In addition, `sai/tools/to-pr.js` carried the request state in two mutually exclusive fields, `draft` and `ready`.

## What Changes

- `sai/tools/to-pr.js` replaces the `draft` and `ready` request fields with one boolean, `publish_pr_as_draft`, accepted in unattended and interactive publication. An absent value behaves as `true`: a missing request is created as a draft and an existing request keeps its state. `false` creates a missing request ready for review and marks an existing draft ready. A request that still sends `draft` or `ready` is rejected with an error that names `publish_pr_as_draft`. The receipt and the `publish` and `recover` results report `publish_pr_as_draft: {value, status}`.
- The GitHub, GitLab, and Azure DevOps adapters (`sai/tools/to-pr-github.js`, `sai/tools/to-pr-gitlab.js`, `sai/tools/to-pr-azuredevops.js`) take the new field. The GitHub conversion of a ready pull request to a draft is removed, and an Azure DevOps update with a draft state no longer sends `isDraft:true`, so a request that is ready for review is never turned back into a draft.
- The `to-pr` skill and its provider references (`skills/universal/to-pr/`) and `docs/commands/to-pr.md` use `publish_pr_as_draft`. In interactive mode the skill sends `false` only when the user asks for a request that is ready for review, and the approval proposal shows the state the request is created in.
- `sai/commands/build/publication.md` sends the `publish_pr_as_draft` value its caller hands over, and `false` when it hands none, so `/sai-build` is unchanged. `sai/commands/plan/publication.md` sends `publish_pr_as_draft: true` in place of `draft:true`.
- `explore-slice@1` (`sai-state/machines/explore-slice.js`) records the branch strategy of the set (`shared`, `per-slice`, or `none`) through a new `branch-strategy` intent, with the same lifecycle as the publication answer, and its `run` view returns `branch_strategy` and `pending`, the names of the pending slices in inventory order. `sai/commands/explore/steps/route-selector.md` records the strategy when the branch answer is final (`## Branch strategy record`), and the round-3 publication question describes the draft-until-last-slice behavior.
- `sai/commands/explore/direct-build-coordinator.md` § Publication hands `build/publication.md` `publish_pr_as_draft: true` when the set's branch strategy is `shared` or `none` and another slice is still pending, and `false` otherwise; the terminal report states the published state and the number of slices still pending.
- `sai/commands/explore/steps/slice.md`, `sai/policies/stage-machine.md`, `bin/sai-state.js` comments, `AGENTS.md`, `docs/commands/sai-explore.md`, and `docs/project-settings.md` describe the new field, the branch strategy record, and the draft-until-last-slice behavior.
- Tests in `test/to-pr.test.js`, `test/azure-publication.test.js`, `test/build-publication.test.js`, `test/explore-slice-machine.test.js`, `test/explore-step-reachability.test.js`, and `test/sai-state-document-emit.test.js` cover the new field, the rejection of the retired fields, the branch strategy intent, and the `run` view.

## Capabilities

### New Capabilities

None

### Modified Capabilities

- `to-pr`: one boolean request state `publish_pr_as_draft` replaces `draft` and `ready` in the request, receipt, results, skill, and provider adapters; an absent value means draft and a draft request never demotes a ready request.
- `build-publication`: the build publication sends the caller's `publish_pr_as_draft` value, `false` by default for `/sai-build`.
- `explore-publication`: `explore-slice@1` records the set's branch strategy and returns the pending slices; a Direct Build slice of a set on one `shared` or `none` branch publishes a draft while other slices remain pending and marks the request ready on the last slice, and reports the published state.
- `explore-slice-machine`: the machine keeps the branch strategy with the publication answer across an unchanged re-crystallization, and its `run` view carries `branch_strategy` and the `pending` slice names.
- `explore-stage-machine`: the minimal wire outcome's `run` view of `explore-slice@1` includes `publication`, `branch_strategy`, and `pending`.

## Impact

- Modified files: `AGENTS.md`, `bin/sai-state.js`, `docs/commands/sai-explore.md`, `docs/commands/to-pr.md`, `docs/project-settings.md`, `sai-state/machines/explore-slice.js`, `sai/commands/build/publication.md`, `sai/commands/explore/direct-build-coordinator.md`, `sai/commands/explore/steps/route-selector.md`, `sai/commands/explore/steps/slice.md`, `sai/commands/plan/publication.md`, `sai/policies/stage-machine.md`, `sai/tools/to-pr-azuredevops.js`, `sai/tools/to-pr-github.js`, `sai/tools/to-pr-gitlab.js`, `sai/tools/to-pr.js`, `skills/universal/to-pr/SKILL.md`, `skills/universal/to-pr/providers/azuredevops.md`, `skills/universal/to-pr/providers/github.md`, `skills/universal/to-pr/providers/gitlab.md`, `test/azure-publication.test.js`, `test/build-publication.test.js`, `test/explore-slice-machine.test.js`, `test/explore-step-reachability.test.js`, `test/sai-state-document-emit.test.js`, `test/to-pr.test.js`.
- New files: none.
- Behavior: interactive `/to-pr` now creates a new request as a draft unless the user asks for one that is ready for review; an outdated caller that still sends `draft` or `ready` fails with an error; when the last slice of a shared set is not Direct Build, the request stays a draft until someone marks it ready. `/sai-build`, `/sai-plan`, and standalone `/sai-direct-build` keep their publication outcome, and sets with `per-slice` branches and single-slice sets keep publishing requests that are ready for review. Claude Code and opencode behave identically, because both use the same tool, skill, and cards.
- Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill
