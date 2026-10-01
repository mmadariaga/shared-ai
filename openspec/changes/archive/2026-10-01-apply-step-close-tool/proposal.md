> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

In 35 real apply runs the apply coordinator spent 47% of apply tokens, at about 24 turns per Step and about 138k context. About 40% of those turns were the mechanical Step close and the post-dispatch checks that the coordinator ran in prose (`sai/commands/apply/runner.md` Step commit gate and `sai/commands/apply/coordinator.md` Post-dispatch sequence). The Execution Telemetry appendix and worker report field 9 had no reader. The implemented diff moves the mechanical work into a deterministic tool and retires the telemetry.

## What Changes

- New `sai/tools/apply-step.js`, stateless and with no access to `sai-state`, with two sub-commands. `verify` runs after every RED/GREEN return: it sweeps `.tmp/{change}/` before and after, runs the `**Step test command:**` and the backticked Automated commands verbatim, compares `git status` with the files allowed for the dispatch kind and with field 8, and returns one JSON object. `close` runs the guard `verify`, builds the visibility report with a pinned status letter, marks the Step's Automated checkboxes on disk, then runs `git add` and `git commit`; `close --dry-run` runs only the guard and the report.
- The visibility report letter has a pinned precedence `MISMATCH` > `DEVIATION` > `WARN` > `OK`, and a `Plan cross-check` that cannot be computed prints `not available` and never raises the letter. The plan's own `implementation.md` is left out of every report block.
- `sai/commands/apply/coordinator.md` § Post-dispatch sequence and `sai/commands/apply/runner.md` § Step commit gate invoke the tool; the coordinator prints `report_text` verbatim and keeps the `complete-step` and `recovery-ledger@1` emits, the guard remediation, and message authoring. On the happy path (every verify passes and the status letter is `OK`) the coordinator reads no project source or test file.
- Checkbox marks are written to disk before the commit, so a failed `complete-step` emit recovers by reseeding `apply-standalone@1` from the on-disk checkboxes. The per-Step batched marking is done by `close` on the coordinator's behalf, only after a passing `verify`, and the coordinator flips the Step's projected entry to `completed` after `close` returns.
- **BREAKING**: the apply worker report drops field 9 (`Attempts per phase`) and becomes an eight-field report; the `## Appendix: Execution Telemetry` section is no longer written. In-flight plans that already contain that section are left as they are, with no migration. The `GLOSSARY.md` entries `Attempts Per Phase` and `Execution Telemetry Appendix` and their relationships are removed.
- `sai/policies/tool-resolution.md` lists `apply-step.js` and its invocation; `AGENTS.md` lists the tool in the `sai/tools/` inventory; `sai/orchestration/worker-core.md` says "eight-field".
- Tests: new `test/apply-step-tool.test.js`; the telemetry assertions in `test/apply-routed-architecture.test.js` and `test/apply-coordinator-verification.test.js` are replaced by retirement and tool assertions, and `test/apply-step-projection.test.js` follows the close-then-flip order.
- Live specs swept in the same change: `apply-step-tool` added; `apply-pre-commit-file-report`, `apply-coordinator-read-boundary`, `apply-subagent-report-contract`, `apply-red-green-worker-model`, `apply-step-projection`, and `apply` modified; `apply-execution-telemetry-appendix` and `apply-telemetry-containment` retired (all requirements removed).

## Capabilities

### New Capabilities
- `apply-step-tool`: `apply-step.js verify` and `close` perform apply's post-dispatch verification and per-Step close in one tool call each, statelessly.

### Modified Capabilities
- `apply-pre-commit-file-report`: the report is produced by `close`, the status letter precedence is pinned, an unavailable plan cross-check prints `not available`, and the plan's own `implementation.md` stays out of the report.
- `apply-coordinator-read-boundary`: on the happy path the coordinator reads no project source or test file.
- `apply-subagent-report-contract`: the report has eight fields; field 9 requirements are removed; apply writes no Execution Telemetry appendix and leaves an existing one untouched.
- `apply-red-green-worker-model`: the lifecycle-payload requirement refers to the eight-field report.
- `apply-step-projection`: the projected entry is marked `completed` after `close` has marked the Step's Automated checkboxes, not in the same update as the marking.
- `apply`: the per-Step batched checkbox marking is done by `close` on the coordinator's behalf after a passing `verify`; Functional checkboxes stay unmarked.
- `apply-execution-telemetry-appendix`: every requirement removed; capability retired.
- `apply-telemetry-containment`: every requirement removed; capability retired.

## Impact

- New: `sai/tools/apply-step.js`, `test/apply-step-tool.test.js`.
- Modified: `AGENTS.md`, `GLOSSARY.md`, `sai/commands/apply/coordinator.md`, `sai/commands/apply/runner.md`, `sai/commands/apply/worker-common.md`, `sai/orchestration/worker-core.md`, `sai/policies/tool-resolution.md`, `test/apply-coordinator-verification.test.js`, `test/apply-routed-architecture.test.js`, `test/apply-step-projection.test.js`.
- Specs: new `openspec/specs/apply-step-tool/spec.md`; modified `apply-pre-commit-file-report`, `apply-coordinator-read-boundary`, `apply-subagent-report-contract`, `apply-red-green-worker-model`, `apply-step-projection`, `apply`; retired `apply-execution-telemetry-appendix` and `apply-telemetry-containment`.
- Both harnesses (Claude Code and opencode) are covered: the cards are shared, the tool resolves through `sai/policies/tool-resolution.md` and projects through the `sai-tools` glob with a byte-identical invocation, and no file under `commands/claude/` or `commands/opencode/` changes.
Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

Context from `~/Documentos/sai-handoffs/handoff-sai3-sai4-optimizations.md` (A1, A5, A2). Measure later, outside this change: per-Step guard, ledger, and `apply-standalone@1` activity and any real incident (guard violation, `validation-failed`, `authorized-step-retry`) in the first `/sai-build` runs; the coordinator preset model (keep `muse-spark #xhigh`, re-measure, consider `high`). Separate non-pipeline work: a read-only analysis script over `opencode.db` and Claude transcripts that reports attempts, test runs, turns, tokens, and cost per Step and per agent, to replace the telemetry appendix's learning goal. Undecided follow-up: implement authoring structured Automated expectations so the tool can judge every item alone.

## Additional Notes

Known limitations: one extra coordinator call per Step for the emits, in exchange for a store-free tool. RED failure attribution (assertion versus setup/import/compile) and free-text Automated expectations stay coordinator judgment from the output tail. In-flight plans that already contain `## Appendix: Execution Telemetry` are left as they are. This staged diff implements only the tool, the apply card changes, and the telemetry retirement; the branch-selection split, the implement step relocations, the `**Existing tests to update:**` line, and the Manual Verification and Migration Plan carry-over belong to later changes and have no requirement here. `docs/ddr/0063-violating-telemetry-note-dropped-not-cleaned.md` is not touched by this diff.
