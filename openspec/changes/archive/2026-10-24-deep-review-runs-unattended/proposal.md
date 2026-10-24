> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

`/sai-deep-review` asked one human selection question per report before fixing and was the only command that still loaded `sai/orchestration/composition.md`, while `/sai-build` already ran unattended with an Assessment pass. This change rewrites `/sai-deep-review` in the shape of `/sai-build` (review, triage-gated parallel audits on the shared audit coordinator, an Assessment pass, and fixes through `/sai-3-implement`) and retires what only it used.

## What Changes

- `sai/commands/deep-review/coordinator.md` is rewritten as the single card of `/sai-deep-review`: it follows the review coordinator, runs the bounded triage parse of `review.md` (moved from the retired `command-bootstrap.md`), asks the accessibility dev-server URL once before the audits when `--runtime` comes without `--url`, creates the activated audit workers in one batch and drives one cycle of `sai/commands/audit/coordinator.md` per worker, runs an Assessment pass copied from `/sai-build`, and follows `sai/commands/implement/coordinator.md` as the fix segment with the Composition reports hand-over. It loads only `public-chat`, `remember`, `safe-operations`, `tool-resolution`, and `finding-state`.
- The run asks nothing between start and close except the URL input, an audit worker question that nothing answers and whose answer would change the report (it pauses only that audit), and the escalation of an obstacle in the review or fix segment. There is no human findings selection.
- Each audit cycle keeps its own `sai-state` session (`{audit}-{name}`) and `{audit}-steps@1` machine; the coordinator issues every `sai-state` call and every commit one at a time in the fixed order security, performance, accessibility, and commits each verified report alone. A failed audit or an exhausted audit budget does not close the run and keeps its findings out of the Assessment pass.
- The Assessment pass writes ` (EXCLUDED: <reason>)` marks, never marks a Question, commits each marked report alone, and starts the fix segment only when a fixable finding remains. A rerun regenerates `review.md` and the activated audit reports; only the fix segment resumes.
- `/sai-3-implement` no longer receives answered Questions in the `/sai-deep-review` hand-over; Questions stay open. `sai/policies/finding-state.md` now says that `/sai-build` and `/sai-deep-review` write the excluded mark after their Assessment pass.
- Retired: `sai/orchestration/composition.md`, `sai/commands/deep-review/command-bootstrap.md`, `sai/commands/deep-review/findings-selection.md`, `sai/commands/{security,performance,accessibility}/coordinator.md` and `command-bootstrap.md`, and the `security-standalone@1`, `performance-standalone@1`, and `accessibility-standalone@1` machines with their registry entries. Each retired file gets a retirement entry in `sai/install-manifest.json`.
- `sai/orchestration/command-runner.md` replaces its "Chained phase composition" section with a single-segment "Phase segment" section. The composition bullet is removed from `sai/policies/stop-options.md`, the `findings-selection.md` reference from `sai/policies/question-rounds.md`, the routed audit and deep-review names from both `boot.md` adapters, and the `*-standalone@1` ids from `sai/tools/lint.js` and `sai/policies/stage-machine.md`.
- Both wrappers of `/sai-deep-review` load the fetch skill and the coordinator with no boot adapter and announce `--url <url>`.
- New ADR 0200 records that the audits and `/sai-deep-review` leave the shared orchestration and supersedes ADR 0187; `AGENTS.md`, `GLOSSARY.md`, `README.md`, the `docs/` pages, the thin-wrapper fixture, and the affected tests are updated.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `deep-review-command`: unattended shape, URL input, per-audit question escalation, failed-audit containment, Assessment pass, rerun regeneration, commit order, and close.
- `sai-review-command`: wrappers load the coordinator without a boot adapter; change resolution through the review segment; no prerequisite check; malformed-argument literal; mid-run questions limited to the URL, report-changing audit questions, and escalations.
- `review-triage-parse`, `conditional-audit-activation`, `standalone-close-selector`, `composition-terminal-report`, `composition-fast-track-noop`: triage and error close live in the coordinator; no findings round; the run ends with `Deep review done.`.
- `concurrent-audit-dispatch`, `audit-store-serialization`: parallel audit cycles of the shared audit coordinator with one session per audit, serialized `sai-state` calls and per-report commits.
- `finding-state`, `implement-new-loop`: Questions stay open; the Assessment pass writes the excluded mark; no answered-Question hand-over.
- `orchestration-core`, `unplanned-stop-options`, `explore-route-close`: composition rules and their stop-option and round references retire.
- `security-phase-coordinator`, `accessibility-phase-coordinator`, `security-standalone-loading`, `performance-standalone-loading`, `accessibility-standalone-loading`, `security-step-gated-delivery`, `performance-step-gated-delivery`, `accessibility-step-gated-delivery`, `audit-command-progress-plans`, `security-worker-installation`, `unattended-audit-coordinator`: the former audit coordinators and `*-standalone@1` machines retire; every activation runs on `{audit}-steps@1`.
- `step-machine-wiring-verification`, `stage-machine-write-ownership`, `coordinator-step-pointers`, `completion-message-simplification`: verification and lint follow the retired coordinators and machines.
- `audit-command-options`: the `/sai-deep-review` wrappers announce `--url <url>`.

## Impact

New files:
- `docs/adr/0200-audits-and-deep-review-leave-the-shared-orchestration.md`
- `test/deep-review-coordinator.test.js`

Removed files:
- `sai/orchestration/composition.md`
- `sai/commands/deep-review/command-bootstrap.md`, `sai/commands/deep-review/findings-selection.md`
- `sai/commands/{security,performance,accessibility}/coordinator.md`, `sai/commands/{security,performance,accessibility}/command-bootstrap.md`
- `sai-state/machines/{security,performance,accessibility}-standalone.js`

Modified files:
- `sai/commands/deep-review/coordinator.md`, `sai/commands/implement/coordinator.md`
- `commands/{claude,opencode}/sai-deep-review.md`, `sai/adapters/{claude,opencode}/boot.md`
- `sai/orchestration/command-runner.md`, `sai/policies/{finding-state,question-rounds,stage-machine,stop-options}.md`
- `sai-state/registry.js`, `sai-state/machines/linear-steps.js`, `sai/tools/lint.js`, `sai/install-manifest.json`, `fixtures/thin-command-wrappers-baseline.json`
- `AGENTS.md`, `GLOSSARY.md`, `README.md`, `docs/adr/0000-INDEX.md`, `docs/commands/sai-{3-implement,5-security,6-performance,7-accessibility,deep-review}.md`, `docs/on-demand-commands.md`, `docs/review-triage.md`, `docs/sequential-pipeline.md`
- `test/{security,performance,accessibility}-coordinator-worker.test.js` (coordinator cases removed) and the doctor, install, lint, step-machine, stop-options, review-audit-options, and other affected tests under `test/`

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

Slicing assumption: this slice completes the removals slice 1 deferred while `/sai-deep-review` still composed the old audit coordinators: the three old `coordinator.md` and `command-bootstrap.md` files (I1) and the three `*-standalone@1` machines (I9). I10 here covers the ADR and the `/sai-deep-review` documentation and tests.
