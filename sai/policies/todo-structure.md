<todo_structure_policy>

# Todo Structure Policy

Canonical policy for the progress task list rendered by routed SAI phases. Consumed by reference; never restated at a consuming surface.

## Scope

Governs the semantics of the progress task list for a routed phase whose adapter declares a `progress_plan`: the list structure, the step-state vocabulary, the deterministic state derivation, the rendering actions (render at dispatch, render on state-changing progress events, and reconcile at run-closing results), the minimum-threshold rule, and the emission-ownership invariant. It does not govern per-harness tool mechanics — those stay in the harness bindings.

## List structure

A progress task list is an ordered list of progress steps, each carrying a stable `id` and a user-facing `label`. The list reflects the declared progress plan exactly: no step is added, removed, renamed, reordered, or re-labelled by rendering.

## State vocabulary

Each rendered step carries exactly one of three states:

- `pending` — the step has not started
- `in_progress` — the step is the current active step
- `completed` — the step is marked done

## Deterministic state derivation

Rendered state is a pure function of plan order plus the marked set (the step ids reported by worker progress events):

- A step whose id is in the marked set renders `completed`.
- The first step in plan order whose id is not in the marked set renders `in_progress`.
- Every remaining step renders `pending`.
- When every step is marked, all steps render `completed`; when none is marked, the first step renders `in_progress`.

Plan order governs, never batch contiguity, batch order, or event arrival order.

## Rendering actions

- **Render at dispatch**: when an invocation begins with a declared plan, render the full list applying the deterministic derivation with an empty marked set (first step `in_progress`, rest `pending`). The render precedes the dispatch call itself, not merely the first worker result: a dispatch that blocks until the worker returns leaves no opportunity to render afterwards, so a list rendered after the dispatch is a defect, not a late success.
- **Re-render on progress (state-changing progress event)**: when a worker progress event reports at least one previously unmarked id declared in the plan, first apply the marks and the `changed_files` union, then apply the deterministic derivation and re-render the full list before resuming the worker. The re-render is what makes the list track a long-running phase; deferring it to the run-closing reconciliation collapses every intermediate state into one update at the end. A progress event whose ids are all undeclared or already marked changes no marked state, so it performs no render and stamps nothing.
- **Reconcile at the phase's reconciliation trigger**: the trigger is phase-defined rather than inferred from an already-consumed terminal result. For `/sai-1-spec`, it is the artifact feedback gate's `Finish step` selection, reconciled against the last terminal `completed`; for `/sai-2-design`, the trigger is dual and mutually exclusive: when raw `--overview-lang` token presence opts in, it is the post-gate overview-generation terminal; when the token is absent, it is the post-gate no-generation design terminal. For a phase with no later worker work, it is that phase's run-closing result. A pre-gate `completed` does not reconcile. On a successful trigger, render every unmarked step `completed` except the evidence-marked step, which is left exactly as last rendered and otherwise unchanged. The evidence-marked carve-out is scoped to the `review` step of the spec and design progress plans; a bare `review` id in any other plan does not inherit the carve-out and is reconciled to `completed` normally. Reconciliation never marks the `review` step without a worker progress event carrying review evidence, and an evidence-marked `review` step remains `completed` through later edits and High findings — it does not regress. On `failed` or `cancelled`, reconciliation preserves the rendered list exactly as last rendered. A `needs_input` result is never a reconciliation trigger and leaves the list exactly as last rendered while the run pauses and resumes. Reconciliation changes rendering only; it never adds a progress mark, changes deterministic state derivation, changes the state vocabulary, changes the minimum-threshold rule, or changes the stamp rules.

## Minimum-threshold rule

A declared progress plan with **fewer than three** progress steps SHALL NOT be rendered as a task list on either harness: below the threshold the policy renders no task list — no list at all. The coordinator still processes progress events normally — marks steps, unions changed files, acknowledges — but suppresses the list entirely. At or above the threshold, a plan of **three or more** steps renders as a task list normally. This constant lives only in this policy; consuming surfaces reference the policy and never restate the value.

## Emission-ownership invariant

The task-list tool call originates exclusively from the coordinator session, never from a worker subagent: opencode disables `todowrite` for subagents by default and the worker runs as a subagent, so moving emission to the worker breaks opencode support.

## Milestone stamp annotation

The milestone stamp is a decorative rendering action: an HH:mm annotation that decorates a rendered step of a progress task list without changing its stable id, user-facing label, plan order, or derived state. The annotation carve-out does not weaken the no-re-labelling rule for any other surface — no step of any progress task list is added, removed, renamed, reordered, or re-labelled by rendering, stamp annotation included.

**Closure-only.** A step carries a stamp exactly when it renders `completed`, and it carries exactly one. A `pending` step and the `in_progress` step carry none: no start stamp, no inherited stamp, no placeholder. A step that gains its stamp keeps it unchanged for the rest of the invocation.

**Sourced from the payload, never from a clock.** The stamp value is the `emitted_on` of the worker result that marked the step, rendered as HH:mm. A state-changing progress-event update stamps every newly completed step that event marks with that event's `emitted_on`; a no-op progress event stamps nothing. The run-closing `completed` reconciliation stamps every step it marks with the terminal payload's `emitted_on`. The coordinator therefore issues **no wall-clock call of any kind** — not per step, not per render act, not per run — and never substitutes its own reading of the time for the value the worker authored. Each stamp reports when the worker finished the work, not when the coordinator got around to rendering it.

`emitted_on` already carries local wall-clock time with its numeric offset attached, so the stamp is the value's own `HH:MM` field read straight off it — no timezone resolution, no conversion, no fallback. The coordinator renders what the worker wrote and never alters the payload value, which is forwarded and recorded verbatim.

**Rendered form.** The stamp follows the step's user-facing label, separated by ` - `:

    [x] Check prerequisites and resolve the change - 10:51
    [x] Collapse implemented steps - 10:54
    [~] Analyze artifacts and validate decisions
    [ ] Review required documentation

**Scope.** Stamps attach to every routed phase progress task list whose steps are marked from worker progress events — the spec, design, and implement planning plans and the review, security, performance, and accessibility audit plans alike. The `sai-explore` Idea Progress List and the apply step projection carry no stamps: neither is marked from worker progress events, so neither has a payload to take a stamp value from. A plan suppressed by the minimum-threshold rule renders no list and therefore no stamps.

**Freeze.** `needs_input`, `failed`, and `cancelled` leave the list and its stamps exactly as last rendered: they add no stamp, change none, and clear none. Pause time is absorbed into the next stamp a step receives, because that stamp is the emitting worker's own instant.

Stamp attachment originates exclusively from the coordinator session, never from a worker subagent, extending the emission-ownership invariant to stamp attachment. The worker authors `emitted_on` as part of its closed payload; it never renders, attaches, or formats a stamp.

## Apply step projection

The **apply step projection** — the task list `/sai-4-apply` renders at run start from the `#### Step N:` headings of `openspec/changes/{change-name}/implementation.md` — is a governed surface of this policy. The list structure (one entry per planned step, stable id + label), the state vocabulary (`pending` / `in_progress` / `completed`), the deterministic derivation (plan order + on-disk marked set), the minimum-threshold rule, and the emission-ownership invariant apply to the projection unchanged. Consuming surfaces such as `sai/commands/apply/instructions.md` reference this policy and never restate the threshold constant.

## Single-source reference rule

Consuming surfaces reference this policy as `@sai/policies/todo-structure.md` and SHALL NOT restate or redefine the list structure, state vocabulary, derivation, threshold constant, or ownership invariant inline.

</todo_structure_policy>
