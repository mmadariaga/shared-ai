> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

SAI commands that run project tests followed three different policies. `/sai-3-implement` ran each step's own tests plus the tests `test-select.js` reported as affected, but its Close ran the full unit and integration suites. The Direct Build suite gate ran the full suite on every gate round. `/sai-merge` ran a full-suite baseline at `HEAD` before the launch and a full-suite verification at the end. Each command also resolved its test command differently, classified failing tests with a different mechanism (`test-select.js swap`/`restore`, a detached `git worktree` at `base_sha`, an eager baseline), handled flaky tests differently, and treated a runner that cannot run differently. Running the full suite inside these commands cost time on every run, and the divergence made the behavior hard to predict and maintain. Several small inconsistencies also remained: the GREEN worker still required earlier steps' tests to stay green, the RED `test_command` had two meanings, "baseline" meant both the dirty git state and a suite result, and two ADRs carried the number `0229`.

## What Changes

- A new policy, `sai/policies/test-execution.md`, is the single source for how `/sai-3-implement` (and through it `/sai-build` and `/sai-deep-review`), Direct Build (the explore route and `/sai-direct-build`), and `/sai-merge` choose, run, and classify project tests: the indicated tests plus the tests related to the changed files, the full suite only when the selection cannot be trusted, lazy classification (rerun at the current state, then a run at the classification base through `test-select.js swap` and `restore`), the `test-command` obstacle, and the closing-report lines. The routine full-suite run belongs to CI.
- `sai/tools/test-select.js` gains a `command` subcommand, the shared resolver of the test command and its scoping idiom (`verdict` `found`, `none`, or `ambiguous`; sources `tasks.md`, `SAI_LEARNINGS.md`, `AGENTS.md`, `README.md`, then the project markers, which moved there from `merge.js`). `swap` accepts `--base <sha>` (exclusive with `--parent-branch`) and `--paths-file <path>` for uncommitted run files. `select` derives the indexed file types from `codegraph files --json`, so documentation, configuration, and asset files no longer cause `unindexed-file`.
- `/sai-3-implement` Close runs every plan test plus the tests related to the whole change diff instead of the full unit and integration suites; the coordinator resolves the test command once and names the `test-command` obstacle.
- The Direct Build suite gate runs the tests the implementer created or modified plus the tests related to the diff since `base_sha` on every run, classifies failures with `swap --base <base_sha> --paths-file` instead of a detached `git worktree`, records the dirty git state when it dispatches the implementer, and treats an ambiguous command or a runner that cannot run as an obstacle of `step-2b`. `direct-build-run@1` accepts the `baseline` and `swap` record references.
- `/sai-merge` runs no test before the launch, verifies the tests related to the files that differ between the pre-launch `HEAD` and the final tree, and classifies failures against the pre-launch `HEAD`. `merge.js` drops suite discovery (`suite`), `verify --baseline`, and `--baseline-record` with their comparison; `verify` takes only `--command`. A not-runnable command is the `test-command` obstacle. The `baseline` of `merge-run@1` now names the dirty git state file.
- `/sai-2-design` takes the draft of `**Test Command**` from the shared resolver.
- Cleanups: the GREEN worker closes its step when the step's tests and its selection pass (the earlier-steps rule is removed); the RED `test_command` means only one step's tests in every file; "baseline" means only the dirty git state; the later ADR `0229` is renumbered to `0232`.
- Documentation, `AGENTS.md`, `README.md`, the `sai-merge` wrappers of both harnesses, and the tests are updated to match; `test/merge-baseline-verification.test.js` is replaced by `test/merge-verification.test.js`, and `test/test-execution-policy.test.js` is added.

## Capabilities

### New Capabilities

- `test-execution`: the shared policy and resolver every test-running SAI command follows to choose, run, and classify project tests.

### Modified Capabilities

- `implement-new-loop`: Close runs the plan tests plus the related tests of the whole change instead of the full suites.
- `direct-build-suite-gate`: the gate runs indicated and related tests and classifies failures with `swap`/`restore` at `base_sha`; an unrunnable command is an obstacle with escalation.
- `direct-build-run-state`: the machine records the dirty git state and the swap record.
- `sai-merge-command`: merge resolves its command through the shared resolver, runs no pre-launch baseline, and verifies related tests on the final tree with lazy classification.
- `tasks-implementation-context`: design drafts `**Test Command**` from the shared resolver.

## Impact

New files:
- `sai/policies/test-execution.md`
- `test/merge-verification.test.js`
- `test/test-execution-policy.test.js`

Modified files:
- `sai/tools/test-select.js`, `sai/tools/merge.js`
- `sai-state/machines/direct-build-run.js`, `sai-state/machines/merge-run.js`
- `sai/commands/implement/coordinator.md`, `sai/commands/implement/green-worker.md`, `sai/commands/implement/steps/green-step.md`, `sai/commands/implement/steps/red-step.md`
- `sai/commands/design/red-worker.md`, `sai/commands/design/steps/tasks.md`
- `sai/commands/explore/direct-build-coordinator.md`
- `sai/commands/merge/coordinator.md`, `sai/commands/merge/mechanics.md`
- `commands/claude/sai-merge.md`, `commands/opencode/sai-merge.md`
- `AGENTS.md`, `README.md`, `docs/adr/0000-INDEX.md`, `docs/commands/sai-3-implement.md`, `docs/commands/sai-deep-review.md`, `docs/commands/sai-direct-build.md`, `docs/commands/sai-merge.md`, `docs/review-triage.md`, `docs/sequential-pipeline.md`
- `test/claude-default-preset-alignment.test.js`, `test/direct-build-run-machine.test.js`, `test/implement-family.test.js`, `test/merge-efficiency-tool.test.js`, `test/merge-goal-driven.test.js`, `test/merge-pre-launch-simulation.test.js`, `test/merge-run-machine.test.js`, `test/test-select.test.js`

Renamed files:
- `docs/adr/0229-lazy-failure-baseline-in-the-working-tree.md` → `docs/adr/0232-lazy-failure-baseline-in-the-working-tree.md`

Deleted files:
- `test/merge-baseline-verification.test.js`

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill
