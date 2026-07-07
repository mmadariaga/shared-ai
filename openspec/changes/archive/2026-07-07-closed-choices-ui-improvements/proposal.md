> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation. It describes a decision already made, not one being proposed.

## Why

The SAI pipeline asks the user many closed-choice questions (yes/no for commit authorization, numbered lists for change selection, single-change confirmations, archive soft-warns). Until this change, every harness presented these as free-text prompts in chat (`(y/n)`, "Enter a number (1-N)"). Free-text prompts are fragile — `y` vs `yes` vs `Y`, off-topic replies, and silent no-ops all behave inconsistently across harnesses, and there is no first-class UI affordance for clicking a choice. In parallel, the pipeline was only documented as supporting Claude Code and opencode; GitHub Copilot was in the code but not in AGENTS.md's "supported harnesses" list, the install matrix, the mirror discipline, or the Fetch URL conventions.

## What Changes

- Add a universal "Closed-choice prompts" rule in `sai/instructions/remember.md` with a per-harness option-picker mapping (Claude Code → `AskUserQuestion`, opencode → `question` tool, GitHub Copilot → plain-text fallback) and full-word option labels (`yes` / `no`).
- Convert every yes/no and numbered-list prompt in the pipeline to use that rule: `sai/instructions/apply.md` (STOP & COMMIT step 3 + step 5), `sai/instructions/archive.md` (unchecked-items soft-warn), `sai/instructions/backfill.md` (Phase 1 diff source), `sai/instructions/change-picker.md` (single + multi-change pickers), `sai/instructions/commit.md` (commit authorization).
- Extend the STOP & COMMIT checklist in `apply.md` from 5 steps to 6 steps; new step 6 makes the "continue the loop" behavior explicit (dispatch a NEW subagent for the next unchecked Step, never self-execute).
- Strengthen the "Loop until every Step is done" rule in `apply.md` so the no-self-execution clause is reasserted on every iteration, not just the first.
- Promote GitHub Copilot from implicit to a fully-documented third harness in `AGENTS.md`: add a `commands/copilot/` row, a "Harness universality" rule, Copilot install path, Copilot in the supported-harnesses list, Copilot in mirror discipline, and Copilot in the Fetch URL conventions; update instruction-update and add-a-new-command steps accordingly.

## Capabilities

### New Capabilities

- `closed-choice-prompts`: a universal rule that all closed-choice prompts (yes/no, numbered lists, commit gates) MUST be presented through the harness's native option-picker when one exists, with a plain-text fallback otherwise; full-word option labels and preserved selection semantics across all three harnesses.
- `harness-universality`: the rule that the pipeline supports three harnesses (Claude Code, opencode, GitHub Copilot) and that every change touching wrappers, shared instructions, skills, installers, or AGENTS.md MUST consider all three; harness-agnostic content stays harness-agnostic, and the moment one harness is named all three are named.

### Modified Capabilities

- `stop-commit-checklist`: STOP & COMMIT checklist is now a 6-step sequence (was 5); step 3 is a closed-choice prompt with `yes` / `no` (was text `(y/n)`); step 5 only commits on an explicit `yes`.
- `change-picker`: single-change confirmation and multi-change picker use closed-choice prompts; multi-change uses one option per change name; plain-text fallback is a 1-indexed numbered list.
- `commit-auth-gate`: commit authorization is a closed-choice `yes` / `no` prompt; `yes` executes, anything else stops.
- `apply`: the "Loop until every Step is done" rule reasserts no-self-execution on every iteration; STOP & COMMIT prompts inside the apply flow use closed-choice yes/no.
- `apply-pre-commit-file-report`: pre-commit file visibility report scenarios use closed-choice yes/no authorization in the existing single-gate pattern.
- `apply-coordinator-authority`: the coordinator's commit gate is closed-choice yes/no, with `yes`-only execute semantics preserved.
- `sai-archive-soft-warn-audits`: unchecked-items soft-warn is a closed-choice yes/no prompt; `yes` proceeds, anything else aborts the archive.

## Impact

- **New files**:
  - `openspec/changes/closed-choices-ui-improvements/.openspec.yaml`
  - `openspec/changes/closed-choices-ui-improvements/proposal.md`
  - `openspec/changes/closed-choices-ui-improvements/specs/closed-choice-prompts/spec.md`
  - `openspec/changes/closed-choices-ui-improvements/specs/harness-universality/spec.md`
  - `openspec/changes/closed-choices-ui-improvements/specs/stop-commit-checklist/spec.md`
  - `openspec/changes/closed-choices-ui-improvements/specs/change-picker/spec.md`
  - `openspec/changes/closed-choices-ui-improvements/specs/commit-auth-gate/spec.md`
  - `openspec/changes/closed-choices-ui-improvements/specs/apply/spec.md`
  - `openspec/changes/closed-choices-ui-improvements/specs/apply-pre-commit-file-report/spec.md`
  - `openspec/changes/closed-choices-ui-improvements/specs/apply-coordinator-authority/spec.md`
  - `openspec/changes/closed-choices-ui-improvements/specs/sai-archive-soft-warn-audits/spec.md`
- **Modified files** (per the staged diff):
  - `AGENTS.md`
  - `sai/instructions/apply.md`
  - `sai/instructions/archive.md`
  - `sai/instructions/backfill.md`
  - `sai/instructions/change-picker.md`
  - `sai/instructions/commit.md`
  - `sai/instructions/remember.md`
- **Out of scope**: `design.md`, `tasks.md`, `implementation.md` — not generated by `/sai-backfill`.

## Proposal Research Documentation

**Local files**:
- AGENTS.md
- sai/instructions/apply.md
- sai/instructions/archive.md
- sai/instructions/backfill.md
- sai/instructions/change-picker.md
- sai/instructions/commit.md
- sai/instructions/remember.md
- openspec/specs/stop-commit-checklist/spec.md
- openspec/specs/change-picker/spec.md
- openspec/specs/commit-auth-gate/spec.md
- openspec/specs/apply/spec.md
- openspec/specs/apply-pre-commit-file-report/spec.md
- openspec/specs/apply-coordinator-authority/spec.md
- openspec/specs/sai-archive-soft-warn-audits/spec.md
- openspec/schemas/sai-workflow/schema.yaml
- openspec/schemas/sai-workflow/templates/proposal.md
- openspec/schemas/sai-workflow/templates/specs.md

**External URLs**: None

## Additional Notes

- The Harness universality rule is intentionally stated upstream of the older "Mirror discipline" rule in AGENTS.md, because mirror discipline is one consequence of universality — universality also covers instruction prose (e.g. closed-choice prompts), installer scripts, model tables, and docs.
- The plain-text fallback for GitHub Copilot preserves exact semantics: same question text, same retry/decline rules, same "wait for the answer" requirement as the option-picker presentation. Only the presentation changes.
- The 6th step of the STOP & COMMIT checklist makes an implicit behavior explicit: after a Step's commit is reported (whether authorized or declined), the coordinator dispatches a NEW subagent for the next unchecked Step rather than implementing it itself.
- This is a backfill run — `backfilled: true` is set in `.openspec.yaml` to distinguish it from a normal change.
