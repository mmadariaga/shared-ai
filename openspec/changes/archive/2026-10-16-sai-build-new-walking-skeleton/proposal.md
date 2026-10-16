> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

Unattended `/sai-build` (`/sai-3-implement` then `/sai-4-apply`) keeps stalling, and its recovery paths before a relaunch are expensive. Every shared orchestration contract it loads (`sai/orchestration/command-runner.md`, `sai/orchestration/worker-core.md`, `sai/policies/bounded-recovery.md`) stops to ask the user, freezes the plan, and grows by appending enumerations. This change adds a separate `-new` command family, written from scratch, whose contracts state goals and completion criteria and load only the cross-cutting policies that never stop a run.

## What Changes

- New command `/sai-3-implement-new` (`sai/commands/implement-new/coordinator.md`) implements a change's plan artifacts end to end with no human in the loop:
  - It checks the OpenSpec prerequisites and refuses to start, with a fixed message and no escalation, when the change lacks `proposal.md`, `tasks.md`, or at least one file under `specs/`.
  - It records the dirty baseline and a test-failure baseline before the first step. When every task is already checked, it runs the suites once, reports the result, and closes.
  - It runs steps it sizes itself. Each step is RED, GREEN, review, and commit: it runs only the step's own tests through the budget executor after RED and after GREEN, restores or removes any test file or `interfaces.md` change GREEN made and counts it as an attempt, reviews the step's diff against its brief, checks the completed `tasks.md` boxes, and makes one local Conventional Commits commit containing only the step's paths, with no `Co-Authored-By` trailer or AI-attribution line. It never pushes.
  - It may edit `proposal.md`, `specs/`, `design.md`, `tasks.md`, and `interfaces.md` or override them in a worker brief, and it records every difference as a deviation listed in the closing report.
  - An obstacle gets one corrected instruction, then escalation through the native picker with options the coordinator writes, one of which stops the run. Force majeure (a change of the proposal's What or Why, an operation that needs human authorization, or foreign work in a path the run must commit) escalates at once.
  - At the close it runs every unit and integration suite (never end-to-end), compares the result with the baseline, and ends with `Implement-new done.`.
- New command `/sai-build-new` (`sai/commands/build-new/coordinator.md`) chains `/sai-3-implement-new` as its only segment, reserves the next position for a future `/sai-4-review`, and ends with `Build-new done.` in place of the segment's closing line.
- New live workers `sai-red-new-worker` and `sai-green-new-worker` (`sai/commands/implement-new/red-worker.md`, `green-worker.md`, and the shared `worker-common.md`) live for the whole run, return `event: ready` only at creation, and receive each step's file by pointer (`steps/red-step.md`, `steps/green-step.md`) from the new step machines `red-new-steps@1` and `green-new-steps@1`. RED writes tests and interface stubs. GREEN writes production code and never touches tests or `interfaces.md`. Neither runs a git mutation.
- The wrappers for both commands on Claude Code and opencode fetch the harness fetch skill, carry the clean-start preamble, and fetch the coordinator card directly, with no boot adapter and no command bootstrap.
- The two commands and two workers are registered in `sai/install-manifest.json` (capability profiles `implement-new-command` and `build-new-command`, `worker-execution` for both workers, worker-matrix entries on the budget tier, managed agents for both harnesses). The worker roster grows from fifteen to seventeen in `bin/worker-matrix.js` and `bin/install-flow.js`, and the model-customization menu gains the new commands and workers.
- Documentation: `docs/commands/sai-3-implement-new.md`, `docs/commands/sai-build-new.md`, the on-demand and sequential references, `README.md`, and an `AGENTS.md` section for the `-new` family.

Scope drift evidenced by the diff but not named in the supplied intent:

- The model-customization menu (`bin/model-customization.js`) lists both new commands and both new workers with context and difficulty labels, and groups the new workers under `/sai-3-implement-new`.
- The `-new` wrappers bypass the harness boot adapter and command bootstrap, and `test/command-launcher-card.test.js` exempts them from the boot-wrapper checks.
- The shared worker contract also loads `sai/policies/repository-artifact-scope.md` and `sai/policies/code-quality-priority-stack.md`, and the implement-new coordinator loads the `budget-executor` skill.

## Capabilities

### New Capabilities

- `build-new-command`: the `/sai-build-new` entry point that chains `/sai-3-implement-new` and reserves the next position for `/sai-4-review`.
- `implement-new-loop`: the `/sai-3-implement-new` coordinator, which runs the per-step RED, GREEN, review, and commit cycle, owns the plan artifacts and deviations, and closes against a test-failure baseline.
- `implement-new-workers`: the live RED and GREEN `-new` workers, their shared contract, and their pointer-delivered step files.
- `implement-new-installation`: wrappers, manifest registration, worker-matrix entries, managed agents, step-machine registration, and documentation of both commands and both workers on Claude Code and opencode.

### Modified Capabilities

- `worker-matrix-collapse`: the canonical matrix now holds seventeen entries, adding the two `-new` roles.
- `review-fix-worker`: the projected roster now holds seventeen bindings and agents.
- `contract-tool-capabilities`: twenty-five command-requirement assignments (twenty SAI commands) and seventeen managed workers.
- `opencode-defaults-alignment`: the matrix holds seventeen OpenCode agents.
- `sai-1-command-inventory`: the inventories report twenty-four commands, twenty of them SAI commands.

## Impact

New files:

- `commands/claude/sai-3-implement-new.md`, `commands/claude/sai-build-new.md`, `commands/opencode/sai-3-implement-new.md`, `commands/opencode/sai-build-new.md`
- `sai/commands/build-new/coordinator.md`
- `sai/commands/implement-new/coordinator.md`, `worker-common.md`, `red-worker.md`, `green-worker.md`, `steps/red-step.md`, `steps/green-step.md`
- `sai-state/machines/red-new-steps.js`, `sai-state/machines/green-new-steps.js`
- `docs/commands/sai-3-implement-new.md`, `docs/commands/sai-build-new.md`
- `test/implement-new-family.test.js`

Modified files:

- `sai/install-manifest.json`, `sai-state/registry.js`
- `bin/install-flow.js`, `bin/install-manifest.js`, `bin/model-customization.js`, `bin/worker-matrix.js`
- `fixtures/thin-command-wrappers-baseline.json`
- `AGENTS.md`, `README.md`, `docs/on-demand-commands.md`, `docs/sequential-pipeline.md`
- Enumeration and projection tests: `test/agent-projection-strategy.test.js`, `test/agent-sidecar-removal.test.js`, `test/agent-tunable-ownership.test.js`, `test/apply-routed-architecture.test.js`, `test/canonical-opencode-agent-behavior.test.js`, `test/claude-default-preset-alignment.test.js`, `test/code-quality-priority-stack-policy.test.js`, `test/command-launcher-card.test.js`, `test/doctor-fetch-resolution.test.js`, `test/doctor-retirement-step-5.test.js`, `test/install-claude.test.js`, `test/install-manifest.test.js`, `test/install-opencode.test.js`, `test/linear-step-machines.test.js`, `test/model-customization-menu.test.js`, `test/uninstall-enumeration.test.js`, `test/uninstall-execution.test.js`, `test/worker-matrix-projection.test.js`, `test/worker-matrix.test.js`

`/sai-build`, `/sai-3-implement`, `/sai-4-apply`, and the `sai-explore` routes are unchanged.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

Future scope, outside this change: a new `/sai-4-review` (replacing `/sai-5-review`) will follow `/sai-3-implement-new` inside `/sai-build-new` and will consume `build-log.md` with deviations as its first review target. The `-new` family is meant to replace `/sai-build`, `/sai-3-implement`, and `/sai-4-apply` eventually, and the goal-based writing style may later spread to other commands one by one; neither the replacement nor the `sai-explore` route switch is part of this change.
