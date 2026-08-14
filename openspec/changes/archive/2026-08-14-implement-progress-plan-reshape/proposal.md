**Complexity**: high (4 capabilities, 7 affected paths, breaking plan contract)

## Why

The 2026-08-14 `spec-design-review-progress-step` change reshaped the `/sai-1-spec` and `/sai-2-design` progress plans (imperative labels, per-act granularity) but explicitly left `/sai-3-implement` with nominal labels as an accepted trade-off. This change closes that asymmetry: the implementation plan becomes six ordered steps with imperative labels that name the actual acts — including a renamed `collapse-implemented-steps` step and a `validation` step that separates the durable artifact verification from the plan write.

## What Changes

- **BREAKING** Reshape the `/sai-3-implement` progress plan from five steps (`prereqs-resolution`, `plan-simplification`, `artifact-analysis`, `documentation-review`, `plan-generation`) to six: `prereqs-resolution`, `collapse-implemented-steps`, `artifact-analysis`, `documentation-review`, `plan-generation`, `validation`. Step ids and labels change; the plan is declared in both `sai/commands/implement/coordinator.md` and `sai/commands/implement/worker.md`, and those two declaration blocks must stay byte-identical to each other in the files' existing list rendering (the specs render the plans as indented `id: "label"` blocks purely to fix ids and labels, not as the on-file form).
- Rename `plan-simplification` → `collapse-implemented-steps` so the id and label both name the actual act (collapsing every fully applied `#### Step N` of an existing `implementation.md` to `*(already applied)*`), matching how the spec/design change renamed ids.
- Move all six labels to imperative form — `Check prerequisites and resolve the change`, `Collapse implemented steps`, `Analyze artifacts and validate decisions`, `Review required documentation`, `Write implementation.md`, `Validate implementation.md and the audit append` — replacing the current nominal labels (`Prerequisites and change resolution`, `Existing plan simplification`, `Artifact analysis and decision validation`, `Required documentation review`, `Implementation plan generation and verification`).
- Split the former `plan-generation` step into `plan-generation` (the write — first-run generation or re-run preservation plus the audit-derived step append) and `validation` (the worker's pre-delivery durable-artifact verification — the `implementation.md` invariants and the audit-derived step append check), separating writing from verifying like sai-1's `validation` step.
- Preserve the first-run skip-fold under the renamed id: on a first run `collapse-implemented-steps` is skipped entirely and its id folds into the next completed batch in plan order with no separate `skipped` field; on a re-run it completes as its own batch.
- The run-closing `completed` reconciliation renders every unmarked step `completed` with no carve-out: the implementation plan carries no `review` step and no evidence-marked designation, so the evidence-marked carve-out of `sai/policies/todo-structure.md` does not apply to it.

## Capabilities

### New Capabilities

- `implement-coordinator-worker-tests`: `test/implement-coordinator-worker.test.js` asserts the six-step plan — step ids, imperative labels, and order on both the coordinator declaration and the worker enumeration — rejects the retired `plan-simplification` id on both surfaces, and asserts the absence of any `review` step and any reconciliation carve-out in the implementation plan.

### Modified Capabilities

- `implement-progress-plan`: the canonical plan becomes six ordered steps with imperative labels; `plan-simplification` is renamed `collapse-implemented-steps`; the steps-match-workflow correspondence is rewritten against the split `plan-generation` / `validation` steps; byte-identity is pinned between the coordinator and worker declaration blocks; the first-run skip-fold requirement carries the renamed id with unchanged behavior.
- `implementation-planning-worker`: the progress-event enumeration and batch scenarios follow the six ids; the durable-artifact verification gate (the `implementation.md` invariants plus the audit-append check) reports under `validation` and remains a non-completion blocker.
- `implementation-coordinator`: the coordinator declares the six-step plan exactly as `implement-progress-plan` specifies, and the run-closing `completed` reconciliation renders every unmarked step `completed` with no carve-out.

## Impact

Affected instruction, spec, and test surfaces:

- `sai/commands/implement/coordinator.md` — the declared plan (currently lines 25-32)
- `sai/commands/implement/worker.md` — `## Progress Reporting` (currently lines 47-68), including the first-run skip-fold prose that names `plan-simplification` at lines 62-65
- `openspec/specs/implement-progress-plan/spec.md` — plan ids and labels, steps-match-workflow correspondence, first-run skip-fold requirement
- `openspec/specs/implementation-planning-worker/spec.md` — the progress-emission requirement and batch scenarios (currently lines 85-117)
- `openspec/specs/implementation-coordinator/spec.md` — new requirement pinning the declared plan shape and the no-carve-out reconciliation
- `openspec/specs/implement-coordinator-worker-tests/spec.md` — new capability (created on spec sync)
- `test/implement-coordinator-worker.test.js` — Step 6 id, label, and order assertions (currently lines 645-719)

Explicitly not touched: the archived `2026-08-08-progress-plan-spec-and-implement` reference (kept historical), `sai/policies/todo-structure.md` (its evidence-marked carve-out is scoped to the spec/design `review` steps and never applies to a plan without an evidence-marked designation), the four audit progress plans, `sai/policies/artifact-review-contract.md`, and `GLOSSARY.md` (no new domain term is introduced — step ids are per-phase canonical, not glossary language).

No code, dependency, or configuration change; the surfaces above are agent instruction files, main specs, and one test file.

## Proposal Research Documentation

**Local files**:

- `sai/commands/implement/coordinator.md` (lines 25-32)
- `sai/commands/implement/worker.md` (lines 47-68)
- `sai/commands/implement/instructions.md` (Step 1-5 workflow, lines 35-127)
- `sai/policies/todo-structure.md`
- `openspec/specs/implement-progress-plan/spec.md`
- `openspec/specs/implementation-planning-worker/spec.md` (lines 85-117)
- `openspec/specs/implementation-coordinator/spec.md`
- `openspec/specs/spec-progress-plan/spec.md`
- `openspec/specs/design-coordinator/spec.md`
- `openspec/specs/progress-plan-declaration/spec.md`
- `test/implement-coordinator-worker.test.js` (lines 645-719)
- `test/spec-coordinator-worker.test.js` (lines 28-49)
- `test/design-coordinator-worker.test.js` (lines 924-953)
- `openspec/changes/archive/2026-08-14-spec-design-review-progress-step/proposal.md`
- `openspec/changes/archive/2026-08-14-spec-design-review-progress-step/specs/spec-progress-plan/spec.md`
- `openspec/changes/archive/2026-08-14-spec-design-review-progress-step/specs/design-coordinator/spec.md`
- `openspec/changes/archive/2026-08-14-spec-design-review-progress-step/specs/design-planning-worker/spec.md`
- `openspec/changes/archive/2026-08-08-progress-plan-spec-and-implement/proposal.md`
- `GLOSSARY.md`

**External URLs**: None.

## Additional Notes

- **Overview Language**: this change's Overview Language is **Español**. The design worker's overview generation should be invoked with `--overview-lang Español` so `change-overview.md` free-text prose is localized accordingly; the proposal and specs themselves stay in English.
- The id rename touches every live surface that names `plan-simplification` — the coordinator, the worker (including the skip-fold prose), the two main specs, and the test file. The archived `2026-08-08` change reference is left historical and is not renamed.
- `validation` duplicates no gate semantics: it re-homes the existing durable verification (the `implementation.md` invariants and the audit-append check) from the former combined `plan-generation` step, so no verification is added or removed. The gate stays a non-completion blocker: any failed check returns a `failed` lifecycle result and never a `completed` claim.
- The byte-identity requirement mirrors the spec/design convention established by the 2026-08-14 change: the coordinator and worker declaration blocks must match content-wise in those files' existing list rendering; neither file's block is required to match this proposal's illustrative indented block.
- Step ids are per-phase canonical, per the 2026-08-14 precedent: the `validation` id used here is the implementation plan's own step and does not conflict with the spec plan's `validation` step.
- The first-run skip-fold for `collapse-implemented-steps` is preserved byte-for-byte in behavior: skipped id folds into the next completed batch in plan order with no separate `skipped` field; on a re-run the step completes as its own batch.
- The plan label deliberately uses `collapse` for the act while `sai/commands/implement/instructions.md` Step 1 keeps its existing heading "Simplify existing implementation.md": the label names the concrete act performed on applied steps (collapsing each fully applied `#### Step N` to `*(already applied)*`), and renaming the workflow heading is outside this change's surface set, so the two vocabularies intentionally diverge and no heading rename is planned.
