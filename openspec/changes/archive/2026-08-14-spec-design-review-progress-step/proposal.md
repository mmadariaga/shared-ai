**Complexity**: high

## Why

`/sai-1-spec` and `/sai-2-design` each spend most of their runtime inside a single coarse progress step (`proposal-and-specs`, `artifacts`), so the task panel sits frozen on one line while the bulk of the work happens and tells the user nothing. Making each artifact write visible turns the panel into a real progress signal, and adding a final `review` step that is marked only by evidence of a review pass finding nothing `High` means a successful close leaves that step unmarked when no completed pass produced `High=0`. Failed or cancelled closes freeze the whole list instead and may leave several steps incomplete.

## What Changes

- **BREAKING** Reshape the `/sai-1-spec` progress plan from three steps (`prereqs-resolution`, `proposal-and-specs`, `verification-summary`) to five: `prereqs-and-change`, `proposal`, `specs`, `validation`, `review`. Step ids and labels change; the plan is declared in both `sai/commands/spec/coordinator.md` and `sai/commands/spec/worker.md`, and those two declaration blocks must stay byte-identical to each other in the files' existing list rendering (the specs render the plans as indented `id: "label"` blocks purely to fix ids and labels, not as the on-file form).
- **BREAKING** Reshape the `/sai-2-design` progress plan from four steps (`prereqs-resolution`, `specs-approval`, `research`, `artifacts`) to seven: `prereqs-resolution` (with the specs approval gate folded in), `research`, `design`, `tasks`, `interfaces`, `review`, `overview`. The standalone `specs-approval` step is removed.
- Move both plans' labels to imperative form (`Write design.md`, `Review artifacts`), replacing the current nominal labels.
- Introduce a worker-owned automated artifact review in both phases: for each pass the worker creates one fresh isolated reviewer that returns findings under the shared review finding contract, then processes every finding itself. The reviewer's input is exactly a freshly read **reviewed set** (the artifacts this phase authored) plus a read-only **reference set** supplying intent and constraints — the verbatim resolved request for sai-1, and `proposal.md` plus `specs/**` for sai-2 — and findings may target only the reviewed set.
- Mark the `review` step only by evidence: a completed pass reporting `High=0` marks it; `Medium` and `Low` findings never block. An attempt whose reviewer fails, is cancelled, or violates the severity contract completes no pass and therefore produces no marking evidence.
- Govern the automatic loop with two distinctly named counters, never one shared word: a **completed-pass count** capped at 3, incremented only by a pass whose reviewer returned a valid finding set (possibly empty), and a **total-attempt count** capped at 6, incremented by every reviewer dispatch. A failed, cancelled, or contract-violating attempt increments only the total-attempt count and does **not** end the loop — the worker dispatches a fresh reviewer and retries. The loop ends at convergence (`High=0`), completed-pass-cap exhaustion, or total-attempt-cap exhaustion; the last two are non-failure. At either cap, `review` remains unmarked, and the report distinguishes outstanding `High` findings from reviewer failures.
- Let the user request further passes from the coordinator-owned prose feedback gate without limit; neither cap applies to those.
- Carve the evidence-marked `review` step out of reconciliation: on a successful outcome the coordinator renders every unmarked step `completed` **except** `review`, which is left exactly as last rendered. The carve-out is scoped by the evidence-marked designation, not by the bare step id, so no other declared plan inherits it.
- Replace the ambiguous "run-closing result" with an observable **reconciliation trigger** per phase: for `/sai-1-spec` the feedback gate's `Finish step` selection, at which the coordinator reconciles against the last terminal `completed` it received; for `/sai-2-design` the post-gate overview-generation terminal. A pre-gate `completed` never reconciles, so `overview` is never rendered `completed` before generation has run.
- Order the review pass after the phase's pre-completion verification and decision-summary derivation, so `review` always follows `validation` (sai-1) and `interfaces` (sai-2).
- Permit both the spec worker and the design worker to emit a progress event during a feedback turn when — and only when — that turn ran a review pass reporting `High=0`; the event carries `review` and no other step id.

## Capabilities

### New Capabilities

- `planning-artifact-review-loop`: the worker-owned automated artifact review for the spec and design phases — the fresh isolated reviewer per pass, its read-only input set, the finding contract reuse, the completed-pass cap of 3, the total-attempt cap of 6, the user-requested extra passes, and the distinct handling of reviewer failure, cancellation, and severity-contract violation.
- `review-step-evidence-marking`: the evidence rule that marks the `review` progress step only from a completed pass reporting `High=0`, the monotonicity of every progress mark, and the successful-reconciliation carve-out that leaves `review` unmarked.

### Modified Capabilities

- `spec-progress-plan`: the declared spec plan becomes five ordered steps with imperative labels; the phase-sequence correspondence requirement is rewritten against the new steps.
- `spec-proposal-worker`: the worker enumerates and reports the five new step ids, reports one batch per artifact write, and gains the feedback-turn carve-out for a `review`-marking progress event.
- `design-coordinator`: the design adapter declares seven ordered steps with imperative labels instead of four.
- `design-planning-worker`: the worker enumerates and reports the seven new step ids, including the folded specs-approval gate, the per-artifact batches, the review batch, and the overview batch.
- `coordinator-progress-ownership`: phase-specific observable reconciliation triggers replace the ambiguous run-closing-result formulation, and successful reconciliation excludes the evidence-marked `review` step from the steps it renders `completed`.
- `spec-coordinator`: the requirement and scenario that restate the reconciliation rule inline are amended to carry the `review` carve-out and make the feedback gate's `Finish step` proceed selection the `/sai-1-spec` reconciliation trigger against the last terminal `completed`.

## Impact

Affected instruction and policy surfaces:

- `sai/commands/spec/coordinator.md` — the declared plan (currently lines 20-25) **and** the inline reconciliation sentence at line 26, which today restates `completed` renders every unmarked step `completed` unconditionally and must carry the `review` carve-out
- `sai/commands/spec/worker.md` — `## Progress Reporting` (currently lines 13-30) and the review loop's place in `## Spec Work`
- `sai/commands/design/coordinator.md` — the declared plan (currently lines 19-25) **and** the inline reconciliation sentence at line 26, which needs the same carve-out plus the statement that the post-gate generation terminal is the reconciliation trigger
- `sai/commands/design/worker.md` — `## Progress Reporting` (currently lines 37-55) and the overview-generation section
- `sai/policies/todo-structure.md` — the single reconciliation clause in `## Rendering actions`
- `sai/policies/artifact-review-contract.md` — its opening sentence enumerates the surfaces bound by the contract ("the manual `sai-explore` post-crystallization review loop and the supervised pipeline's independent spec- and design-artifact reviewers"); the worker-owned planning review loop is added to that enumeration. This is a one-line, semantics-preserving edit: the severity vocabulary, finding shape, identifier scheme, and tally form are unchanged, and the `review-finding-format` capability that owns them normatively is not modified

Every surface that restates the reconciliation rule must be amended together; leaving any one of the three unconditioned would contradict the carve-out at exactly the surface that executes it.

Explicitly not touched: the normative body of `sai/policies/artifact-review-contract.md` beyond the surface enumeration above, `sai/policies/artifact-feedback-gate.md`, `sai/commands/explore/instructions.md`, `sai/commands/implement/*`, the four audit progress plans, and the `/sai-4-apply` step projection.

No code, dependency, or configuration change; the surfaces above are agent instruction files.

## Proposal Research Documentation

**Local files**:

- `sai/policies/todo-structure.md`
- `sai/policies/artifact-review-contract.md`
- `sai/policies/artifact-feedback-gate.md`
- `sai/policies/question-context.md`
- `sai/commands/spec/coordinator.md`
- `sai/commands/spec/worker.md`
- `sai/commands/spec/invocation.md`
- `sai/commands/spec/instructions.md`
- `sai/commands/design/coordinator.md`
- `sai/commands/design/worker.md`
- `sai/commands/explore/instructions.md` (lines 255-334)
- `sai/worker-core.md`
- `openspec/specs/spec-progress-plan/spec.md`
- `openspec/specs/spec-proposal-worker/spec.md`
- `openspec/specs/spec-coordinator/spec.md`
- `openspec/specs/design-coordinator/spec.md`
- `openspec/specs/design-planning-worker/spec.md`
- `openspec/specs/coordinator-progress-ownership/spec.md`
- `openspec/specs/progress-plan-declaration/spec.md`
- `openspec/specs/progress-event-lifecycle/spec.md`
- `openspec/specs/pipeline-independent-review/spec.md`
- `openspec/specs/pipeline-convergence-loop/spec.md`
- `openspec/specs/pipeline-iteration-bound/spec.md`
- `openspec/specs/explore-review-evidence-marking/spec.md`
- `openspec/specs/sai-todo-timestamps/spec.md`
- `GLOSSARY.md`

**External URLs**: None.

## Authorized Decisions

Decisions the user was asked about and answered. They are recorded here as decided, not as open options.

1. **Two-counter automatic loop.** The automatic review loop is capped by a completed-pass count (max 3) and a total-attempt count (max 6). A failed, cancelled, or contract-violating attempt increments only the total-attempt count, does not complete a pass, and does not end the loop — the worker retries with a fresh reviewer. The three end states are convergence, completed-pass-cap exhaustion, and total-attempt-cap exhaustion, the last two both non-failure.
2. **Empty spec-phase reference set is acceptable.** For an ordinary `/sai-1-spec my-change` the reference set is empty. The intent-coverage axis then does not apply, the pass still counts as a full completed pass, and it may mark `review` on `High=0`.
3. **The spec-phase reference set may carry verbatim envelope text.** The resolved request the worker received is admitted as read-only reference input. It is not "the conversation" for this purpose: it is the invocation's own closed input, one of the two strings the worker itself received, fixed before the run began and carrying no turn history, no reasoning, and no later answers. The prohibition on the conversation, the worker's reasoning and journal, and prior reviewer state is unchanged.

## Accepted Trade-offs

- **Supervised runs pay for two review loops.** Under `start-pipeline` the worker-owned loop runs in addition to explore's independent convergence loop, which is left unchanged. In the worst case for one supervised spec run, the worker-owned layer dispatches 6 total attempts to obtain at most 3 completed passes, then the unchanged supervised layer dispatches its 3 passes: up to 9 reviewer dispatches over the same artifacts where today there are 3. The duplication is explicitly accepted rather than resolved because suppressing the worker-owned loop under supervision would make the worker's behavior depend on its caller, which the routed contract deliberately avoids.
- **Every standalone run now pays for a review loop** that today only supervised runs pay for, costing at least one reviewer dispatch per `/sai-1-spec` and `/sai-2-design` invocation.
- **Six additional `continue_after_progress` round trips** across the two commands.
- **The panel is fully green during the prose feedback gate**; this change does not solve the "waiting on you" blindness.
- **`sai-3-implement` keeps its nominal labels**, leaving a temporary style asymmetry.

## Additional Notes

- **Unresolved repository state in this change directory — reported, not acted on.** `openspec/changes/spec-design-review-progress-step/spec-design-review-progress-step/` is a second, complete change directory nested inside this one. It carries its own `.openspec.yaml` (with a `approval.specs.approved_at` timestamp this change directory does not have), its own `proposal.md`, `design.md`, `tasks.md`, `interfaces.md`, and its own `specs/` naming a different capability set for the same idea — `worker-owned-artifact-review`, `todo-structure-policy`, `artifact-feedback-gate`, alongside overlapping `spec-progress-plan`, `spec-proposal-worker`, `spec-coordinator`, `design-coordinator`, `design-planning-worker`, `coordinator-progress-ownership`. It appears to be a parallel attempt at this same change that was written into the wrong directory. Separately, `design.md`, `tasks.md`, and `interfaces.md` also exist at this change's own root although the spec phase does not author them. Nothing in either set was created, modified, or deleted by this proposal, and neither is part of this change's capability set. Both need resolving — deduplicating against this change and removing whichever directory is spurious — before this change is implemented or archived, because `openspec` artifact resolution and the archive flow assume one change per directory.
- The two plans deliberately keep different first-step ids: spec uses `prereqs-and-change`, design keeps `prereqs-resolution` (because it now also absorbs the specs approval gate). Step ids are per-phase canonical, so no cross-phase uniformity is required.
- The deterministic state derivation of `sai/policies/todo-structure.md` is untouched. Because `review` sits at position 6 of 7 in the design plan, a run that marks `overview` but not `review` renders `review` as `in_progress` (first unmarked in plan order), not `pending` — that is the existing derivation, not a new rule.
- The `review` step is marked by the worker through an ordinary progress event, so no second marking source is introduced. Only the trigger-time successful-reconciliation clause needs a carve-out.
- `sai/policies/artifact-review-contract.md` already scopes itself to artifact review of `proposal.md`/`specs/**` (sai-1) and `design.md`/`tasks.md`/`interfaces.md` (sai-2). The new worker-owned reviewer reuses it by reference; no severity vocabulary, finding shape, identifier scheme, or tally form is restated. Its opening surface enumeration is the one line that must grow to name the new surface, so the policy does not go stale; the `review-finding-format` capability enumerates no exhaustive surface list of its own and therefore needs no delta.
- The supervised `start-pipeline` flow declares no progress plan, so no list renders there and marking has no application; explore's own independent review convergence loop (`pipeline-independent-review`, `pipeline-convergence-loop`) is unchanged and continues to run in addition to the worker-owned pass.
- The worker-owned caps and `pipeline-iteration-bound` are deliberately not identical and do not conflict because they govern different loops. The worker-owned layer permits at most 3 completed passes within 6 total attempts and retries failed, cancelled, or contract-violating attempts while the total-attempt cap permits. The unchanged supervised pipeline counts at most 3 completed review passes under `pipeline-iteration-bound`.
- `sai/policies/artifact-feedback-gate.md`'s `MachineFeedbackAdapter` is explore-owned and stays as is; the worker-owned loop processes its own findings directly rather than through that adapter.
- `sai-todo-timestamps` already stamps only "every step reconciled by that single update", so a `review` step the reconciliation skips receives no closure stamp without amending that capability.
- The design plan's `overview` step corresponds to the existing worker-owned `change-overview.md` generation, which already runs after the feedback gate's `Continue`; adding the step makes that phase visible without changing its lifecycle.
