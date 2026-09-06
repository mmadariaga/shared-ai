<todo_structure_policy>

<!-- Format validator: Not applicable. This policy defines rendering behavior and state semantics that are coordinator-owned, not file format rules that can be statically validated. See the render and reconciliation rules in the policy body. -->

# Todo Structure Policy

Canonical policy for the progress task list rendered by routed SAI phases. Consumed by reference; never restated at a consuming surface.

## Scope

Governs the semantics of the progress task list for a routed phase whose adapter declares a `progress_plan`: the list structure, the step-state vocabulary, the deterministic state derivation, the rendering actions (render at dispatch, render on state-changing progress events, and reconcile at run-closing results), the minimum-threshold rule, and the emission-ownership invariant. A phase may separately declare a routing-only `step_pointer_map`; that map preserves just-in-time worker continuity and never creates a task list or milestone stamp. The merge command's adaptive TODO is a separate coordinator-owned surface governed by [Merge adaptive TODO](#merge-adaptive-todo), not a worker `progress_plan`. It does not govern per-harness tool mechanics — those stay in the harness bindings.

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

## Merge adaptive TODO

The `/sai-merge` adaptive TODO is a merge-local coordinator surface, not a
worker lifecycle extension and not the phase adapter's `progress_plan`. It is
allowed to be unknown at dispatch because the resolved merge path is not known
until the source branch is selected and the coordinator records the merge
outcome.

- The coordinator is the sole emitter; the worker emits no TODO or progress
  event.

### Canonical item identities and labels

Every item is an object with exactly `id`, `label`, and one of the policy's
`pending`, `in_progress`, or `completed` states. The coordinator stores the
ordered item ids in `adaptive_todo_steps` and the completed ids in
`adaptive_todo_marked`; the native binding receives the same ids and labels on
every full render. The canonical item set is:

| id | native label | inclusion |
| --- | --- | --- |
| `merge` | `Merge <source> into <target>` | Always after source-branch selection. |
| `scope` | `Select resolution scope` | A conflicted route when fast-track is inactive. |
| `contextual-analysis` | `Analyze conflict alternatives` | Every conflicted route after the conflict-triggered language hand-off and scope selection; it covers the complete global strategy, completes only after that strategy is confirmed, and stays active while semantic decisions or `more-context`/revision continuations are pending. |
| `resolve-artifacts` | `Resolve artifact conflicts` | A conflicted route whose selected scope is `artifacts`. |
| `resolve-code` | `Resolve code conflicts` | A conflicted route whose selected scope is `code`. |
| `resolve-full` | `Resolve all conflicts` | A conflicted route whose selected scope is `full`; fast-track selects this route directly. |
| `verification` | `Verify merge result` | Every selected conflict-resolution route after resolution staging. |
| `collision` | `Repair ADR/DDR collisions` | Only when collision applicability is `repair-required` or `escalation-required`. |
| `authorization` | `Authorize merge commit` | Once collision analysis, any required repairs, and final staging are complete. |

Item order is fixed: `merge`, optional `scope`, `contextual-analysis`, exactly
one applicable `resolve-*` item, optional `verification`, optional `collision`,
then `authorization`. Scope option labels and contextual decision options are
gate content, not TODO items. A renderer must not invent category-specific ids,
reorder items, or replace a canonical label with a question, summary, or worker
finding.

### Canonical route transitions

- **Before branch selection:** render no merge TODO. A stale merge surface may
  be cleared according to the active binding's ownership rules, but no item is
  synthesized.
- **After branch selection:** render `[~] Merge <source> into <target>` as
  `merge: in_progress`; no possible conflict item is present yet.
- **Clean route:** after a clean merge, mark `merge` `completed` and remove
  `scope`, every `resolve-*` item, and `verification`. Wait for the collision
  result. For `not-applicable` or `no-collision`, add `authorization` as
  `in_progress`; for `repair-required` or `escalation-required`, add
  `collision` as `in_progress` first, mark it `completed` after all owned
  repairs and reference updates, then add `authorization` as `in_progress`.
- **Conflicted non-fast-track route:** after the conflict outcome, the
  coordinator performs the language hand-off before exposing semantic analysis
  or the scope gate. The language is invocation state, not a TODO item. Then
  keep `merge: completed`, add `scope: in_progress`, add
  `contextual-analysis: pending`, and add the applicable `resolve-*` item as
  `pending`. When the exact scope answer is forwarded, mark `scope`
  `completed` and make `contextual-analysis` `in_progress`; the resolution item
  remains pending until the user confirms the complete global strategy and the
  contextual stage returns matching complete alternatives.
- **Conflicted fast-track route:** omit `scope`, mark `merge` `completed`, and
  make `contextual-analysis` `in_progress` with `resolve-full` pending.
  Fast-track changes only the scope item; it never bypasses a contextual human
  decision. Verification, collision applicability, authorization, refusal, and
  terminal transitions remain identical.
- **Contextual analysis:** for an obvious conflict, keep
  `contextual-analysis` `in_progress` while the worker's deterministic outcome
  is presented as part of the complete global strategy; mark it `completed`
  only after the user confirms that strategy and the worker returns the
  matching payload, then make the applicable `resolve-*` item `in_progress`.
  For a semantic ambiguity, leave `contextual-analysis` `in_progress` through
  every strategy confirmation, `needs_input`, `more-context`, and open revision
  continuation. After every required `ours`, `theirs`, or `synthesis` decision
  is explicit, the global strategy is confirmed, and the worker returns the
  matching complete marker-free alternatives, mark it `completed` and make the
  applicable `resolve-*` item `in_progress`. A new conflict or inconsistency
  from application or verification returns the item to `in_progress` with the
  same worker and selected language; no language question is repeated.
  No TODO transition authorizes a write or stage.
- **Resolution and verification:** after coordinator resolution writes and
  staging, mark the applicable `resolve-*` item `completed` and make
  `verification` `in_progress`. Mark `verification` `completed` when the
  suite passes, the no-suite decision completes, or the three-round cap is
  reached; failed/cap-exhausted evidence remains in merge state and does not
  imply a commit.
- **Collision route:** after the ADR/DDR pass, omit `collision` for
  `not-applicable` or `no-collision`. When repairs or manual escalations apply,
  make `collision` `in_progress` only after the pass result is known, and mark
  it `completed` only after every coordinator-owned rename and canonical
  reference update has finished. Escalations remain in the summary and do not
  create extra TODO ids.
- **Authorization and refusal:** add `authorization` only after final staging
  is complete and make it `in_progress` while the native picker is pending. On
  `yes`, mark it `completed` only after the commit succeeds. On `no`, remove
  and clear it rather than marking a commit complete; preserve the exact
  refusal repository-state summary.
- **Terminal closure:** after recording the final worker result, clear the
  merge-owned TODO surface. A successful commit retains the completed state
  until this clear; a refusal or any other non-committing terminal never leaves
  an actionable authorization item.

The list uses the same `pending`, `in_progress`, and `completed` state
vocabulary and coordinator-owned full-list rendering discipline. Its state
never authorizes a mutation and it never changes worker continuation or
verification-round ownership. The active harness binding owns task-list
mechanics, and the adaptive TODO receives no milestone stamps.

### Panel ownership

The merge TODO claims exclusive ownership of the active native task surface on
its first full render. Marker-based cleanup is limited to stale entries bearing
`sai-merge-todo` before that claim; it does not promise preservation of a
foreign surface. Once claimed, the binding's full-list convergence may
intentionally displace foreign entries, and no restoration is attempted at
terminal closure. The coordinator must describe this as exclusive ownership,
not marker-only isolation.

## Apply step projection

The **apply step projection** — the task list `/sai-4-apply` renders at run start from the `#### Step N:` headings of `openspec/changes/{change-name}/implementation.md` — is a governed surface of this policy. The list structure (one entry per planned step, stable id + label), the state vocabulary (`pending` / `in_progress` / `completed`), the deterministic derivation (plan order + on-disk marked set), the minimum-threshold rule, and the emission-ownership invariant apply to the projection unchanged. Consuming surfaces such as `sai/commands/apply/instructions.md` reference this policy and never restate the threshold constant.

## Single-source reference rule

Consuming surfaces reference this policy as `@sai/policies/todo-structure.md` and SHALL NOT restate or redefine the list structure, state vocabulary, derivation, threshold constant, or ownership invariant inline.

</todo_structure_policy>
