> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

Step close in `/sai-4-apply` required the files a Step changed to match that Step's `Files Affected` exactly, while the only possible correction, editing `tasks.md`, was rejected after the run baseline. A plan defect therefore had no sanctioned exit, and no prompt told the coordinator what to do. Four real `/sai-build` and `/sai-4-apply` sessions stopped repeatedly on this and were finished by hand.

Two related defects made it worse. An incomplete per-Step file list was only discovered when a Step tried to close, never when the plan was written. And the preflight rejected the `### Step N — …` headings that apply itself writes under its own appendix, so one run's deviation entries failed the next run's preflight.

## What Changes

- `sai/tools/apply-step.js`: an edit of `tasks.md`, `interfaces.md`, `proposal.md`, or `design.md` is accepted when the coordinator registered it through the existing `checkpoint-plan` receipt (`--plan-checkpoint`); without a receipt it stays an error. `checkpoint-plan` returns a `registers` list naming the artifacts the receipt registers. `close` commits registered artifacts with the Step and keeps them out of the file comparison.
- `sai/tools/apply-step.js preflight`: reports a path that `implementation.md` names in a Step's RED or GREEN instructions and that the Step's `Files Affected` omits; ignores headings under `## Appendix: Plan vs Final Implementation`.
- `sai/tools/apply-step.js baseline`: accepts `amended: <path>` stdin lines that declare run-start amendments; the first Step that closes commits those artifacts.
- `sai/tools/apply-step.js restore-unrelated-index`: a changed amendable planning artifact is no longer treated as protected unrelated content.
- New `sai/commands/apply/steps/plan-amendment.md`: the coordinator-only amendment branch — triggers (run start, verify, close), the mode rule, the edit, the File Manifest regeneration through `file-manifest.js fold` when `tasks.md` changes, the fixed notice `> PLAN AMENDED: <path> — Step N — <reason>`, the appendix entry, the receipt, the commit body line, and the limit of one amendment per discrepancy.
- Mode rule: with fast-track active (including `/sai-build`) the coordinator amends on its own; otherwise it asks the user first and stops the run when the user declines.
- `sai/commands/apply/runner.md`: the commit-gate failure point states one default reaction for every `close` refusal reason (report and stop) and lists only the reasons that differ; a file discrepancy goes to plan amendment. The appendix admits one block per plan amendment.
- `sai/commands/apply/coordinator.md`: the run-start preflight routes the omitted-path error to amendment before the baseline capture; the verification verdict routes a production file the plan omitted to amendment with no recovery attempt spent; the `checkpoint-plan` sentence covers amended artifacts.
- `sai/commands/design/steps/tasks.md`: `Files Affected` lists every file the step creates, modifies, or deletes, tests included.
- `sai/commands/implement/steps/validation.md`: the omitted-path preflight error is a `sai-2` defect resolved through the existing defective-artifact rule.
- `AGENTS.md`: documents plan amendment and the third apply fast-track opt-out.

Known limitations accepted with this change:

- Removing a declared file that the Step did not change can hide unfinished work; the removal happens only when the Step's tests pass and is recorded in the appendix and the commit.
- An amendment never re-verifies Steps already closed; an inconsistency it introduces surfaces only in later Step tests or the terminal full suite.
- With fast-track active the coordinator can change approved design content without a human decision; the trace is the only control.

## Capabilities

### New Capabilities

- `apply-plan-amendment`: the coordinator-owned correction of a defective planning artifact inside an apply run, with its triggers, mode rule, trace, limits, and the default reaction to a refused Step commit.

### Modified Capabilities

- `apply-step-tool`: preflight omission check and appendix-safe heading check; plan receipts register amendments; `close` commits registered amendments; a plan finding at verify spends no recovery attempt; baseline declares run-start amendments.
- `apply-coordinator-ownership`: the run-start preflight gains one exception that leads to an amendment before the baseline capture.
- `apply-subagent-report-contract`: a plan amendment may add an entry to the `Plan vs Final Implementation` appendix.
- `apply-pre-commit-file-report`: registered plan amendments are previewed and committed with the Step.
- `sai-fast-track-flag`: apply gains a third fast-track opt-out, the amendment ask.
- `atomic-commit-planning`: `Files Affected` lists every file a step creates, modifies, or deletes, tests included.
- `sai-build-command`: the fast-track that `/sai-build` injects into its apply segment also amends a defective planning artifact without asking.

## Impact

New files:

- `sai/commands/apply/steps/plan-amendment.md`
- `test/apply-plan-amendment.test.js`

Modified files:

- `AGENTS.md`
- `sai/commands/apply/coordinator.md`
- `sai/commands/apply/runner.md`
- `sai/commands/design/steps/tasks.md`
- `sai/commands/implement/steps/validation.md`
- `sai/tools/apply-step.js`
- `test/apply-step-tool.test.js`

Both harnesses are affected identically: every change is in shared files under `sai/`, no wrapper changes, and the recursive command projection installs the new step file for Claude Code and opencode.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

The evidence for the failures comes from a user-supplied analysis of four opencode sessions in another project; those sessions were not re-read during this exploration. Every statement about shared-ai comes from reading the code and cards, not from running a Step close.

Two findings were derived by reading only and deserve confirmation before design relies on them: that a GREEN worker could declare `tasks.md` in its own Step's `Files Affected` once the frozen list is relaxed, and whether `close` returns refusal reasons beyond the six listed in `runner.md` and `scope-blocked`.

Outside this change: `docs/sequential-pipeline.md:42` and `docs/on-demand-commands.md:31` describe an apply fast-track behavior that no longer exists; they were already stale before this change. The RED-stub question needs the git history of the other project's `implementation.md` to tell a plan omission from a contract ambiguity.
