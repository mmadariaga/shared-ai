> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

Since `/sai-2-design` runs the plan RED (ADR 0227a), the plan artifacts still restated facts that the plan RED writes as code: Target State function bodies, the per-step `**What Will Be Done**` prose, the `## Required Documentation` section, and per-step test prose. That restatement cost design tokens and time and let `design.md` and `tasks.md` contradict the code. `/sai-3-implement` (and so `/sai-build`) still needs everything it reads from the plan, so the facts that leave the artifacts now come from the plan RED's code and report.

## What Changes

- `design.md` `## Target State` lists each new or changed public symbol as one `- <path> :: <signature>` bullet with no function body. These entries are the only declaration of the signatures: the plan RED writes its stubs at those paths, and `/sai-3-implement` derives the production paths GREEN may write from them.
- `tasks.md` has two kinds of step. A step with tests carries its title, its checkbox, its `**Routing**` line, and `**Scenarios**` (the spec scenario titles it covers plus short titles of edge behaviors). A step without tests carries its title, its checkbox, its `**Routing**` line, `**Files Affected**`, `**What Changes**`, and `**Closure criterion**`. `**What Will Be Done**`, `**Existing Tests Broken**`, and the `## Required Documentation` section retire; `## Implementation Context` and its `**Test Command**` stay.
- The plan RED (`sai-2-red-worker`) writes stubs only at the `path :: signature` paths, writes one test per scenario named with the scenario's literal title, may modify an existing test only when the test uses a symbol whose signature `design.md` changes or removes or asserts a scenario the specs MODIFY or REMOVE, and reports per step its tests, its test command, and its regression-guard flags (`plan_tests`) plus each modified existing test with its reason (`modified_tests`).
- `sai/tools/worker-report-validator.js` accepts `plan_tests` and `modified_tests` as `implement` role fields on a `completed` report.
- `sai/tools/file-manifest.js` gains `writeback` (writes `**Tests**`, `**Test Command**`, and `[regression guard]` marks into each step with tests from the accepted plan RED report, idempotently, with `--guard` for coordinator-decided guards) and `format` (answers `current` or `earlier` for `tasks.md`). `fold` folds only the `**Files Affected**` of steps without tests and writes the sentinel `None — every file passes through the plan RED` when no step carries that field.
- The design coordinator accepts modified existing tests only inside the bound, runs `scenario-coverage.js change` after the plan RED, runs the write-back after accepting the plan tests and after each later fix, adds the `format` check to its mechanical checks, and turns an unwritable test's step into a step without tests that gains `**Files Affected**` and `**What Changes**` and folds the manifest again.
- `/sai-3-implement` checks the `tasks.md` format at Start and stops before any worker exists on the earlier format with `Cannot start /sai-3-implement for {name}: its plan is in the earlier format. Run /sai-2-design {name} again.`; its GREEN brief drops the `## Required Documentation` entries, carries the `path :: signature` entries, and never names a test path among the writable paths.
- A `/sai-2-design` rerun on a change planned in the earlier format rewrites `design.md` and `tasks.md` in the current format.
- The design step files, the design worker card, the tasks and design templates, the schema description, the explore review loop, `GLOSSARY.md` (new **Write-back** term, Existing Tests Broken entry removed), `AGENTS.md`, the `docs/commands/` pages of `/sai-2-design` and `/sai-3-implement`, and the tests that pin the format follow the new format.

## Capabilities

### New Capabilities

None

### Modified Capabilities

- `design-target-state`: Target State carries `path :: signature` entries with no function bodies; the File Manifest folds only steps without tests and has a second sentinel.
- `design-file-manifest-tool`: `fold` folds only steps without tests and writes the new sentinel; new `format` and `writeback` sub-commands.
- `tasks-scaffold-format`: per-step field sets for steps with and without tests; `## Implementation Context` is the only trailing section.
- `tasks-required-documentation`: `## Required Documentation` retires from `tasks.md`.
- `tasks-existing-test-impact`: `**Existing Tests Broken**` retires; the contract-consumer review decides which step owns each consumer.
- `plan-red-worker`: write bound, scenario-titled tests, and the `plan_tests` and `modified_tests` report fields.
- `design-plan-tests`: modified-test bound check, scenario coverage check, deterministic write-back, format check, and the earlier-format rerun.
- `implement-green-cycle`: earlier-format stop at Start and a GREEN brief built from the `path :: signature` entries.
- `artifact-file-list-format`: the covered listings drop Existing Tests Broken and Required Documentation and gain the plan RED sentinel of the File Manifest.
- `tasks-authoring-rules`: a step names its scenarios or describes What Changes; the Required Documentation rules retire.
- `tasks-implementation-context`: `## Implementation Context` directly follows the steps, with no `## Required Documentation` before it.
- `sai-workflow-schema`: the design and tasks templates and the tasks artifact description follow the two step kinds.
- `design-risk-ordering`: a verify-first marker is not satisfied by prose in any field of the gated step, with no reference to What Will Be Done.
- `atomic-commit-planning`: contract-breaking changes travel through GREEN, the plan RED, and steps without tests; only a step without tests carries Files Affected; the plan carries three atomicity rules.

## Impact

- Modified: `AGENTS.md`, `GLOSSARY.md`, `docs/commands/sai-2-design.md`, `docs/commands/sai-3-implement.md`
- Modified: `openspec/schemas/sai-workflow/schema.yaml`, `openspec/schemas/sai-workflow/templates/design.md`, `openspec/schemas/sai-workflow/templates/tasks.md`
- Modified: `sai/commands/design/coordinator.md`, `sai/commands/design/red-worker.md`, `sai/commands/design/steps/design.md`, `sai/commands/design/steps/tasks.md`, `sai/commands/design/worker.md`
- Modified: `sai/commands/explore/steps/review-loop.md`, `sai/commands/implement/coordinator.md`, `sai/commands/implement/steps/green-step.md`, `sai/commands/implement/steps/red-step.md`
- Modified: `sai/policies/worker-report-transport.md`
- Modified: `sai/tools/check-cited-paths.js`, `sai/tools/file-manifest.js`, `sai/tools/worker-report-validator.js`
- Modified: `test/design-coordinator-worker.test.js`, `test/file-manifest-tool.test.js`, `test/implement-family.test.js`, `test/no-specs-change.test.js`, `test/plan-family.test.js`, `test/worker-report-validator.test.js`
- Changes in flight planned in the earlier format must run `/sai-2-design` again before `/sai-3-implement` or `/sai-build`; archived changes are not rewritten.
- The fix RED, the finding-fix flow of `/sai-3-implement`, the Direct Build route, `/sai-backfill`, `/sai-archive`, `proposal.md`, and the spec format do not change.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill
