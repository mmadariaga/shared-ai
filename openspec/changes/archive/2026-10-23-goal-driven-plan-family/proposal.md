> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

`/sai-build` and its segments already run goal-driven and unattended, while the Plan route of `/sai-explore` still restated the shared Result Loop in a 148-line, 51 KB step and spread failure handling over four sources (`sai/commands/explore/steps/pipeline-plan-unattended.md`, `sai/policies/bounded-recovery.md`, `sai/policies/unattended-runtime-recovery.md`, and the Plan state of `pipeline-selector.md`). The standalone `/sai-1-spec` and `/sai-2-design` were interactive: they presented the artifact feedback gate and asked mid-run questions that the Ready to Propose block usually answers.

## What Changes

- `/sai-1-spec` and `/sai-2-design` are rewritten as always-unattended, goal-driven coordinators (`sai/commands/spec/coordinator.md`, `sai/commands/design/coordinator.md`) outside the shared orchestration. They load only `public-chat`, `remember`, `safe-operations`, `tool-resolution`, the budget skill, and the new shared segment cycle `sai/commands/plan/cycle.md`. Their `command-bootstrap.md` files are removed and their Claude Code and opencode wrappers fetch the coordinator directly.
- New `/sai-plan` command (`sai/commands/plan/coordinator.md`, `commands/claude/sai-plan.md`, `commands/opencode/sai-plan.md`, `docs/commands/sai-plan.md`) chains the spec coordinator and then the design coordinator as segments in one session, like `/sai-build` chains implement and review. When `proposal.md` and `specs/` already exist the disk wins and the spec segment counts as done.
- New shared segment cycle (`sai/commands/plan/cycle.md`) and worker rules (`sai/commands/plan/worker-common.md`): run state in the new `plan-run@1` machine (`sai-state/machines/plan-run.js`, session key `plan-{name}`, run directory from `temp-root.js mkdtemp --prefix plan-{name}-`); worker questions answered as assumptions with their source or escalated through the native picker; mechanical checks (`openspec validate`, `check-delta-headers.js`, `check-cited-paths.js`, and in design `file-manifest.js verify`) treated as obstacles with a budget of three attempts; coordinator-owned incremental review in up to three rounds with pending findings that never stop the run; one local commit per segment, checked with `git check-ignore`; resume from the run store or from the disk and `git log`.
- The workers keep the names `sai-1-spec-proposal-worker` and `sai-2-design-worker`, render their bindings from the standalone template (`bin/worker-matrix.js`), write a report file in the run directory, and return only its path. Their step libraries are delivered by pointer through two new linear machines, `spec-steps@1` (`spec-intake`, `research`, `proposal`, `specs`, `validation`) and `design-steps@1` (`design-intake`, `research`, `design`, `tasks`, `interfaces`). The overview is a separate continuation that names `sai/commands/design/steps/overview.md`, sent only when `--overview-lang` is set.
- `/sai-2-design` stamps `approval.specs.approved_at` in `.openspec.yaml` only when absent or empty; invoking `/sai-2-design` or `/sai-plan` approves the specs.
- `/sai-1-spec`, `/sai-2-design`, and `/sai-plan` accept and ignore `--fast-track` and `--supervised` and print no banner; `/sai-2-design` leaves the fast-track parser membership (`sai/policies/fast-track-flag.md`).
- Explore's `Plan - Unattended` route (`pipeline-plan-unattended.md`) becomes a thin step that exports the first pending slice's block and follows the `/sai-plan` coordinator; the Plan-only supervision state and the Plan Diagnosis Round leave `pipeline-selector.md`, `bounded-recovery.md`, `unattended-runtime-recovery.md`, and `autonomy-audit-log.md`, while Direct Build keeps its surfaces.
- Retired: `sai/policies/artifact-feedback-gate.md`, `sai/policies/spec-phase-contract.md`, `sai/commands/design/phase-contract.md`, the `spec-standalone@1` and `design-standalone@1` machines (`sai-state/machines/design-standalone.js` removed, `spec-standalone.js` renamed to `spec-steps.js`), and the `--with-overview` option of `sai-state emit --progress` (`bin/sai-state.js`, `sai/policies/stage-machine.md`, `sai/tools/lint.js`). `sai/install-manifest.json` records the retired installed copies for cleanup.
- Documentation and records: ADR 0199 records that spec and design leave the shared orchestration; AGENTS.md, README.md, GLOSSARY.md, `docs/sequential-pipeline.md`, `docs/on-demand-commands.md`, and the command pages are updated; the model presets gain `/sai-plan` entries.
- Tests: `test/plan-family.test.js` is added; the tests that pinned the retired surfaces are updated or removed (including `test/spec-coordinator-worker.test.js`, `test/design-coordinator-worker.test.js`, and `test/design-standalone-machine.test.js`).

## Capabilities

### New Capabilities

- `plan-command`: the `/sai-plan` command that chains the spec and design segments.
- `plan-segment-cycle`: the shared unattended segment cycle of `/sai-1-spec`, `/sai-2-design`, and `/sai-plan` (run state, worker report, assumptions, checks, review, commits, obstacles, resume).
- `plan-spec-design-segments`: the goal-driven `/sai-1-spec` and `/sai-2-design` coordinators, their inputs, step machines, approval, overview, and closing lines.

### Modified Capabilities

- `bounded-worker-recovery`: the Explore Plan cancellation exception and the Plan diagnosis charge are removed; cancellation is a clean stop everywhere.
- `archive-completed-specs`: the archival reason no longer cites the retired spec phase contract.
- `artifact-feedback-gate`: retired with the gate policy.
- `command-wrappers`: the `/sai-1-spec` wrapper fetches the coordinator directly.
- `coordinator-step-pointers`: spec and design route through `spec-steps@1` and `design-steps@1`.
- `design-coordinator`: the progress-plan and `design-standalone@1` requirements are removed.
- `design-phase-consolidation`: the phase-contract requirements are removed.
- `design-step-routing`: the design machine is `design-steps@1`; variant selection and parked lifecycle are removed.
- `docs-drift-fix`: machine-only routing names the new machines.
- `explore-idea-list`: the supervised review-round and Diagnosis Round rendering rules are removed; the manual review-loop rules stay.
- `explore-pipeline-selector`: `specs_converged_changes` leaves the dispatch and re-crystallization rules.
- `explore-pipeline-supervision`: the supervised gate, the item-10 Diagnosis Round, and the Plan activation of runtime recovery are removed, and the Plan route follows `/sai-plan`.
- `feedback-gate-provenance-correction`: retired with the gate policy.
- `glossary-location`: the glossary write surface lives in the spec worker card.
- `linear-step-machine-factory`: the factory builds `spec-steps@1` and `design-steps@1`.
- `normative-instruction-citations`: the gate citation scenario is removed.
- `pipeline-design-phase-chaining`: the supervised design-phase gate adapter is removed.
- `planning-artifact-review-loop`: retired with the worker-owned review loop and the supervised marker.
- `plan-unattended-chain-guard`: the guard describes `/sai-plan` segments instead of the supervised phases.
- `routed-harness-support`: the retired gate leaves the inspected file list.
- `sai-1-spec-stop`: `/sai-1-spec` stops after its segment closes, with no gate.
- `shared-text-neutrality`: the neutrality rule applies to the plan cycle's escalation picker.
- `spec-step-routing`: the spec machine is `spec-steps@1` starting at `spec-intake`.
- `stage-machine-cli-interface`: the `--with-overview` option is removed.
- `stage-machine-emit-delivery`: the progress emit form has no `--with-overview`.
- `step-machine-progress-emit`: the design variant option is removed.
- `step-machine-wiring-verification`: the wiring tests name the remaining machines, the canonical step files, and the three discovered audit coordinators.
- `step-pointer-task-disclosure`: spec and design disclose the `research` pointer from `spec-steps@1` and `design-steps@1`.
- `supervised-design-overview-generation`: retired with the supervised design route.
- `supervised-review-in-session`: retired with the supervised Plan review rounds.
- `unattended-resilience-rule`: the Plan diagnosis-round budget is removed; the rule covers Direct Build only.

## Impact

New files:

- `sai/commands/plan/coordinator.md`, `sai/commands/plan/cycle.md`, `sai/commands/plan/worker-common.md`
- `commands/claude/sai-plan.md`, `commands/opencode/sai-plan.md`
- `sai-state/machines/plan-run.js`, `sai-state/machines/design-steps.js`, `sai-state/machines/spec-steps.js` (renamed from `spec-standalone.js`)
- `docs/commands/sai-plan.md`, `docs/adr/0199-spec-and-design-leave-the-shared-orchestration.md`
- `test/plan-family.test.js`

Modified files:

- `sai/commands/spec/coordinator.md`, `sai/commands/spec/worker.md`, `sai/commands/spec/steps/*.md`
- `sai/commands/design/coordinator.md`, `sai/commands/design/worker.md`, `sai/commands/design/steps/*.md`
- `sai/commands/explore/steps/pipeline-plan-unattended.md`, `pipeline-selector.md`, `review-loop.md`, `route-selector.md`
- `sai/policies/autonomy-audit-log.md`, `bounded-recovery.md`, `unattended-runtime-recovery.md`, `fast-track-flag.md`, `stage-machine.md`, `artifact-review-contract.md`, `incremental-review.md`, `ready-to-propose-format.md`, `todo-structure.md`, `tool-resolution.md`
- `sai/install-manifest.json`, `sai/presets/**`, `sai/tools/lint.js`, `sai-state/registry.js`, `sai-state/machines/linear-steps.js`
- `bin/sai-state.js`, `bin/worker-matrix.js`, `bin/model-customization.js`
- `commands/claude/sai-1-spec.md`, `commands/claude/sai-2-design.md`, `commands/opencode/sai-1-spec.md`, `commands/opencode/sai-2-design.md`
- `AGENTS.md`, `README.md`, `GLOSSARY.md`, `docs/adr/0000-INDEX.md`, `docs/commands/sai-1-spec.md`, `docs/commands/sai-2-design.md`, `docs/commands/sai-explore.md`, `docs/on-demand-commands.md`, `docs/sequential-pipeline.md`, `fixtures/thin-command-wrappers-baseline.json`
- the tests that pinned the retired surfaces

Removed files:

- `sai/policies/artifact-feedback-gate.md`, `sai/policies/spec-phase-contract.md`, `sai/commands/design/phase-contract.md`
- `sai/commands/spec/command-bootstrap.md`, `sai/commands/design/command-bootstrap.md`
- `sai-state/machines/design-standalone.js`, `fixtures/spec-coordinator-worker.js`
- `test/spec-coordinator-worker.test.js`, `test/design-coordinator-worker.test.js`, `test/design-standalone-machine.test.js`

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill
