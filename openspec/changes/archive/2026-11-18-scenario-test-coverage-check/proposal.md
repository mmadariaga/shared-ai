> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

The `/sai-3-implement` step review checks that every spec scenario maps to a test as an inferential judgment of the coordinator. A missed scenario is therefore an attention lapse that the judgment pass can repeat, while the review spends effort on a question that a deterministic tool can answer: does a test exist whose name contains the scenario title.

## What Changes

- New tool `sai/tools/scenario-coverage.js` with two sub-commands, both taking `--cwd <project-root>`:
  - `step --input-file <path>` reads a JSON list of the scenario titles of one step brief.
  - `change <change-name>` checks every scenario the change adds or modifies: ADDED scenarios, and MODIFIED or RENAMED scenarios whose title or body differs from the same scenario in `openspec/specs/<capability>/spec.md`. A capability with no main spec counts as new; a scenario under a REMOVED requirement is never checked.
  - A scenario is covered when its normalized title (lowercased, punctuation removed, whitespace runs collapsed) appears contiguously in the normalized content of a file changed by the change since the change base (the merge-base of `HEAD` with the parent branch: the default branch of `origin/HEAD`, then `master`, then `main`). Changed files are `git diff --name-only <change base>`, staged changes, and untracked files that are not ignored; files under `openspec/`, deleted files, and non-text files are left out.
  - Output is one JSON object with `verdict` (`clean`, `missing`, `n/a`), `missing`, `ambiguous`, `parent_branch`, and `change_base`. Scenarios that share one normalized title are reported as `ambiguous` and matched by no test. A change whose `.openspec.yaml` sets `skip_specs: true`, a step with no titles, and a change with no new or changed scenarios get `n/a`. Exit 0 is `clean` or `n/a`, 1 is `missing`, 2 is a usage or I/O error.
- New shared module `sai/tools/spec-scenarios.js` holds the `#### Scenario:` parsing that `sai/tools/check-delta-headers.js` used to carry inline; `check-delta-headers.js` now requires it, with no change to its behavior or output.
- `sai/commands/implement/coordinator.md`:
  - The step review's structural check runs step mode first, for a step whose brief lists spec scenarios and whose RED was not skipped by a recorded deviation; a `skip_specs` change keeps the inferential check alone.
  - Change mode runs once after every task is checked and before the audit reports are applied; the steps that fix its findings run step mode in their own review, and change mode is not run again.
  - Each `missing` entry and each `ambiguous` group becomes a finding in the artifact review contract's shape that names the scenario title and goes through RED first; in change mode it goes through the audit-finding cycle with the title, capability, and requirement in place of tasks. An `ambiguous` finding closes once RED has written one test for each scenario of the group. A tool error is an obstacle of the step, never a finding.
- `sai/commands/implement/steps/red-step.md` step 2 requires each test name to contain its spec scenario title, carried as words separated by spaces (in a description string, display name, or docstring where identifiers cannot hold it), because the coverage check matches it literally.
- `AGENTS.md` (the `sai/tools/` row) and the invocation list of `sai/policies/tool-resolution.md` register the tool.
- `test/scenario-coverage.test.js` covers the tool with `node:test`.

Scope drift (not an implementation error): change mode answers `n/a` with the reason `no new or changed scenarios` when the change holds no scenario to check. The selected diff evidences this behavior, but the supplied intent statement did not name it.

Scope drift (not an implementation error): an `ambiguous` finding closes once RED has written one test for each scenario of the group, and the group is not raised again. The selected diff evidences this behavior, but the supplied intent statement did not name it.

Scope drift (not an implementation error): change-mode findings go through the audit-finding cycle with a brief that carries the scenario title, capability, and requirement in place of tasks, and the fixing steps run step mode in their own review instead of a second change-mode run. The selected diff evidences this behavior, but the supplied intent statement did not name it.

## Capabilities

### New Capabilities

- `scenario-test-coverage`: the deterministic `scenario-coverage.js` tool that matches spec scenario titles against the files changed by the change and reports missing and ambiguous scenarios.

### Modified Capabilities

- `implement-new-adversarial-review`: the step review's structural check runs the scenario coverage check in step mode, and the coordinator runs it once in change mode after every task is checked, turning its gaps into findings.
- `implement-new-workers`: RED names each test so that the name contains its spec scenario title.
- `sai-tools-distribution`: `scenario-coverage.js` and `spec-scenarios.js` join the registered deterministic tool roster, installed by the existing `sai-tools` projection for Claude Code and opencode with no manifest change.

## Impact

New files:
- `sai/tools/scenario-coverage.js`
- `sai/tools/spec-scenarios.js`
- `test/scenario-coverage.test.js`

Modified files:
- `sai/tools/check-delta-headers.js` (requires the shared parser; behavior and output unchanged)
- `sai/commands/implement/coordinator.md`
- `sai/commands/implement/steps/red-step.md`
- `sai/policies/tool-resolution.md`
- `AGENTS.md`

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill
