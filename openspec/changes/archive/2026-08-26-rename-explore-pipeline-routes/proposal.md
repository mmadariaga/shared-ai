> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

The previous selector labels did not clearly distinguish the supervised planning route from the end-to-end implementation route. The implemented contract now names the planning stop, the unattended build flow, and the no-dispatch manual path explicitly.

## What Changes

The crystallization-close selector uses exactly three localized options in fixed order: Plan (unattended), Build (unattended), and Manual. Their stable machine identities are `plan-unattended`, `build-unattended`, and `manual`, with no compatibility aliases.

Plan preserves the supervised sai-1 and sai-2 lifecycle, stops before implementation, and hands off to `/sai-build`. Build preserves direct implementation, functional fixing, backfill, archive, and exactly one local commit, while projecting only Build/Implement, Backfill, and Archive. Manual dispatches nothing and provides the `/sai-1-spec` handoff.

The active shared contracts, worker route references, localization rules, recovery terminology, documentation, glossary, installer metadata, and tests now use the corresponding Plan or Build terminology. Existing worker identities, protocol markers, gates, slice ordering, re-entry behavior, and failure handling remain unchanged.

This prepared backfill set includes one delta specification for each of the 27 active capability specifications identified by the conflict scan. The main specifications are not claimed to be synchronized until the coordinator validates and executes this draft set.

## Capabilities

### New Capabilities

No new capability is introduced.

### Modified Capabilities

- `explore-pipeline-selector`
- `explore-pipeline-supervision`
- `explore-crystallization-block`
- `explore-crystallization-language-gate`
- `explore-context-isolation`
- `explore-idea-list`
- `explore-overview-language-gate`
- `mode-specific-explore-todo`
- `auto-fast-pipeline-selector`
- `auto-fast-implement-worker`
- `auto-fast-backfill-execution`
- `auto-fast-archive-execution`
- `feedback-gate-provenance-correction`
- `artifact-feedback-gate`
- `bounded-recovery-policy-home`
- `bounded-worker-recovery`
- `orchestration-core`
- `question-context-policy`
- `review-loop-navigation`
- `pipeline-design-phase-chaining`
- `pipeline-phase-transition`
- `pipeline-question-autonomy`
- `planning-artifact-review-loop`
- `supervised-pipeline-forwarding`
- `supervised-review-in-session`
- `supervised-review-reporting`
- `supervised-review-rounds`

## Impact

Source and contract files evidenced by the staged diff:

- `AGENTS.md`
- `GLOSSARY.md`
- `README.md`
- `sai/commands/archive/coordinator.md`
- `sai/commands/archive/instructions.md`
- `sai/commands/archive/worker.md`
- `sai/commands/backfill/coordinator.md`
- `sai/commands/backfill/instructions.md`
- `sai/commands/backfill/worker.md`
- `sai/commands/explore/body.md`
- `sai/commands/explore/instructions.md`
- `sai/commands/explore/steps/crystallization-language-gates.md`
- `sai/commands/explore/steps/idea-list.md`
- `sai/commands/explore/steps/pipeline-auto-fast.md`
- `sai/commands/explore/steps/pipeline-auto-supervised.md`
- `sai/commands/explore/steps/pipeline-selector.md`
- `sai/commands/explore/steps/review-loop.md`
- `sai/install-manifest.json`
- `sai/policies/artifact-feedback-gate.md`
- `sai/policies/autonomy-audit-log.md`
- `sai/policies/bounded-recovery.md`
- `test/bounded-worker-recovery.test.js`
- `test/explore-contract-preservation.test.js`
- `test/explore-pipeline-selector.test.js`

Prepared OpenSpec draft files:

- `openspec/changes/rename-explore-pipeline-routes/.openspec.yaml`
- `openspec/changes/rename-explore-pipeline-routes/proposal.md`
- `openspec/changes/rename-explore-pipeline-routes/specs/explore-pipeline-selector/spec.md`
- `openspec/changes/rename-explore-pipeline-routes/specs/explore-pipeline-supervision/spec.md`
- `openspec/changes/rename-explore-pipeline-routes/specs/explore-crystallization-block/spec.md`
- `openspec/changes/rename-explore-pipeline-routes/specs/explore-crystallization-language-gate/spec.md`
- `openspec/changes/rename-explore-pipeline-routes/specs/explore-context-isolation/spec.md`
- `openspec/changes/rename-explore-pipeline-routes/specs/explore-idea-list/spec.md`
- `openspec/changes/rename-explore-pipeline-routes/specs/explore-overview-language-gate/spec.md`
- `openspec/changes/rename-explore-pipeline-routes/specs/mode-specific-explore-todo/spec.md`
- `openspec/changes/rename-explore-pipeline-routes/specs/auto-fast-pipeline-selector/spec.md`
- `openspec/changes/rename-explore-pipeline-routes/specs/auto-fast-implement-worker/spec.md`
- `openspec/changes/rename-explore-pipeline-routes/specs/auto-fast-backfill-execution/spec.md`
- `openspec/changes/rename-explore-pipeline-routes/specs/auto-fast-archive-execution/spec.md`
- `openspec/changes/rename-explore-pipeline-routes/specs/feedback-gate-provenance-correction/spec.md`
- `openspec/changes/rename-explore-pipeline-routes/specs/artifact-feedback-gate/spec.md`
- `openspec/changes/rename-explore-pipeline-routes/specs/bounded-recovery-policy-home/spec.md`
- `openspec/changes/rename-explore-pipeline-routes/specs/bounded-worker-recovery/spec.md`
- `openspec/changes/rename-explore-pipeline-routes/specs/orchestration-core/spec.md`
- `openspec/changes/rename-explore-pipeline-routes/specs/question-context-policy/spec.md`
- `openspec/changes/rename-explore-pipeline-routes/specs/review-loop-navigation/spec.md`
- `openspec/changes/rename-explore-pipeline-routes/specs/pipeline-design-phase-chaining/spec.md`
- `openspec/changes/rename-explore-pipeline-routes/specs/pipeline-phase-transition/spec.md`
- `openspec/changes/rename-explore-pipeline-routes/specs/pipeline-question-autonomy/spec.md`
- `openspec/changes/rename-explore-pipeline-routes/specs/planning-artifact-review-loop/spec.md`
- `openspec/changes/rename-explore-pipeline-routes/specs/supervised-pipeline-forwarding/spec.md`
- `openspec/changes/rename-explore-pipeline-routes/specs/supervised-review-in-session/spec.md`
- `openspec/changes/rename-explore-pipeline-routes/specs/supervised-review-reporting/spec.md`
- `openspec/changes/rename-explore-pipeline-routes/specs/supervised-review-rounds/spec.md`

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill.
