> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

**Complexity**: medium (replication batch over 3 structurally identical phases; 18 new + 7 modified paths; 3 new + 7 modified capabilities; no breaking change)

## Why

The three remaining audit phases (`sai-6-security`, `sai-7-performance`,
`sai-8-accessibility`) still delivered their whole instruction mass up
front: monolithic `instructions.md` files fetched wholesale mid-run. Over
their long gated-analysis runs, instruction salience decayed and produced
the same adherence drift already cured for `sai-1-spec` and, in the
immediately preceding change, for `sai-5-review`. Because all three share
review's canonical five-step plan and wholesale-delivery shape, leaving
them on wholesale delivery kept the pipeline inconsistent: four
audit-family phases running on two different instruction-delivery
mechanisms. This change replicates the step-gated delivery pattern
validated by `review-step-gated-instructions` onto all three, restoring a
single mechanism across the audit family.

## What Changes

- Added a carved `steps/` library beside each untouched monolith:
  - `sai/commands/security/steps/` — `common.md` plus
    `discover-module-map.md`, `resolve-sast-analysis.md`, `resolve-sca.md`,
    `close-security-outcome.md`
  - `sai/commands/performance/steps/` — `common.md` plus
    `map-stack-hot-paths.md`, `audit-performance-tiers.md`,
    `resolve-diagnostics.md`, `close-performance-outcome.md`
  - `sai/commands/accessibility/steps/` — `common.md` plus
    `map-ui-framework.md`, `resolve-static-audit.md`,
    `resolve-runtime-audit.md`, `close-accessibility-outcome.md`
  Each step file names its active step id; each `common.md` records that
  the leading scope-resolution step has no file of its own (fileless).
- Each of the three audit coordinators now declares a static optional
  `step_pointer_map` covering exactly its five declared plan ids in plan
  order, never carried in the dispatch envelope or any reconstruction
  field; progress-event continuations are exactly two lines ending in a
  deterministic `Active step:` pointer line; non-progress continuations
  carry no pointer line; replacement reconstruction fields include
  `active_step_id`.
- Each of the three audit workers now loads `steps/common.md` at dispatch
  as part of a sealed initial surface, owns an `## Active Step Execution`
  section, executes only the coordinator-named step, and no longer fetches
  its wholesale `invocation.md`; a legitimately skipped gated stage still
  reports its milestone and the next delivered pointer advances past it.
- `AGENTS.md` updated to document the replicated experiment on the audit
  family.
- Three new guard suites added: `test/security-coordinator-worker.test.js`,
  `test/performance-coordinator-worker.test.js`, and
  `test/accessibility-coordinator-worker.test.js`, asserting map coverage,
  pointer-line literals, non-pointer continuation behavior,
  `active_step_id` reconstruction, worker sealed-surface rules, and
  existence of each carved library beside its untouched instructions.md.

Deliberately preserved boundaries: step-gated delivery remains labeled an
active experiment rather than a graduated convention; every phase's
original monolithic `instructions.md` stays in place beside its new
`steps/` library as accepted duplication per the sai-1 precedent pending a
future retirement decision; and this change shipped as one replication
batch instead of three minimal per-phase changes.

## Capabilities

### New Capabilities

- **Security step-gated delivery** — per-phase steps library, coordinator
  step_pointer_map, and execute-only-the-active-step worker card for
  sai-6-security.
- **Performance step-gated delivery** — the same three-part pattern for
  sai-7-performance.
- **Accessibility step-gated delivery** — the same three-part pattern for
  sai-8-accessibility.

### Modified Capabilities

- `coordinator-step-pointers` — coverage extends from spec/design/review
  coordinators to also cover the security/performance/accessibility
  coordinators declaring static step_pointer_maps.
- `worker-active-step-execution` — execute-only-the-active-step and
  sealed-surface rules extend to the three audit workers.
- `audit-command-progress-plans` — audit workers continue under per-step
  instruction files instead of wholesale analysis instruction loading,
  plan ids unchanged.
- `security-phase-coordinator` / `accessibility-phase-coordinator` —
  reconstruction fields gain `active_step_id`; progress continuations gain
  the pointer line within otherwise closed adapter surfaces.
- `security-phase-worker` / `accessibility-phase-worker` — the wholesale
  invocation-core fetch chain requirement is replaced by
  steps/common.md-at-dispatch plus coordinator-named per-step execution.

## Impact

New files (18):
- `sai/commands/security/steps/common.md`, `discover-module-map.md`,
  `resolve-sast-analysis.md`, `resolve-sca.md`, `close-security-outcome.md`
- `sai/commands/performance/steps/common.md`, `map-stack-hot-paths.md`,
  `audit-performance-tiers.md`, `resolve-diagnostics.md`,
  `close-performance-outcome.md`
- `sai/commands/accessibility/steps/common.md`, `map-ui-framework.md`,
  `resolve-static-audit.md`, `resolve-runtime-audit.md`,
  `close-accessibility-outcome.md`
- `test/security-coordinator-worker.test.js`,
  `test/performance-coordinator-worker.test.js`,
  `test/accessibility-coordinator-worker.test.js`

Modified files (7): `AGENTS.md`,
`sai/commands/security/coordinator.md`,
`sai/commands/performance/coordinator.md`,
`sai/commands/accessibility/coordinator.md` (+13/−1 each),
`sai/commands/security/worker.md` (+6/−1),
`sai/commands/performance/worker.md` (+6/−1), and
`sai/commands/accessibility/worker.md` (+8/−1).

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Proposal Research Documentation

Consulted local surfaces:
- The selected diff itself: `git diff --staged --stat`, `--numstat`, and
  the full staged patch over the 25 changed paths.
- Existing main specs scanned for overlap via delegated read-only search:
  `openspec/specs/coordinator-step-pointers/spec.md`,
  `openspec/specs/worker-active-step-execution/spec.md`,
  `openspec/specs/audit-command-progress-plans/spec.md`,
  `openspec/specs/security-phase-coordinator/spec.md`,
  `openspec/specs/security-phase-worker/spec.md`,
  `openspec/specs/accessibility-phase-coordinator/spec.md`,
  `openspec/specs/accessibility-phase-worker/spec.md`.
- Repo conventions: `AGENTS.md` (step-gated experiment description,
  harness universality, mirror discipline) and the sibling precedent
  change `review-step-gated-instructions` referenced in the intent.
- The three guard suites added by the diff, which encode the observable
  contract asserted above.

External URLs: None

## Additional Notes

- Backfilled against a user-supplied statement of intent
  (`prior_intent: true` in `.openspec.yaml`); reconciliation found every
  intent item matched by diff evidence with no scope drift.
- Functional fix loop converged in its first round with zero findings;
  all three guard suites green at handover — security 13/13, performance
  25/25, accessibility 29/29 — with changed paths exactly matching the
  25-path plan and command-runner.md, install-manifest.json, materialized
  bindings, wrappers, and all original instruction monoliths verified
  untouched vs base.
- Each phase's original monolithic `instructions.md` intentionally remains
  beside its new `steps/` library as accepted duplication, per the sai-1
  precedent, pending a future retirement decision.
- Shipped as one larger replication batch instead of three minimal
  per-phase changes: the three phases share review's canonical five-step
  plan and wholesale-delivery shape, making the triple application
  mechanical with one shared documentation/test pass.
