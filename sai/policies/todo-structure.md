<todo_structure_policy>

# Todo Structure Policy

Canonical policy for the progress task list rendered by routed SAI phases. Consumed by reference; never restated at a consuming surface.

## Scope

Governs the semantics of the progress task list for a routed phase whose adapter declares a `progress_plan`: the list structure, the step-state vocabulary, the deterministic state derivation, the rendering actions (render at dispatch, reconcile at run-closing results), the minimum-threshold rule, and the emission-ownership invariant. It does not govern per-harness tool mechanics — those stay in the harness bindings.

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

- **Render at dispatch**: when an invocation begins with a declared plan, render the full list before the first worker result, applying the deterministic derivation with an empty marked set (first step `in_progress`, rest `pending`).
- **Reconcile at run-closing results**: on `completed`, render every unmarked step `completed`; on `failed` or `cancelled`, leave the list exactly as last rendered; a `needs_input` result leaves the list exactly as last rendered (the run pauses for user input and resumes).

## Minimum-threshold rule

A declared progress plan with **fewer than three** progress steps SHALL NOT be rendered as a task list on either harness: below the threshold the policy renders no task list — no list at all. The coordinator still processes progress events normally — marks steps, unions changed files, acknowledges — but suppresses the list entirely. At or above the threshold, a plan of **three or more** steps renders as a task list normally. This constant lives only in this policy; consuming surfaces reference the policy and never restate the value.

## Emission-ownership invariant

The task-list tool call originates exclusively from the coordinator session, never from a worker subagent: opencode disables `todowrite` for subagents by default and the worker runs as a subagent, so moving emission to the worker breaks opencode support.

## Milestone stamp annotation

The milestone stamp is a decorative rendering action: an HH:mm wall-clock annotation that decorates a rendered step of a progress task list without changing its stable id, user-facing label, plan order, or derived state. The annotation carve-out does not weaken the no-re-labelling rule for any other surface — no step of any progress task list is added, removed, renamed, reordered, or re-labelled by rendering, stamp annotation included. Stamps attach only to the progress task lists of the three routed planning phases whose adapters declare a progress plan (spec, design, implement); the review, security, performance, and accessibility audit progress plans, the `sai-explore` Idea Progress List, and the apply step projection carry no stamps.

Stamping follows the render acts. The first render (render at dispatch) attaches the current wall-clock time as the start stamp of the first `in_progress` step; each progress-event update attaches one shared closure stamp to every step the event marks `completed` and inherits that same value as the start stamp of the leading unmarked step; the run-closing `completed` reconciliation attaches one shared closure stamp to every step it marks. `needs_input`, `failed`, and `cancelled` leave the list and its stamps exactly as last rendered, with no stamping call; pause time is absorbed into the next closure stamp.

The coordinator acquires each stamp with at most one wall-clock shell call per render act — the first render, each progress-event update, and the run-closing `completed` reconciliation — and never with per-step calls; a reconciliation that stamps nothing issues no call. Transitive start inheritance covers the whole list, so a plan of N steps is fully annotated in at most N+1 shell calls.

Stamp acquisition and attachment originate exclusively from the coordinator session, never from a worker subagent, extending the emission-ownership invariant to stamp acquisition. Per-harness wall-clock commands are named by the harness bindings, never by this policy.

## Apply step projection

The **apply step projection** — the task list `/sai-4-apply` renders at run start from the `#### Step N:` headings of `openspec/changes/{change-name}/implementation.md` — is a governed surface of this policy. The list structure (one entry per planned step, stable id + label), the state vocabulary (`pending` / `in_progress` / `completed`), the deterministic derivation (plan order + on-disk marked set), the minimum-threshold rule, and the emission-ownership invariant apply to the projection unchanged. Consuming surfaces such as `sai/instructions/apply.md` reference this policy and never restate the threshold constant.

## Single-source reference rule

Consuming surfaces reference this policy as `@sai/policies/todo-structure.md` and SHALL NOT restate or redefine the list structure, state vocabulary, derivation, threshold constant, or ownership invariant inline.

</todo_structure_policy>
