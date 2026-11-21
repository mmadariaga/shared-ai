> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

Telemetry of the last eight changes shows the planning and build coordinators spend 70% or more of their tokens, and Design described each test in prose (`interfaces.md`) that RED then translated into code again. Writing the tests once, in code, during `/sai-2-design` removes that translation and the per-step RED/GREEN arbitration of the build, and gives the human reviewer a draft pull request with executable tests instead of several markdown files.

## What Changes

- `/sai-2-design` runs two phases in one run: `sai-2-design-worker` writes a reduced `design.md` and `tasks.md`, then the new plan RED worker `sai-2-red-worker` writes the interface stubs and the failing tests of the whole change (the plan tests). The coordinator runs them through the budget executor and accepts a test only when it is red by assertion, or marked `[regression guard]`; a test that cannot be written as a meaningful assertion becomes a closure criterion, recorded as an assumption. A change whose steps all carry closure criteria creates no plan RED. The segment commits the plan documents and the plan code in two separate local commits, and a rerun updates both in place.
- `design.md` is reduced to `## Target State` (with exact signatures and the folded `### File Manifest`), `## Decisions`, `## Risks / Trade-offs`, a transient `## Open Questions`, and the implement-owned `## Learnings Corrections`; `## Context`, `## Goals / Non-Goals`, `## Migration Plan`, and `## Manual Verification` retire, with follow-ups recorded as "out of scope" bullets under Decisions and manual checks recorded as risks.
- Each `tasks.md` step carries `**Tests**` (one `path :: test name` entry per scenario, optionally `[regression guard]`) or a `**Closure criterion**`, then `**Existing Tests Broken**` and its own `**Test Command**`; `**Testing Strategy**` and the `**Smoke-test tagging**` field retire, and Files Affected tokens are taken at the change base.
- `sai-2-red-worker` is a new `worker-matrix` entry (phase `design-red`, binding stem `design-red`, contract `sai/commands/design/red-worker.md`) with its own per-harness model in every preset; its card delegates the shared rules to `sai/commands/implement/worker-common.md`, takes `red-step.md` through `red-steps@1`, and reports under the `implement` validator command. The installer, doctor, uninstall, and the model customization menu handle fourteen workers.
- `/sai-3-implement` (and `/sai-build` through it) runs a GREEN-only step cycle: it stops on a plan without plan tests and asks for `/sai-2-design` again, checks at start that the plan tests are still red by assertion, runs each step's tests together with the earlier steps' tests, and keeps the fix RED (`sai-3-red-worker`) for review and audit findings and for correcting a plan test that the spec and the code show wrong. GREEN escalates a wrong test with `needs_input` instead of changing it.
- `interfaces.md`, `change-overview.md`, and `--overview-lang` retire: the schema becomes proposal → specs → design → tasks → review → audits; the `interfaces` and `overview` design steps, `sai/commands/design/change-overview.md`, `sai/policies/step-contract-format.md`, the `step-contract` lint check, the `interfaces.md` reading of `check-cited-paths.js`, the `overview.state` reading of `openspec-yaml.js` and `status.js` (whose panel and table now show eight artifacts), gate 9 of the explore route selector, and the `explore.overviewLanguage` row of the language settings menu are removed. `/sai-2-design` rejects any unknown `--` option before writing.
- `sai/tools/plan-publication.js` stops listing `interfaces.md` and `change-overview.md`; the design segment's code commits reach the draft pull request through the existing whole-branch push.
- `sai/tools/change-telemetry.js` attributes `sai-2-red-worker` to the design segment.
- Wrappers, `AGENTS.md`, `README.md`, `GLOSSARY.md`, and the docs of the design, plan, implement, explore, models, settings, pipeline, and tool-capability pages are updated for Claude Code and opencode together.

## Capabilities

### New Capabilities

- `design-plan-tests`: `/sai-2-design` writes a reduced `design.md` and `tasks.md` and, through the plan RED, the stubs and failing tests of the whole change, accepted only when red by assertion.
- `plan-red-worker`: the dedicated `sai-2-red-worker` managed worker, its card, write surface, questions, and telemetry attribution.
- `implement-green-cycle`: `/sai-3-implement` turns the plan tests green in GREEN-only steps, with the fix RED kept for findings.

### Modified Capabilities

- `design-planning-worker`: completion verifies `design.md` and `tasks.md` only; overview-language validation retires.
- `implement-new-loop`: start preconditions and the per-step RED cycle are replaced by `implement-green-cycle`.
- `implement-new-workers`: GREEN lives for the run and the fix RED is created on demand.
- `sai-workflow-schema`: the artifact graph and templates drop `interfaces` and `change-overview`.
- `sai-status-progress-panel`: the panel covers eight artifacts and reads no overview state.
- `plan-artifact-publication`: the plan document list drops the retired documents.
- `project-settings-screen`: the language submenu drops the change overview language row.
- Retired (every requirement removed): `design-interfaces-artifact`, `shared-step-contract-section-format`, `smoke-test-assertion-tagging`, `change-overview-artifact`, `change-overview-generation-routing`, `change-overview-synchronization`, `localized-overview-generation`, `overview-language-flag`, `explore-overview-language-gate`, `design-manual-verification`, `design-section-contract`.

## Impact

- New files: `sai/commands/design/red-worker.md`, `test/design-writes-red-tests.test.js`.
- Deleted files: `sai/commands/design/steps/interfaces.md`, `sai/commands/design/steps/overview.md`, `sai/commands/design/change-overview.md`, `sai/policies/step-contract-format.md`, `openspec/schemas/sai-workflow/templates/interfaces.md`, `openspec/schemas/sai-workflow/templates/change-overview.md`, `test/change-overview-contract.test.js`.
- Modified files: the design, implement, plan, explore, and archive cards and steps under `sai/commands/`; `sai-state/machines/design-steps.js` and `red-steps.js`; `sai/tools/change-telemetry.js`, `check-cited-paths.js`, `lint.js`, `openspec-yaml.js`, `plan-publication.js`, `retrospective.js`, and `status.js`; `bin/worker-matrix.js`, `install-flow.js`, `install-manifest.js`, `model-customization.js`, and `project-settings-screen.js`; `sai/install-manifest.json` and the five model presets under `sai/presets/`; `openspec/schemas/sai-workflow/schema.yaml` and the `design.md` and `tasks.md` templates; `sai/policies/artifact-review-contract.md`, `prereqs-paths.md`, and `ready-to-propose-format.md`; the Claude Code and opencode wrappers of `sai-2-design`, `sai-explore`, `sai-plan`, and `sai-status`; `AGENTS.md`, `README.md`, `GLOSSARY.md`, and the affected pages under `docs/`; and the tests that cover these surfaces.
- Known limitations: the draft pull request branch has failing tests, so its continuous integration stays red until the build runs; a change planned with the earlier format cannot be built without running `/sai-2-design` again; RED work moves from the build to the plan rather than disappearing; one more worker-matrix entry and worker card to maintain. A standalone `/sai-2-design` rerun publishes nothing, so an existing draft pull request is updated only by the next `/sai-plan` publication or `/to-pr`. Several other published specs still mention `interfaces.md`, `change-overview.md`, or `--overview-lang` (among them the design coordinator, design steps library, plan segment, review loop, explore close, archive classification, telemetry segment, worker matrix, and tasks format capabilities) and are not rewritten by this record.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

Token data behind this change (eight `telemetry.md` files of CVL.SmartLocks and its worktrees): the build coordinator was 70.4% of sai-build tokens (51.5% of its cost), RED 9.5%, GREEN 11.5%, review 8.0%; inside the one plan run the coordinator was 71% of tokens, Spec 15.8%, Design 13.3%. Future scope, outside this change: a later change may reduce the specification phase of `/sai-plan`. The issue's earlier plan of one shared implementer card with a `tests: yes|no` flag and a merged report command was dropped in exploration: `bin/worker-matrix.js` rejects a shared contract, and the real duplication sits only between the Direct Build worker card and `implement/worker-common.md`.
