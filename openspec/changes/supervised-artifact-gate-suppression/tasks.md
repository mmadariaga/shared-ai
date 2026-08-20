## Step 1: Shared gate mode parameter and supervised auto-proceed

**Routing**: layer=infra · discipline=config · complexity=medium (policy + policy-pinning tests; cross-cutting contract)

**Files Affected**:
M sai/policies/artifact-feedback-gate.md
M test/explore-pipeline-selector.test.js
M test/spec-coordinator-worker.test.js
M test/design-coordinator-worker.test.js

**What Will Be Done**: Extend the Parameters section with optional `mode` (`interactive` | `supervised`), omitted-default interactive as a bounded exception to the missing-parameter STOP, and invalid non-empty STOP (no silent default, no auto-proceed). Add the supervised auto-proceed branch single-sourced under a clear requirement that keeps the gate as sequencer (execute site-supplied `next-action` exactly once; no picker; no free-text; no iteration increment; no `.openspec.yaml` writes). Mode-qualify presentation, free-text advertisement, proceed-branch, placement, and machine-feedback post-loop wording so interactive paths retain today's labels/order/Recommended marker. Placement under supervised mode: gate application remains after the decision summary; mode-qualified placement prose MUST preserve fetching-body **post-proceed** report order (D5) — it MUST NOT require supervised reports to precede auto-proceed. Verify-first for the failed-worker non-advance rule: state explicitly that supervised auto-proceed runs only after deferred-gate resolution on a live phase path, never over `failed`/`cancelled`. In the same step, extend the three structural suites with policy-only pins (mode vocabulary, invalid-mode STOP, exact-once next-action, no approval-state writes, interactive preservation, failed/cancelled non-advance cues as already owned by explore interruption tests). Do not yet require explore site `mode = supervised` supply or worker coexistence strings — those land in Steps 2–3. Map behavior to `openspec/changes/supervised-artifact-gate-suppression/specs/artifact-feedback-gate/spec.md` (including scenario `supervised placement preserves fetching-body post-proceed report order`).

**Testing Strategy**: `node --test test/explore-pipeline-selector.test.js test/spec-coordinator-worker.test.js test/design-coordinator-worker.test.js` exits 0 before the step is considered done; optional full `npm test`.

**Existing Tests Broken**: None

## Step 2: Explore item 10 supplies supervised mode at both gate sites

**Routing**: layer=infra · discipline=config · complexity=medium (orchestration prose + explore structural suite)

**Files Affected**:
M sai/commands/explore/instructions.md
M test/explore-pipeline-selector.test.js

**What Will Be Done**: Keep the single pre-dispatch Fetch of the shared gate. At the spec-phase and design-phase gate application sites, supply `mode = supervised` alongside existing artifacts / proceed-label / next-action prose (spec: Finish step → phase transition; design: Continue → overview generation + supervised design terminal). Mode-qualify item 10 wording that still assumes ordinary iteration-0 user-facing gate presentation for supervised phases after rounds (so supervised paths auto-proceed per the shared gate instead). Do **not** invent or rewrite an active-supervision interval stage enumeration inside `explore/instructions.md` — that enumeration is owned by the `explore-pipeline-selector` delta (main spec path `openspec/specs/explore-pipeline-selector/spec.md`); item 10 only retains its existing full-interval duplicate-start rejection prose. Per D5, keep item 10's emission order: decision summary → gate auto-proceed/next-action → then existing reports (spec phase-transition / Supervised sai-1 done after spec proceed; design supervised-done / convergence counterparts after overview-generation completed). Do **not** move those reports before auto-proceed. Do not add suppression chatter; do not inline auto-proceed outside the shared policy. Do not edit standalone coordinators. In the same step, update `test/explore-pipeline-selector.test.js` to pin both sites' `mode = supervised` supply, supervised design Continue → overview generation + supervised terminal (distinct from standalone sai-2 completion sentence), post-proceed report ordering cues where the suite already encodes report placement, and retain prior policy pins from Step 1. Requirements: `openspec/changes/supervised-artifact-gate-suppression/specs/explore-pipeline-supervision/spec.md`, `.../explore-pipeline-selector/spec.md`, `.../pipeline-design-phase-chaining/spec.md`, `.../artifact-feedback-gate/spec.md` (post-proceed placement scenario).

**Testing Strategy**: `node --test test/explore-pipeline-selector.test.js` (and the two coordinator suites still green from Step 1) exits 0 before done.

**Existing Tests Broken**: None

## Step 3: Mode-qualify worker-loop coexistence prose

**Routing**: layer=infra · discipline=config · complexity=medium (two worker contracts + two coordinator/worker suites)

**Files Affected**:
M sai/commands/spec/worker.md
M sai/commands/design/worker.md
M test/spec-coordinator-worker.test.js
M test/design-coordinator-worker.test.js

**What Will Be Done**: Documentation-only coexistence correction on `sai/commands/spec/worker.md` and `sai/commands/design/worker.md`: where the worker-owned loop's coexistence sentence currently implies the coordinator always presents the prose feedback gate at iteration 0 after the loop ends, reword it to cross-reference the shared gate's mode-dependent behavior (interactive/omitted → present at iteration 0; supervised → auto-proceed, no picker) rather than asserting a condition the worker evaluates. Workers never receive `mode` and gain no new input, lifecycle field, or picker logic. Do not couple workers to `MachineFeedbackAdapter`, do not change caps, isolation, or overview lifecycle. In the same step, update `test/spec-coordinator-worker.test.js` and `test/design-coordinator-worker.test.js` to pin the documentation cross-reference and to reaffirm standalone coordinators still omit `mode` with interactive parameter triples (spec: Finish step / mandatory stop; design: Continue → completion sentence and stop only). Requirements: `openspec/changes/supervised-artifact-gate-suppression/specs/planning-artifact-review-loop/spec.md`.

**Testing Strategy**: `node --test test/spec-coordinator-worker.test.js test/design-coordinator-worker.test.js test/explore-pipeline-selector.test.js` then full `npm test`.

**Existing Tests Broken**: None

## Required Documentation

### Local files
- sai/policies/artifact-feedback-gate.md
- sai/commands/explore/instructions.md (item 10 region ~260-400)
- sai/commands/spec/coordinator.md
- sai/commands/design/coordinator.md
- sai/commands/spec/worker.md
- sai/commands/design/worker.md
- sai/commands/spec/instructions.md
- sai/commands/design/instructions.md
- sai/commands/explore/launcher.md
- sai/policies/artifact-review-contract.md
- sai/policies/remember.md
- sai/policies/adr-ddr-criteria.md
- GLOSSARY.md
- SAI_LEARNINGS.md
- package.json
- test/explore-pipeline-selector.test.js
- test/spec-coordinator-worker.test.js
- test/design-coordinator-worker.test.js
- openspec/specs/artifact-feedback-gate/spec.md
- openspec/specs/pipeline-design-phase-chaining/spec.md
- openspec/specs/explore-pipeline-supervision/spec.md
- openspec/specs/explore-pipeline-selector/spec.md
- openspec/specs/planning-artifact-review-loop/spec.md

### Spec files
- openspec/changes/supervised-artifact-gate-suppression/specs/artifact-feedback-gate/spec.md
- openspec/changes/supervised-artifact-gate-suppression/specs/pipeline-design-phase-chaining/spec.md
- openspec/changes/supervised-artifact-gate-suppression/specs/explore-pipeline-supervision/spec.md
- openspec/changes/supervised-artifact-gate-suppression/specs/explore-pipeline-selector/spec.md
- openspec/changes/supervised-artifact-gate-suppression/specs/planning-artifact-review-loop/spec.md

### External URLs
None

## Implementation Context

**Stack**: Node.js ≥18 / npm; test runner `node:test`; structural instruction tests (no application runtime framework).

**Conventions**:
- Artifact-feedback gate semantics are single-sourced in `sai/policies/artifact-feedback-gate.md`; consumers fetch and supply parameters in prose rather than duplicating judgment rules.
- Explore remains read-only under Auto; phase workers own change-directory writes.
- Coordinator/worker suites pin lifecycle and gate parameter vocabulary in source bodies; prefer rule names over unstable line-range citations.
- Harness parity: shared `sai/` sources are the contract; Claude Code and opencode both consume them.
- Gate parameter supply uses inline prose assignments (`artifacts = …`, `proceed-label = …`, `next-action = …`); `Fetch` is literal at preload/coordinator sites and conceptual at explore apply sites after preload.
- Structural suite updates co-land in the same step as the instruction sources they pin so every step remains a green commit boundary.

**Avoid**:
- Detecting explore/Auto caller identity or conversation context to choose gate mode.
- Inlining supervised auto-proceed outside the shared gate policy.
- Editing standalone spec/design coordinators to pass explicit `mode = interactive`.
- Asserting opencode worker registration from configuration agent maps or using brittle `remember.md` line ranges.
- Driving reviewed-sai-1 / reviewed-sai-2 idea-list marks from gate presence/absence.
- Deferring broken-suite repairs across step boundaries (leaves `npm test` red mid-change).

**Test Command**: `npm test` (scoped: `node --test test/<file>.test.js [test/<file>.test.js ...]`)
