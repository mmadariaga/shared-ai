> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

`/sai-build-new` reserved a review segment for a command that did not exist. The only review command, `/sai-5-review`, loads the shared orchestration that the `-new` family avoids. It also fixes findings itself, which duplicates the audit-findings pass of `/sai-3-implement-new`. This change adds a review-only command to the `-new` family. Findings get a single fix owner, and the user triages them before anything applies them.

## What Changes

- New command `/sai-4-review-new`. It reviews a change's diff against its parent branch in a fresh `sai-review-new-worker` and writes `openspec/changes/{name}/review.md`. It fixes no finding and has no Direct Build close and no review-fix worker.
- New cards under `sai/commands/review-new/`:
  - `coordinator.md`: argument parsing, change resolution without a picker, step-machine pointers, report verification, obstacle budget, commit, and close.
  - `worker.md`.
  - `steps/`: `common.md`, `establish-diff-scope.md`, `resolve-review-analysis.md`, and `close-review-outcome.md`.
- The coordinator loads only the ADR 0194 allowlist plus `finding-state.md`. The worker reads the report format in place from `sai/commands/review/review-report.template.md`.
- The review keeps the eleven passes, the finding rules and severities, and the security, performance, and accessibility triage. A `budget-explorer` adversary challenges the draft. Diffs of at most 500 changed lines are reviewed directly; larger diffs are delegated. Pending findings in `build-log.md` serve as leads that are verified before they enter the report.
- The coordinator verifies `review.md` itself. It spends at most 3 attempts with different approaches, then escalates with options that include stopping. When the project's ignore rules do not ignore `review.md`, the coordinator stages it alone and commits it in one local commit: no force-add, no push, no attribution trailer.
- New linear step machine `sai-state/machines/review-new-steps.js` (`review-new-steps@1`), registered in `sai-state/registry.js`.
- `/sai-build-new` now runs `/sai-4-review-new` as segment 2 after a completed `/sai-3-implement-new`. Its close prints the finding counts by category and the recommended audits. When fixable findings remain open, it invites the user to triage `review.md` and run `/sai-3-implement-new {name}`.
- Installation registers the command wrappers on both harnesses, the `review-new-command` profile, the `review-new` worker role (`worker-research` profile, one managed agent per harness), and the model-customization entries. The managed worker roster grows to eighteen.
- New ADR 0195, which amends ADR 0194, and the documentation updates that replace the `/sai-4-review` reservation with `/sai-4-review-new`.

## Capabilities

### New Capabilities

- `review-new-command`: `/sai-4-review-new` reviews a change's diff against its parent branch in a fresh worker and writes `review.md`, with no fixes.

### Modified Capabilities

- `build-new-command`: `/sai-build-new` runs `/sai-3-implement-new`, then one `/sai-4-review-new` pass, and closes with a findings summary and a triage invitation.

## Impact

- New files:
  - `commands/claude/sai-4-review-new.md`
  - `commands/opencode/sai-4-review-new.md`
  - `sai/commands/review-new/coordinator.md`
  - `sai/commands/review-new/worker.md`
  - `sai/commands/review-new/steps/common.md`
  - `sai/commands/review-new/steps/establish-diff-scope.md`
  - `sai/commands/review-new/steps/resolve-review-analysis.md`
  - `sai/commands/review-new/steps/close-review-outcome.md`
  - `sai-state/machines/review-new-steps.js`
  - `docs/adr/0195-review-new-is-a-review-only-command-of-the-new-family.md`
  - `docs/commands/sai-4-review-new.md`
  - `test/review-new-command.test.js`
- Modified files:
  - `sai/commands/build-new/coordinator.md`
  - `commands/claude/sai-build-new.md`
  - `commands/opencode/sai-build-new.md`
  - `sai-state/registry.js`
  - `sai/install-manifest.json`
  - `bin/install-flow.js`
  - `bin/install-manifest.js`
  - `bin/model-customization.js`
  - `bin/worker-matrix.js`
  - `fixtures/thin-command-wrappers-baseline.json`
  - `AGENTS.md`
  - `README.md`
  - `docs/adr/0000-INDEX.md`
  - `docs/commands/sai-build-new.md`
  - `docs/on-demand-commands.md`
  - `docs/sequential-pipeline.md`
  - The test suites that enumerate commands, workers, and rosters: `test/agent-projection-strategy.test.js`, `test/agent-sidecar-removal.test.js`, `test/agent-tunable-ownership.test.js`, `test/apply-routed-architecture.test.js`, `test/canonical-opencode-agent-behavior.test.js`, `test/claude-default-preset-alignment.test.js`, `test/code-quality-priority-stack-policy.test.js`, `test/command-launcher-card.test.js`, `test/doctor-fetch-resolution.test.js`, `test/doctor-retirement-step-5.test.js`, `test/implement-new-family.test.js`, `test/install-claude.test.js`, `test/install-manifest.test.js`, `test/install-opencode.test.js`, `test/linear-step-machines.test.js`, `test/model-customization-menu.test.js`, `test/uninstall-enumeration.test.js`, `test/uninstall-execution.test.js`, `test/worker-matrix-projection.test.js`, and `test/worker-matrix.test.js`.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Proposal Research Documentation

- `sai/commands/review/` and `sai/commands/review/review-report.template.md`
- `sai/policies/finding-state.md`
- `sai/commands/implement-new/coordinator.md`
- `sai/commands/build-new/coordinator.md`
- `sai-state/machines/red-new-steps.js`
- `docs/adr/0194-implement-new-runs-outside-the-shared-orchestration.md`
- `openspec/specs/sai-command-naming/spec.md`
- https://github.com/mmadariaga/shared-ai/issues/157

## Additional Notes

- Known limitations and accepted trade-offs:
  - The `-new` family keeps one read dependency on `sai/commands/review/review-report.template.md`.
  - In projects that ignore `openspec/changes/**`, a regenerated `review.md` replaces the previous report and leaves no git history of it.
  - Findings deleted by hand leave the `Summary:` tally of `review.md` out of step with the remaining findings.
- Rejected alternatives:
  - The name `/sai-4-review`: the naming spec forbids it, and the name has another historical meaning.
  - `/sai-5-review-new`: it breaks the 3 then 4 sequence.
  - A copy of the report template: two copies of the format could drift.
  - A close warning about the stale `Summary:` tally, or recomputing the tally: the tally is historical by design.
- This record states no requirement that `/sai-5-review` and the files under `sai/commands/review/` stay unchanged, because the diff evidences that only by absence. The staged diff modifies none of those files.
