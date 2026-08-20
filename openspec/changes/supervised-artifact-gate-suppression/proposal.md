**Complexity**: medium (5 modified caps, mode-qualified gate surface, ~6 instruction/spec paths, no breaking change)

## Why

The shared artifact feedback gate was written for standalone `/sai-1-spec` and `/sai-2-design`, and the supervised Auto pipeline inherits it verbatim — so an Auto run stops twice for a user picker (after spec convergence and after design convergence), contradicting the delegated unattended intent of Auto. This change adds a supervised execution mode that auto-executes each gate's next-action so a supervised sai-1 + sai-2 run stays unattended from dispatch until design terminates.

## What Changes

- Add an optional `mode` parameter to `sai/policies/artifact-feedback-gate.md` (`interactive` default; `supervised` at explore Auto fetch sites only).
- In supervised mode, after convergence, cap exhaustion, or empty findings, auto-execute `next-action` once without presenting the picker, free-text prompt, or free-text path, and without incrementing the iteration counter.
- Mode-qualify every gate presentation, free-text, proceed-branch, and placement requirement so interactive and supervised branches cannot contradict after archive sync.
- Supply `mode = supervised` at both of explore item 10's gate fetch sites (spec-phase Finish step → design dispatch; design-phase Continue → change-overview generation); next-action execution stays owned by the shared gate policy.
- Reword the active-supervision interval so it names the supervised gate application point (auto-proceed), not a user-facing picker.
- Mode-qualify planning-artifact-review-loop coexistence so a supervised worker-loop ending does not force iteration-0 prose gate presentation.
- Leave standalone `/sai-1-spec` and `/sai-2-design` coordinators on the interactive default with unchanged presentation, option order, and Recommended marker.
- Add no new conversation text at suppression points; existing item 10 reports (convergence/cap tally, Supervised sai-1/sai-2 done, autonomy audits) remain the visible progress marks.

## Capabilities

### New Capabilities

- None

### Modified Capabilities

- `artifact-feedback-gate`: optional supervised-mode parameter; auto-proceed branch single-sourced in one requirement; mode-qualified presentation, free-text, proceed-branch, placement, and convergence / cap-exhaustion / empty-findings scenarios; invalid mode STOPs.
- `pipeline-design-phase-chaining`: suppress the design-phase user gate under supervised mode; shared gate auto-triggers the change-overview.md generation pass that Continue drives today.
- `explore-pipeline-supervision`: supply supervised mode at both item 10 gate fetch sites; fix the unattended run boundary against force-majeure interruptions and authoring-fault invalid-mode STOP.
- `explore-pipeline-selector`: active-supervision interval names the supervised gate application point (auto-proceed) instead of a user-facing artifact feedback gate.
- `planning-artifact-review-loop`: coexistence scenario mode-qualified so supervised worker-loop endings auto-proceed instead of presenting the prose gate at iteration 0.

## Impact

- `sai/policies/artifact-feedback-gate.md` — fourth optional parameter, supervised auto-proceed branch, and mode-scoped presentation/proceed wording.
- `sai/commands/explore/instructions.md` item 10 — both gate fetch sites supply `mode = supervised`; wording that always presents the ordinary gate after rounds is mode-qualified; auto-proceed execution remains in the shared gate.
- `sai/commands/spec/coordinator.md` and `sai/commands/design/coordinator.md` — unchanged fetch sites (no mode supplied → interactive default).
- Main specs under `openspec/specs/artifact-feedback-gate/`, `openspec/specs/pipeline-design-phase-chaining/`, `openspec/specs/explore-pipeline-supervision/`, `openspec/specs/explore-pipeline-selector/`, and `openspec/specs/planning-artifact-review-loop/` receive delta requirements/scenarios.
- Explore item 10 post-proceed report order (phase-transition report after the spec artifact gate proceeds) is preserved; gate placement does not reorder those reports before auto-proceed.
- No application runtime, harness install surface, or new dependency.
- Non-goals: question-autonomy policy, recovery policy, artifact-review-contract, review-loop contract, idea progress list marking rules, new panel behavior.

## Proposal Research Documentation

**Local files**:
- `sai/policies/artifact-feedback-gate.md` (Parameters, Machine-feedback adapter, Present the gate, On proceed)
- `sai/commands/explore/instructions.md` (item 10 Phase-aware dispatch; ~:275, :327, :392)
- `sai/commands/spec/coordinator.md` (standalone gate fetch)
- `sai/commands/design/coordinator.md` (standalone gate fetch)
- `openspec/specs/artifact-feedback-gate/spec.md` (presentation, free-text, proceed, placement, machine adapter)
- `openspec/specs/pipeline-design-phase-chaining/spec.md` (esp. deferred design gate and completion)
- `openspec/specs/explore-pipeline-supervision/spec.md`
- `openspec/specs/explore-pipeline-selector/spec.md` (active supervision interval including gates)
- `openspec/specs/feedback-gate-provenance-correction/spec.md`
- `GLOSSARY.md` (Supervised Pipeline, Pipeline Selector, related terms)

**External URLs**: None

## Additional Notes

- Parameterize at the fetch site rather than branch on invocation context: Isolation Mode and declared-not-detected discipline forbid runtime caller detection; mode fits the existing artifacts / proceed-label / next-action contract.
- Auto-execute next-action rather than remove the gate call: both gates are phase sequencers (spec → design; design → overview), not only feedback surfaces. The shared gate owns execution of next-action; explore only supplies parameters.
- `mode` is optional with explicit default `interactive`, documented as a bounded exception to the gate's "if any parameter is missing, STOP" rule — that rule still applies fully to artifacts, proceed-label, next-action, and invalid non-empty mode values.
- Iteration counter stays 0 for the whole supervised run; no branch increments it under supervised mode.
- Idea progress list marks (reviewed-sai-1 / reviewed-sai-2) remain evidence-only from review rounds (High=0 marks; High≥1 clears), never from the gate or its absence.
- Compensating path for lost mid-run artifact steering: post-run review-loop in the still-open explore window after sai-2 finishes.
- Remaining supervised runtime stop points after this change: question escalation below confidence/grounding floor, and worker `failed` / `cancelled`. Invalid-mode STOP is an authoring-fault path, not a normal runtime interruption. Suppression creates no advance path over a failed or cancelled worker.
