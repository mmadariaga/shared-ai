> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

**Complexity**: high (12 modified capabilities; shared lifecycle and merge contract changes)

## Why

The current `sai-merge` path mixes languages and asks users to decide among low-level conflict outcomes before they can inspect or correct a coherent plan. The implemented change adds a conflict-triggered language handoff, coordinator-routed presentation, and a confirmed global strategy while preserving read-only worker analysis and coordinator-owned mutations.

## What Changes

- The worker stops after Git reports conflicted paths and returns a closed `conflict_detected` extension before reading base, current, or incoming versions. Clean merges continue directly without language or strategy prompts.
- The coordinator records the exact conflict inventory, asks for a working language only after a conflict, and retains that language as invocation-scoped state through same-worker continuations.
- Worker information, conflict notices, strategy proposals, and open corrections use ordinary conversation text. Closed decisions use the active harness-native picker.
- The worker produces one complete global resolution strategy for the selected conflict set, with facts, inferences, objectives, alternatives, risks, and complete resolution content where required.
- Users may apply, revise, or decline the strategy. Revisions remain on the same worker and do not write, remove markers, stage files, or commit.
- New conflicts or inconsistencies found during application or verification return to strategy analysis with the selected language preserved and without repeating the language question.
- The shared runner and worker core validate the phase-defined nonterminal extension and preserve changed-file aggregation. Claude Code and opencode retain equivalent merge behavior with coordinator-only task-list emission.
- The staged diff also removes `openspec/changes/rename-build-to-meta-build/proposal.md`; this unrelated artifact deletion is recorded as scope drift.

## Capabilities

### New Capabilities

- None. The implementation extends existing merge, presentation, lifecycle, orchestration, picker, panel, and fast-track capabilities.

### Modified Capabilities

- `sai-merge-command`: add conflict-triggered language selection, global strategy confirmation and revision, and same-language re-entry after new problems.
- `merge-presentation-seam`: add separate ordinary-text, native-question, and open-input coordinator channels.
- `worker-lifecycle-protocol`: define merge-specific closed nonterminal extension fields and preserve ordered changed-file aggregation.
- `nonterminal-result-transport`: transport `conflict_detected` as a paused closed extension before terminal completion.
- `question-context-policy`: apply the question-context contract to the conflict-language handoff and localized strategy interaction.
- `closed-choice-prompts`: route language and strategy decisions through native option pickers while preserving stable values.
- `harness-panel-render-binding`: keep merge TODO emission coordinator-owned and hold contextual analysis pending through strategy confirmation.
- `progress-plan-declaration`: keep the adaptive merge TODO separate from worker progress plans.
- `sai-fast-track-flag`: retain only the merge scope-gate bypass under fast-track.
- `coordinator-protocol-single-source`: route declared merge extensions through the shared result loop.
- `orchestration-core`: extend the shared phase-adapter seam for merge conflict handoffs.
- `command-runner-layout`: retain the canonical neutral locations for the shared runner and worker core while supporting the extension seam.

## Impact

- Modified `AGENTS.md`.
- Modified `README.md`.
- Modified `sai/adapters/claude/panel-render.md`.
- Modified `sai/adapters/opencode/panel-render.md`.
- Modified `sai/commands/merge/coordinator.md`.
- Modified `sai/commands/merge/instructions.md`.
- Modified `sai/commands/merge/presentation.md`.
- Modified `sai/commands/merge/worker.md`.
- Modified `sai/orchestration/command-runner.md`.
- Modified `sai/orchestration/worker-core.md`.
- Modified `sai/policies/todo-structure.md`.
- Modified `test/merge-contextual-conflict.test.js`.
- Deleted `openspec/changes/rename-build-to-meta-build/proposal.md` as staged scope drift.
- The change affects prompt infrastructure, lifecycle contracts, coordinator presentation, and contract tests; it does not add production application code.
- Known limitations include entering a conflicted repository state before strategy confirmation, non-persistence of the selected language, a larger coordinator presentation contract, and potentially repeated strategy revisions.
- Research consulted: `sai/commands/merge/coordinator.md`, `sai/commands/merge/worker.md`, `sai/commands/merge/instructions.md`, `sai/commands/merge/presentation.md`, `sai/orchestration/command-runner.md`, `sai/orchestration/worker-core.md`, both harness panel bindings, `sai/policies/todo-structure.md`, the merge contract test, the sai-workflow schema, and all twelve overlapping existing specifications identified above.
- Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill.
