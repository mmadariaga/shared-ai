> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

**Complexity**: high (6 capabilities; shared prose in 2 files)

## Why

A Direct Build run archived and committed a feature whose tests were failing, because the route's only test step was optional ("the project's checks when available"), the implementer had no test completion criterion, and the terminal report accepted `No known verification issues.` when nothing had been observed. The route now needs an observable, binary test criterion before it backfills, archives, and commits.

## What Changes

- Added Step 2b, **Suite gate**, to the full `direct-build-unattended` route in `sai/commands/explore/steps/pipeline-direct-build.md`, between the Step 2 functional fix loop and Step 3 backfill. Its completion criterion is binary (green or stop); it is a substep of `Build/Implement`, adds no panel entry, and keeps the eight-step numbering.
- The coordinator runs the full test suite through an executor subagent (budget executor binding, `ready` handshake) that returns the command, whether it ran, the exit code, and the failing test identifiers, and never moves HEAD or touches the working tree.
- No detectable suite prints exactly `> Suite gate: skipped — no test suite found` and continues; a suite that cannot run stops the route with the command and the error.
- On the first red run only, a second executor runs just the failing tests at `base_sha` in a temporary detached `git worktree` outside the working tree, removed even on failure; `fail` is a pre-existing failure (reported, never blocking), `pass` and `unrunnable` are new failures. All-pre-existing reds continue to Step 3 with no gate round.
- New failures go to the same implementer as an ordered finding list (the fix-loop continuation type) plus one fresh executor rerun per gate round; `gate_rounds` joins Run state with at most three rounds per attempt, reset per attempt, independent of `fix_rounds`. Later-round first failures are new failures directly, and a gate round never reopens the adversarial review.
- New failures after the third gate round, or an unrunnable suite, stop the route like `/sai-4-apply`'s Terminal suite gate: no Steps 3–8, guard window 1 verified, changes left unstaged, an incomplete `Outcome` and a `Verification` listing the red tests, then `{intent: fail}` to `explore-slice@1`; the slice stays retryable, no later slice starts, and the stop bypasses **Bounded Recovery** and the completion transition.
- Removed check (a) ("the project's checks when available") from the Step 2 functional fix loop; the structural and empirical checks remain.
- Rewrote the terminal report `Verification` rule in positive form: it always states the gate command and observed result, lists pre-existing failures classified at `base_sha`, and lists test files touched in gate rounds; `No known verification issues.` is valid only with a green gate, no pre-existing failure, and no gate-touched test file.
- The `--no-specs` POC profile explicitly runs Steps 1 and 2 without Step 2b; `Build/Implement` completes only when the gate is green or skipped; guard window 1 is verified after the gate is green, skipped, or stopped.
- Added a failing-test completion criterion to the implementer's functional fix loop continuation in `sai/commands/explore/direct-build-worker.md`: a failing-test finding is resolved only once the worker has run that test and it passes; the worker may modify test files whose assertions the change made obsolete and reports every touched test file in `changed_files`.

## Capabilities

### New Capabilities
- `direct-build-suite-gate`: mandatory executor-run full-suite gate (Step 2b) with binary green/stop outcome, `base_sha` classification of pre-existing failures on the first red, bounded gate correction rounds through the same implementer, and the apply-style stop.

### Modified Capabilities
- `direct-build-reviews`: project checks move out of each fix-loop round into the Step 2b suite gate; the round keeps the structural and empirical checks.
- `explore-pipeline-supervision`: the eight-step flow runs the suite gate before backfill and reports observed verification; per-attempt reset includes `gate_rounds`; guard window 1 is verified after the suite gate.
- `auto-fast-implement-worker`: fix-loop continuations gain the failing-test completion criterion; the implementer window is verified after the suite gate.
- `mode-specific-explore-todo`: the suite gate is a `Build/Implement` substep and `Build/Implement` completes only on a green or skipped gate.
- `explore-pipeline-selector`: the preserved Direct Build order includes the suite gate between functional fix and backfill.

## Impact

- Modified: `sai/commands/explore/steps/pipeline-direct-build.md`
- Modified: `sai/commands/explore/direct-build-worker.md`
- Shared prose only: both Claude Code and opencode already bind an executor subagent, so no wrapper, manifest, or binding changes. `/sai-4-apply`, `/sai-build`, and `/sai-review` are unchanged.
- Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill
