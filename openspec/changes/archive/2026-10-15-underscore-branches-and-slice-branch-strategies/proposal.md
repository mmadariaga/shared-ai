> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

Users could not get their preferred branch-name format, and a sliced crystallization had no useful branch choices. The `new-change-branch` normalizer joined name words with hyphens. `/sai-explore` asked one yes/no branch question whatever the slicing was. Chained per-slice branches matter when a slice depends on the implementation of an earlier slice.

## What Changes

- `sai/tools/new-change-branch.js`: the `name` operation maps each run of non-alphanumeric characters to `_` and trims leading and trailing `_`. Branches are now `<type>/<id>_<name_with_underscores>` or `<type>/<name_with_underscores>`. The type whitelist, the identifier prefix, and the ref-format and collision checks are unchanged. Existing branches keep their names.
- `sai/tools/new-change-branch.js`: `create` accepts `require_clean: true`. With it, creation stops before any branch exists when the working tree has staged, unstaged, or untracked changes. Without it, dirty work is kept as before.
- `skills/universal/new-change-branch/SKILL.md`: documents the underscore format and `require_clean`. It adds one exception to the base question: when an invoking workflow supplies `base` and the user authorized creation in advance (the `per-slice` chain in `sai-explore`), the skill does not ask for a base. It shows the final branch and base and continues.
- `sai/commands/explore/steps/route-selector.md`: a single recorded change keeps the yes/no branch question. A slice set gets one localized three-choice question: `shared`, `per-slice`, `none`. It stays explicit under `--fast-track`. The Spanish example is “¿Quieres crear una nueva rama?”. A new `## Slice branch chain` section defines how the chain grows, when and how each branch is created, stops on uncommitted changes, existing expected branches, and the `slice_branches` record. All of this is conversation state only.
- `sai/commands/explore/steps/slice.md` and `sai/commands/explore/steps/pipeline-direct-build.md`: the next chained branch is prepared immediately before its slice starts, including before `{intent: auto-continue}` in Direct Build automatic continuation. A stop on uncommitted changes presents the native route picker instead.
- `sai/commands/explore/instructions.md`: choosing `per-slice` is advance acceptance of every later local branch creation and switch in the chain.
- `sai/commands/explore/steps/pipeline-plan-unattended.md` and the Manual sliced handoff in `route-selector.md`: the `next-slice` prompt says that `next-slice` confirms the slice is implemented and committed.
- Documentation: `docs/commands/new-change-branch.md`, `docs/commands/sai-explore.md`, `docs/on-demand-commands.md`, `docs/skills.md`, `README.md`, and `AGENTS.md` describe the new format and the branch strategies.
- Tests: `test/new-change-branch.test.js`, `test/explore-pipeline-selector.test.js`, `test/explore-step-reachability.test.js`, and `test/github-backlog-slice-lifecycle.test.js` cover naming, `require_clean`, the branch question, chain growth, holding the chain, collision, and conversation-scoped state.

## Capabilities

### New Capabilities

- None

### Modified Capabilities

- `new-change-branch`: underscore-separated branch names, the optional `require_clean` guard, and the base-question exception for an advance-authorized chain.
- `explore-pre-route-actions`: the three-choice branch strategy for slice sets and chained per-slice branch creation across slice transitions.
- `explore-instruction-delivery`: `per-slice` counts as advance acceptance of the chain's local branch operations.
- `backlog-slice-lifecycle`: automatic inter-slice switching stays excluded except for the user-chosen `per-slice` chain.
- `explore-pipeline-selector`: Direct Build `auto_continue` prepares the next chained branch first, and a stop on uncommitted changes falls back to the route picker.
- `plan-terminal-close`: the expanded close says that `next-slice` confirms the slice is implemented and committed.

## Impact

- Modified files: `sai/tools/new-change-branch.js`, `skills/universal/new-change-branch/SKILL.md`, `sai/commands/explore/instructions.md`, `sai/commands/explore/steps/route-selector.md`, `sai/commands/explore/steps/slice.md`, `sai/commands/explore/steps/pipeline-direct-build.md`, `sai/commands/explore/steps/pipeline-plan-unattended.md`, `docs/commands/new-change-branch.md`, `docs/commands/sai-explore.md`, `docs/on-demand-commands.md`, `docs/skills.md`, `README.md`, `AGENTS.md`, `test/new-change-branch.test.js`, `test/explore-pipeline-selector.test.js`, `test/explore-step-reachability.test.js`, `test/github-backlog-slice-lifecycle.test.js`.
- New files: none.
- The `explore-slice@1` stage machine and `sai-state/machines/explore-slice.js` are unchanged.
- Trade-offs: in a `per-slice` chain, independent slices inherit the previous branch's changes. `new-change-branch.js` gains one option. A branch with the expected name that was created outside the conversation needs a user decision instead of an automatic resume.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill
