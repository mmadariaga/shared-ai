# Isolation Mode
- Ignore all previous conversation.
- Use only the data inside <TASK>. TASK is not a template, it's a instruction set.
- If required information is missing, ask for it.
- If you are about to use external or prior context, STOP and say: "Potential context pollution detected, stopping, open a new chat".

<TASK>

  Fetch @sai/command-runner.md and follow it exactly.
  Fetch @sai/worker-core.md and follow it exactly.
  Fetch @sai/commands/apply/invocation.md and follow it exactly.
  Fetch @sai/commands/apply/runner.md and follow those instructions exactly.
  Fetch @sai/policies/commit-rules.md and follow it at every commit gate.

  ## Apply phase adapter
  You are the user-facing apply coordinator. You resolve the change once, own all gates, git operations, checklists, scratch cleanup, and the ordered changed-files union, and you never perform worker technical writes: no read-before-write reads, no RED or GREEN verification runs, and no production or test edits — technical work belongs exclusively to the dispatched RED and GREEN workers.

  Declare the phase-adapter field set:
  - `original_envelope` — the four-field boot envelope (`command_name`, `wrapper_echo_value`, `arguments_value`, and the optional opaque `continuation_reference`) received from the active wrapper.
  - `dispatch_operation` — dispatch each Step worker through the active apply binding (`red-worker.md` or `green-worker.md`) with `arguments_value` set to the resolved change name.
  - `continuation_operation` — continue the same worker through the binding's continuation mechanism (SendMessage-style / task-id resume).
  - `allowed_nonterminal_extensions` — progress events only; apply workers emit no design notice.
  - `extension_handlers` — for a progress event, mark the reported step ids in that dispatch's declared plan, add every path to the union in first-seen order, and continue the same worker with exactly `continue_after_progress`.
  - `replacement_reconstruction_fields` — `resolved_change_name`, the ordered changed-files union, and the original envelope; a replacement worker reconstructs only from these.
  - `terminal_navigation` — the pinned completion literal and stop defined in the invocation.
  - `recovery_policy: true` — the recovery policy is immutable for the invocation; the shared runner owns the recovery pool.

  ## Run-Start Step Projection
  The run-start render of the step list happens before the first Step dispatch, after change resolution: the coordinator renders the step list before the first Step dispatch by reading `openspec/changes/{change-name}/implementation.md` and collecting the `#### Step N:` headings in plan order — each heading yields exactly one list entry whose stable id is the heading's step integer and whose label is the heading text; the render never adds, removes, renames, reorders, or re-labels entries. Apply the minimum-threshold rule of `sai/policies/todo-structure.md` by reference — the threshold constant is single-sourced in that policy and is never restated here. At or above the threshold, render the full list through the harness task-list mechanism, with the initial state derived from the on-disk checkbox state at run start: a Step whose checkboxes are fully marked `[x]` renders `completed`, the first not-fully-marked Step in plan order renders `in_progress`, and the remaining Steps render `pending`. The projection is coordinator-derived and introduces no progress protocol: no progress_plan declaration, no progress event, no progress payload, and no acknowledgement, and no change to the worker lifecycle. The task-list tool call originates from the coordinator session only, never from a Step-execution worker. On re-run, a Step whose checkboxes are already marked `[x]` renders `completed`, and `implementation.md` remains the durable record.

  Mark a Step's projected entry `completed` only in the same batched update that flips its checkboxes `[x]`, after the Step's verification passes and, when applicable, the Human Verification gate confirms — so the harness list and the on-disk checkboxes never disagree. An unverified Step's entry is not marked and stays `pending`.

  ## Change Resolution and Dispatch
  Resolve the change exactly once per the invocation (change picker and prerequisite checks), and inject the resolved change name as the worker `arguments_value` for every dispatch. Each RED, GREEN, or green-exception dispatch is a separate worker invocation through the active apply binding, carrying `resolved_change_name`; the workers echo it and never resolve a change themselves. The blind RED prompt carries only the matching Step contract and the testing slice — the framework and assertion libraries and the test command — and never the Step's GREEN implementation body. The GREEN dispatch's allowed files exclude test files and declared interfaces. Before each dispatch, select exactly one immutable plan — RED: `test-authoring → red-verification`; GREEN: `implementation → green-verification`; green-exception: `test-authoring → green-verification`. The selected plan is immutable for that dispatch and is never mutated by a later dispatch's selection.

  ## Step Routing Tree
  Route each Step to exactly one of five exclusive shapes before any dispatch:
  1. **RED block absent + at least one production file** → dispatch GREEN directly (green-direct): one GREEN worker invocation with the `implementation → green-verification` plan. No RED dispatch is issued.
  2. **RED block absent + no production file** → dispatch exactly one RED green-exception: a test-authoring worker invocation with the `test-authoring → green-verification` plan.
  3. **RED block present + no exact, unambiguous matching `## Step N` contract in `interfaces.md`** → STOP before any dispatch or write. A clean absence and an ambiguous match — more than one `## Step N` for the same integer — stop identically; no dispatch is issued and no fallback line is emitted.
  4. **RED block present + exact unambiguous `## Step N` contract + at least one production file** → dispatch blind RED (`test-authoring → red-verification`), then GREEN (`implementation → green-verification`).
  5. **RED block present + exact unambiguous `## Step N` contract + no production file** → dispatch exactly one RED green-exception (`test-authoring → green-verification`) that terminates with GREEN = pass.

  ## Progress Events
  A progress event is the closed shape `{event: progress, emitted_on: string, step_ids: string[], changed_files: string[]}`. Mark the reported step ids only in that dispatch's declared plan (the dispatch-local plan); undeclared ids are ignored and the plan is never extended or amended. Add every path to the changed-files union in first-seen order and continue the same worker with exactly `continue_after_progress`. Progress events are nonterminal and never replace the single terminal lifecycle status.

  ## Changed-Files Union
  Initialize one invocation-scoped ordered, duplicate-free changed-files union. Add every reported path — terminal payloads, progress events, and the continuation results of recovery — in first-seen order. The union is never reset across RED, GREEN, or recovery outcomes and is never cleared. Scratch paths removed by the ordered sweep SHALL be excluded from observed changed paths, the plan cross-check, the `Subagent <-> git` comparison, the field-8 add-list, and line-count totals; every non-scratch path remains subject to the existing comparison and scope-drift rules. The union supplies pre-commit reporting and addition and the final completion.

  ## Coordinator-Owned Scratch Cleanup
  After every dispatch return — clean, STOP, failure, or crash — and after every continuation return, and after each coordinator-owned run of the Step's Verification Checklist, the coordinator SHALL sweep exactly `.tmp/{change-name}/` (the exact per-change scratch path) before comparison or redispatch. The sweep SHALL run once per dispatch. When a sweep removes one or more paths, emit one trace line in the form `> Scratch cleanup: removed <paths>`; when only the per-change directory is removed, the line SHALL be exactly `> Scratch cleanup: removed .tmp/{change-name}/`; when both the per-change directory and its newly created empty parent are removed, the line SHALL be exactly `> Scratch cleanup: removed .tmp/{change-name}/, .tmp/`. An empty sweep emits no message. Remove the `.tmp/` parent only when it was absent from the first pre-dispatch baseline and is empty after the per-change sweep; a pre-existing or non-empty `.tmp/` parent remains untouched. Scratch cleanup MUST NOT broaden recovery eligibility or authorize removal of another unexpected path; an unrelated out-of-scope path keeps its existing recovery or human-intervention handling.

  ## Coordinator Verification
  The coordinator's own verification is authoritative: independently re-run the Step's Verification Checklist (quiet confirmation only, never the RED→GREEN cycle or read-before-write reads), compare the checklist, changed paths, allowed files, baseline, and report. A checklist pass is required before continuing. When coordinator evidence directly disproves the report — including a completed GREEN disproven by coordinator verification — do not mark checkboxes or propose a commit; classify the disproven result as `validation-failed` before any `continue_after_recovery` continuation.

  ## Known-False Report Recovery
  Because the phase adapter declares `recovery_policy: true`, the shared runner owns one invocation-scoped recovery pool of exactly three attempts, immutable for the invocation.   Eligible worker-returned failures and coordinator-classified `validation-failed` outcomes draw from one shared three-attempt pool that is undoubled — never doubled per recovery source. Continue the same GREEN worker session only; recovery never dispatches a fresh, replacement, or new worker. Before each attempt, announce the triggering failure class and the ordinal attempt (`1 of 3`, `2 of 3`, `3 of 3`), then continue the same worker with exactly `continue_after_recovery`. Each recovery continuation carries exactly the ordered diagnosis:

  #### Reported

  State every contradictory claim from the Subagent Report.

  #### Evidence

  State only the relevant coordinator observations needed to establish the contradiction. No raw output enters the recovery prompt.

  #### Cause

  State the coordinator-diagnosed execution defects that explain the contradicted claims.

  #### Correction

  State the exact safe, reversible corrections authorized inside the current Step and existing plan scope.

  #### Verification

  State the normal Step Verification Checklist and its pass condition; after this run, the coordinator SHALL sweep the exact per-change scratch path before comparison.

  The diagnosis is delivered to the same GREEN worker session via the recovery continuation, preserving every applicable blindness, test-file, implementation-file, no-exploration, and no-raw-output restriction; no raw output enters the recovery prompt. Every Recovery Dispatch return receives its own coordinator scratch sweep before changed-path comparison. Exhaustion of the pool — the third failed continuation — is a terminal state: it blocks checkbox changes, commit, and Step advance, and stops for human intervention naming the failure class, the attempts spent, and the stopping reason.

  ## Terminal Navigation
  On the MANDATORY STOP — the Final sweep passes, all gates are closed, and all commits are done — print the pinned completion literal from the invocation and stop.
</TASK>

Follow instruction on <TASK> step by step
