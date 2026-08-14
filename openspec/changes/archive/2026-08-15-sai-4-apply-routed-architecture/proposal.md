**Complexity**: high (15 capability entries, 57 requirement headings, >8 affected paths, breaking routing behavior change)

## Why

Apply is the only numbered command (of sai-1..8) without the routed pattern — no coordinator/worker/invocation triad, no worker-matrix entry, no bindings, no agent. Aligning it removes the architectural asymmetry and lets the Step loop be driven by managed lifecycle workers emitting progress/needs_input events (currently `sai/commands/apply/instructions.md:122-146`).

## What Changes

- **Routed card set for apply**: `sai/commands/apply/` gains `coordinator.md` + `runner.md` + `invocation.md` + RED/GREEN worker contracts; `runner.md` is extracted from the current monolithic `instructions.md` (the Step loop contract); the utility `body.md` surface is retired.
- **RED/GREEN worker model**: two worker-matrix entries (`sai-4-red-worker`, `sai-4-green-worker`) on the budget tier, with projected bindings and agent files for both harnesses — the first matrix entries not on the standard routed model tier.
- **Step routing decision tree** replaces the current three-part condition + traced fall-back (instructions.md:122-146): no RED block + production → GREEN direct; no RED block + no production → RED green-exception; RED + no `## Step N` in `interfaces.md` → **STOP**; RED + contract + ≥1 production file → blind RED → GREEN; RED + contract + no production files → RED green-exception (tests must end green, reports GREEN = pass). The production-surface property is checked for testable AND non-testable Steps, so the tree is exhaustive.
- **BREAKING**: contract-absent Steps now STOP instead of falling back to a single dispatch — `interfaces.md` `## Step N` becomes a hard requirement; the traced fall-back shapes are removed.
- **Same-worker retry**: coordinator validation failure continues the same GREEN worker session with the failing path and evidence (cap 3), never a fresh dispatch; after 3 continuations without convergence the conflict escalates to the human (implementation vs test vs interface).
- **Apply progress plan**: the phase adapter declares a per-dispatch milestone plan (RED: `test-authoring` → `red-verification`; GREEN: `implementation` → `green-verification`; green-exception: `test-authoring` → `green-verification`) that workers mark via progress events; the run-start step projection is never marked from these events.
- **Report carrier**: the 9-field apply report rides a phase-adapter-defined extension of the worker lifecycle payload (`sai/worker-core.md` amended to admit the additive extension); the neutral protocol gains no apply-specific field names.
- **Coordinator ownership preserved**: validation, `changed_files` union, human gates, and commit stay in the main session; the union accumulates across dispatches and retries without reset.
- **Boot re-routing**: `apply` moves from utility to routed selection in both harness boot adapters (`sai/adapters/{claude,opencode}/boot.md`).
- **Taxonomy updates**: `AGENTS.md` / `README.md` reclassify apply from utility card to routed; `GLOSSARY.md` gains the RED/GREEN worker vocabulary.

## Capabilities

### New Capabilities

- `apply-routed-card-set`: apply's routed card set under `sai/commands/apply/` — coordinator.md + runner.md + invocation.md + worker contracts, with runner.md extracted from the current instructions.md; declares the per-dispatch apply progress plan and documents the multi-dispatch carve-out from command-runner's single-dispatch rule.
- `apply-red-green-worker-model`: two worker-matrix entries (`sai-4-red-worker`, `sai-4-green-worker`) on the budget tier with projected bindings and agent files for both harnesses.
- `apply-step-routing-tree`: the five-shape decision tree (GREEN direct; non-testable green-exception; contract-absent STOP; blind RED → GREEN; RED green-exception).
- `apply-same-worker-retry`: validation failure continues the same GREEN worker session (cap 3), never a fresh dispatch; escalation to the human after the cap.
- `apply-coordinator-ownership`: validation, `changed_files` union, human gates, and commit stay in the coordinator (main session).
- `apply-boot-rerouting`: both harness boot adapters select the apply coordinator card instead of the utility body card.
- `apply-taxonomy-reclassification`: AGENTS.md / README reclassify apply from utility card to routed.

### Modified Capabilities

- `apply`: Step dispatch moves from the budget-subagent skill binding to the managed RED/GREEN worker bindings.
- `apply-test-impl-split`: the two-dispatch flow becomes RED worker + GREEN worker; contract-absent Steps STOP; production-free Steps route to the RED green-exception.
- `apply-step-delegation`: the traced fall-back shapes are replaced by the decision tree; dispatch kinds are renamed to the RED/GREEN workers.
- `apply-step-projection`: the "apply has no coordinator-worker boundary" rationale is replaced by the routed boundary; the projection remains coordinator-derived, is never marked from worker progress events, and is distinct from the per-dispatch apply progress plan.
- `apply-coordinator-verification`: Known-False Report Recovery's fresh Recovery Dispatch is replaced by same-worker continuation (cap 3).
- `apply-subagent-report-contract`: the 9-field report is preserved and delivered through a phase-defined extension of the worker lifecycle payload; dispatch-kind vocabulary updated.
- `apply-execution-telemetry-appendix`: the `dispatch` column vocabulary tracks the new dispatch kinds; the two-axis (dispatch × phase) distinction is preserved.
- `worker-matrix-collapse`: the matrix materializes the two apply dispatch workers in addition to the seven routed phases; builders and validators accept the new identities and contract paths.

## Impact

- `sai/commands/apply/` — new `coordinator.md`, `runner.md`, `invocation.md`, RED/GREEN worker contracts; `instructions.md` content redistributed into runner + worker contracts; `body.md` retired.
- `sai/adapters/claude/boot.md`, `sai/adapters/opencode/boot.md` — apply moves from the utility-name list to the routed-name list.
- `sai/install-manifest.json` — worker-matrix gains two entries; installed `sai/commands/apply/body.md` destination retired.
- `bin/worker-matrix.js` — `PHASE_ORDER` and the workerName/workerContract regexes extended to accept the two `sai-4-*` workers and their contract paths.
- `bin/install-manifest.js` — `PHASE_WORKER_IDENTITIES`/`PHASE_CONTRACT_DIRS`/`assertWorkerIdentity` extended; projection-id derivation supports two apply workers.
- `bin/install-flow.js` — worker roster/binding validation accepts 9 workers instead of 7.
- `sai/worker-core.md` — amended to admit the phase-adapter-defined apply report extension (the additive-extension mechanism the progress event already uses) so the RED/GREEN workers' 9-field report has a lifecycle-payload carrier; the neutral protocol gains no apply-specific field names.
- `AGENTS.md`, `README.md`, `GLOSSARY.md` — taxonomy and vocabulary updates.
- `openspec/specs/{apply,apply-test-impl-split,apply-step-delegation,apply-step-projection,apply-coordinator-verification,apply-subagent-report-contract,apply-execution-telemetry-appendix,worker-matrix-collapse}/spec.md` — modified requirements.
- `docs/ddr/0116-apply-phase-carries-no-progress-events.md` — superseded rationale (apply now has a coordinator-worker boundary).

## Proposal Research Documentation

**Local files**: `sai/commands/apply/instructions.md` (full, incl. lines 122-146 and 213-270), `sai/commands/apply/body.md`, `sai/commands/implement/coordinator.md`, `sai/commands/implement/worker.md`, `sai/commands/implement/invocation.md`, `sai/commands/spec/worker.md`, `sai/commands/spec/invocation.md`, `sai/command-runner.md`, `sai/worker-core.md`, `sai/adapters/claude/boot.md`, `sai/adapters/opencode/boot.md`, `sai/install-manifest.json` (worker-matrix block), `sai/orchestration/workers/bindings/claude/worker-template.md`, `agents/claude/worker-template.md`, `agents/claude/budget-explorer.md`, `bin/worker-matrix.js`, `bin/install-manifest.js` (matrix validation), `bin/install-flow.js` (roster validation), `openspec/specs/apply/spec.md`, `openspec/specs/apply-test-impl-split/spec.md`, `openspec/specs/apply-step-delegation/spec.md`, `openspec/specs/apply-step-projection/spec.md`, `openspec/specs/apply-coordinator-verification/spec.md`, `openspec/specs/apply-subagent-report-contract/spec.md`, `openspec/specs/apply-execution-telemetry-appendix/spec.md`, `openspec/specs/worker-matrix-collapse/spec.md`, `openspec/specs/command-runner-layout/spec.md`, `openspec/specs/source-layout/spec.md`, `openspec/specs/asymmetry-documentation/spec.md`, `openspec/specs/routed-contract-truth/spec.md`, `GLOSSARY.md`, `AGENTS.md`, `README.md`, `docs/ddr/0116-apply-phase-carries-no-progress-events.md`.

**External URLs**: none.

## Additional Notes

- **Matrix builder constraints discovered**: `bin/worker-matrix.js` currently freezes a 7-phase `PHASE_ORDER`, requires exactly 7 entries in order, and its workerName regex (`^sai-[1278]-[a-z-]+-worker$|...`) rejects `sai-4-*`; its workerContract regex (`^sai/commands/[a-z-]+/worker\.md$`) requires a single `worker.md` per phase folder. The two apply workers therefore require the matrix to accept a second worker per phase (or phase variants) and contract paths like `sai/commands/apply/red-worker.md` — the spec pins the outcome (two entries, bindings + agents, budget tier), not the mechanism.
- **Single-dispatch rule carve-out**: `sai/command-runner.md`'s result loop mandates "dispatch one worker" per invocation with at most one replacement. Apply's runner intentionally deviates: it dispatches one worker per Step (and a RED→GREEN pair per split Step) across the run, with up to 3 same-worker retries per Step. The carve-out is owned by `sai/commands/apply/runner.md` (the apply adapter declares per-dispatch `dispatch_operation`/`continuation_operation` and the multi-worker loop); `sai/command-runner.md` itself is NOT amended — the neutral contract keeps its single-dispatch rule for the worker-centric phases, and apply's runner.md documents the deviation.
- **Shared bounded recovery**: the baseline `sai/command-runner.md` now provides the shared bounded same-worker recovery pool (`recovery_policy: true`, exactly 3 attempts, `continue_after_recovery`, never a replacement). The change request's same-worker retry (cap 3, never fresh) maps onto this shared mechanism: the apply adapter declares `recovery_policy: true` and the coordinator-validation-failure retry rides the shared pool. The RED worker is never a retry target; RED-dispatch discrepancies halt for human intervention.
- **Budget tier**: Claude budget tier is the `haiku`/`low` seed of the `budget-*` generic agents; opencode's budget tier is the `budget`/`explore` agent model (currently `opencode-go/deepseek-v4-flash`). Exact model IDs stay user-tunable; the spec pins "budget tier", not model IDs.
- **DDR 0116** ("apply phase carries no progress events because it has no coordinator-worker boundary") is superseded by this change's routed boundary. The design phase should record a new decision record (ADR or DDR per the ordered routing test) and update the DDR index; this change's specs state the new behavior.
- **Overview language**: change-overview generation for this change shall use Spanish (`es`).
- The coordinator-centric execution model is retained deliberately: apply's value is the cheap main-session coordinator driving per-Step execution; only Step execution is delegated to managed workers.
