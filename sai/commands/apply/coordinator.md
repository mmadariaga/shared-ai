<TASK>

  Fetch @sai/commands/apply/invocation.md and follow it exactly.
  Fetch @sai/commands/apply/runner.md and follow those instructions exactly.
  Fetch @sai/policies/commit-rules.md and follow it at every commit gate.

  ## Apply phase adapter
  You are the user-facing apply coordinator. You resolve the change once, own all gates, git operations, checklists, scratch cleanup, and the ordered changed-files union, and you never perform worker technical writes: no read-before-write reads, no RED or GREEN verification runs, and no production or test edits — technical work belongs exclusively to the dispatched RED and GREEN workers.

  Declare the phase-adapter field set:
  - `original_envelope` — the opaque `arguments_value` request received from the active wrapper. The optional opaque `continuation_reference` remains binding-owned metadata outside the worker InvocationEnvelope.
  - `dispatch_operation` — dispatch each Step worker through the active apply binding (`red-worker.md` or `green-worker.md`) with `arguments_value` set to the resolved change name.
  - `continuation_operation` — continue the same worker through the binding's continuation mechanism (SendMessage-style / task-id resume).
  - `allowed_nonterminal_extensions` — progress events only; apply workers emit no design notice.
  - `extension_handlers` — for a progress event, mark the reported step ids in that dispatch's declared plan, add every path to the union in first-seen order, and continue the same worker with exactly `continue_after_progress`.
  - `replacement_reconstruction_fields` — `resolved_change_name`, the ordered changed-files union, and the original envelope; a replacement worker reconstructs only from these.
  - `terminal_navigation` — parameterized binding over two terminal actions; selection is positional:
    - sole adapter (direct `/sai-4-apply`) → shell-owned standalone completion action from `invocation.md` § Completion (exact pinned literal + stop)
    - final adapter in a multi-adapter sequence → same shell-owned standalone completion action
    - non-final adapter → composition-owned authorized transition only (do not print the standalone MANDATORY STOP message)
    Completion gates that decide whether the phase may finish remain unchanged; only which bound action runs after those gates succeed is parameterized.
  - `recovery_policy: true` — recovery policy is immutable for the active adapter segment; the shared runner owns the segment-scoped recovery pool (fresh three-attempt pool when this segment becomes active under composition).

  ## Run-Start Step Projection
  The run-start render of the step list happens before the first Step dispatch, after change resolution: the coordinator renders the step list before the first Step dispatch by reading `openspec/changes/{change-name}/implementation.md` and collecting the `#### Step N:` headings in plan order — each heading yields exactly one list entry whose stable id is the heading's step integer and whose label is the heading text; the render never adds, removes, renames, reorders, or re-labels entries. Apply the minimum-threshold rule of `sai/policies/todo-structure.md` by reference — the threshold constant is single-sourced in that policy and is never restated here. At or above the threshold, render the full list through the harness task-list mechanism, with the initial state derived from the on-disk checkbox state at run start: a Step whose checkboxes are fully marked `[x]` renders `completed`, the first not-fully-marked Step in plan order renders `in_progress`, and the remaining Steps render `pending`. If a declared panel tool is unavailable at runtime, apply the harness panel binding's one-time degradation route before the first Step dispatch: record its notice, disable later panel calls for this invocation, and continue without panel rendering; do not runtime-detect or switch surfaces. The projection is coordinator-derived and introduces no progress protocol: no progress_plan declaration, no progress event, no progress payload, and no acknowledgement, and no change to the worker lifecycle. The task-list tool call originates from the coordinator session only, never from a Step-execution worker. On re-run, a Step whose checkboxes are already marked `[x]` renders `completed`, and `implementation.md` remains the durable record.

  Mark a Step's projected entry `completed` only in the same batched update that flips its checkboxes `[x]`, after the Step's verification passes and, when applicable, the Human Verification gate confirms — so the harness list and the on-disk checkboxes never disagree. An unverified Step's entry is not marked and stays `pending`.

  ## Change Resolution and Dispatch
  Resolve the change exactly once per the invocation (change picker and prerequisite checks), and inject the resolved change name as the worker `arguments_value` for every dispatch. Each RED, GREEN, or green-exception dispatch is a separate worker invocation through the active apply binding, carrying `resolved_change_name`; the workers return it in post-resolution lifecycle payloads and never resolve a change themselves. The blind RED prompt carries only the matching Step contract and the testing slice — the framework and assertion libraries and the test command — and never the Step's GREEN implementation body. The GREEN dispatch's allowed files exclude test files and declared interfaces. Before each dispatch, select exactly one immutable plan per runner § Dispatch Plan Selection — RED: `test-authoring → red-verification`; GREEN: `implementation → green-verification`; green-exception: `test-authoring → green-verification`. The selected plan is immutable for that dispatch and is never mutated by a later dispatch's selection.

  ## Step Routing

  Route each Step through the Step Routing Tree defined as the sole normative home
  in `sai/commands/apply/runner.md` § Step Routing Tree (including the STOP when a
  RED block lacks an exact unambiguous `## Step N` contract in `interfaces.md`).
  Before each dispatch, select exactly one immutable plan per runner § Dispatch
  Plan Selection.

  ## Progress Events
  A progress event is the closed shape `{event: progress, emitted_on: string, step_ids: string[], changed_files: string[]}`. Mark the reported step ids only in that dispatch's declared plan (the dispatch-local plan); undeclared ids are ignored and the plan is never extended or amended. Add every path to the changed-files union in first-seen order and continue the same worker with exactly `continue_after_progress`. Progress events are nonterminal and never replace the single terminal lifecycle status.

  ## Changed-Files Union
  Initialize one invocation-scoped ordered, duplicate-free changed-files union. Add every reported path — terminal payloads, progress events, and the continuation results of recovery — in first-seen order. The union is never reset across RED, GREEN, or recovery outcomes and is never cleared. Scratch paths removed by the ordered sweep SHALL be excluded from observed changed paths, the plan cross-check, the `Subagent <-> git` comparison, the field-8 add-list, and line-count totals; every non-scratch path remains subject to the existing comparison and scope-drift rules. The union supplies pre-commit reporting and addition and the final completion.

  ## Coordinator-Owned Scratch Cleanup
  After every dispatch return — clean, STOP, failure, or crash — and after every continuation return, and after each coordinator-owned run of the Step's Verification Checklist, the coordinator SHALL sweep exactly `.tmp/{change-name}/` (the exact per-change scratch path) before comparison or redispatch. The sweep SHALL run once per dispatch. When a sweep removes one or more paths, emit one trace line in the form `> Scratch cleanup: removed <paths>`; when only the per-change directory is removed, the line SHALL be exactly `> Scratch cleanup: removed .tmp/{change-name}/`; when both the per-change directory and its newly created empty parent are removed, the line SHALL be exactly `> Scratch cleanup: removed .tmp/{change-name}/, .tmp/`. An empty sweep emits no message. Remove the `.tmp/` parent only when it was absent from the first pre-dispatch baseline and is empty after the per-change sweep; a pre-existing or non-empty `.tmp/` parent remains untouched. Scratch cleanup MUST NOT broaden recovery eligibility or authorize removal of another unexpected path; an unrelated out-of-scope path keeps its existing recovery or human-intervention handling.

  ## Coordinator Verification
  The coordinator's own verification is authoritative: independently re-run the Step's Verification Checklist (quiet confirmation only, never the RED→GREEN cycle or read-before-write reads), compare the checklist, changed paths, allowed files, baseline, and report. A checklist pass is required before continuing. When coordinator evidence directly disproves the report — including a completed GREEN disproven by coordinator verification — do not mark checkboxes or propose a commit; classify the disproven result as `validation-failed` before any `continue_after_recovery` continuation.

  ## Known-False Report Recovery
  This Known-False Report Recovery is enabled by `recovery_policy: true`: the shared runner owns one segment-scoped invocation recovery ledger with exactly three slots for distinct normalized diagnosis keys. The ledger is immutable within the active adapter segment, is shared by RED and GREEN dispatches, Steps, and report cycles, and is discarded only at the segment boundary; a newly active eligible composition segment receives a fresh ledger. The recovery ledger is not reset per Step, between Steps, or for a new report cycle. A slot is spent only by one same-worker recovery continuation for a new key, never by the failure source, failure class, Step, or report cycle. The pool is not doubled and is never reset within the segment.

  Recovery starts only after the final coordinator scratch sweep and the existing baseline, dispatch-kind allowed-file, observed changed-path, and Subagent Report comparisons have been completed. Inspect both the worker-authored result channel and the coordinator-observed channel before correction or eligibility. A non-clean closure receives exactly one routing diagnosis:

  - `continuation/transport loss` — the coordinator cannot receive or resume the expected same worker;
  - `coordinator rejection` — the coordinator rejects the result or continuation because its envelope, routing, or coordinator-owned contract evidence is invalid; or
  - `worker-authored failure` — the worker returned a closed failure or otherwise reported an execution failure through its worker channel.

  This is the Known-False branch: it diagnoses the non-clean closure before choosing a same-worker correction or an owner hand-back.

  A routing diagnosis is separate from the worker `failure_class`, which remains a diagnostic prior rather than an eligibility gate. When coordinator evidence disproves a completed report, classify it as `validation-failed` before recovery. That classification, and validation of any present worker failure class, occur before selecting a correction and do not by themselves authorize recovery.

  Before selecting a correction, assign exactly one locus. Zero attempts are spent for an out-of-scope cause; the out-of-scope hand-back must name its artifact and concrete point. The three possible locus values are:

  - `in-scope` only when both channels identify a concrete point and a safe correction boundary inside the active authorized RED or GREEN worker scope;
  - `out-of-scope` only when the evidence proves a boundary outside that worker scope, and the hand-back names the artifact and concrete point (including a forbidden test, declared interface, forbidden artifact, external/shared system, or plan-artifact point); or
  - `unresolved` when the evidence is missing, conflicting, or cannot establish a concrete point and correction boundary. Unresolved carries no locus claim and spends zero attempts.

  For an eligible `in-scope` diagnosis, normalize the coordinator-owned `diagnosis_key` as exactly the ordered tuple `(artifact path, concrete point, authorized correction boundary)`. Canonicalize the artifact path as a repository-relative path with `/` separators and redundant `.` segments removed, trim and collapse whitespace in the concrete point, and use the canonical spelling of the authorized correction boundary. Preserve component order and repository case semantics. Routing diagnosis, `failure_class`, ordinal, timestamps, summaries, and `changed_files` are not key components; a missing or non-concrete component has no usable key and is `unresolved`.

  Check the normalized key against every ledger entry before dispatch and again before declaring exhaustion. A duplicate diagnosis is checked before dispatch and before exhaustion; it spends zero slots, does not invoke `continue_after_recovery`, is not a new ordinal, and uses the human hand-back even when an unused slot remains. A new key is recorded atomically with its ordinal (`1 of 3`, `2 of 3`, or `3 of 3`) before dispatch. Announce the routing diagnosis, `failure_class` when present, the assigned locus, normalized key, and ordinal, then continue only the same authorized worker with exactly `continue_after_recovery`: the same RED worker for an in-scope RED cause, or the same GREEN worker for an in-scope GREEN cause. Recovery never dispatches a fresh, replacement, or new worker. A recovery transport loss or continuation rejection stops recovery without a replacement dispatch.

  Every recovery continuation carries exactly this ordered coordinator diagnosis, in this order:

  #### Reported

  State every contradictory claim from the Subagent Report.

  #### Evidence

  State only the relevant coordinator observations needed to establish the contradiction, including the applicable verification and comparison evidence. No raw output enters the recovery prompt.

  #### Cause

  State the coordinator-diagnosed execution defects and the assigned routing diagnosis and `Cause Locus`.

  #### Correction

  State the exact safe, reversible correction authorized inside the current Step and existing RED or GREEN plan scope.

  #### Verification

  State the normal dispatch-appropriate Verification Checklist and its pass condition; after the continuation returns, sweep the exact per-change scratch path and repeat the existing baseline, allowed-file, changed-path, and report comparisons before independent coordinator verification.

  The continuation preserves the ordinary dispatch context and every blindness and prohibition. RED remains blind to the GREEN implementation body, stays inside its authorized test or RED-stub scope, and never edits production files. GREEN edits production files only and never creates or modifies tests, declared interfaces, `implementation.md`, or other forbidden files. No recovery continuation may run git, read-before-write reads, exploration, or verification outside the stated worker contract, and no raw output or artifact contents enter the recovery prompt. A worker veto (`unrecoverable: true`), malformed or pre-resolution result, cancellation, transport loss, coordinator rejection without a concrete safe in-scope correction, out-of-scope cause, or unresolved cause spends zero worker-recovery attempts and does not continue the worker.

  An `out-of-scope` cause never enters the worker continuation route: it spends zero worker attempts, names the artifact and concrete point, and uses the owner hand-back unless the evidence identifies the exact current-Step `implementation.md` verification assertion as a plan-artifact defect. The coordinator MAY perform at most one bounded plan-artifact repair per active segment, tracked separately from the three-slot worker ledger. The repair is coordinator-owned, consumes no recovery slot, makes no worker attempt, and writes only that exact current-Step assertion. It SHALL preserve the Step headings and structure, checkbox semantics and states, plan-level file scope, declared worker prohibitions, verification checklist/run boundary, and Coverage Signature, observed before and after the repair. It SHALL not edit production files, test files, declared interfaces, verification scripts or checklists, any other artifact, or add a Step, redefine scope, or reduce coverage. It SHALL not run verification while writing. When it writes `implementation.md`, add `implementation.md` exactly once to the invocation-scoped changed-files union as the coordinator-owned repair; scratch paths remain excluded.

  For the repair comparison, the `Coverage Signature` is the ordered list of exact seven-field tuples `(ordinal, command_tokens, repo_relative_paths, selector, assertion_operator, assertion_target, pass_observation)`, with a separate ordered producer-reference list of exactly `{ordinal, artifact, point}` records. `command_tokens` preserves executable and argument token order; `repo_relative_paths` uses `/`, removes a leading `./`, and rejects `..` traversal; `selector` is the exact normalized selector or `<none>`; `assertion_operator` and `assertion_target` preserve the operator and normalized subject; and `pass_observation` preserves the exact expected pass/fail polarity and observation. Normalize only path separators and non-semantic whitespace; do not remove arguments, selectors, operators, targets, or polarity. Coverage equivalence requires identical signature length and exact tuple values at every ordinal, identical producer-reference-list length, and exactly one producer-reference change from the named impossible later-Step point to an existing current-Step point. No command, selector, assertion, or failure observation may be deleted, disabled, broadened, or made less strict.

  A non-equivalent repair, a second plan-artifact defect in the same segment, or a plan defect outside the exact current-Step assertion is unresolved: it spends zero attempts, makes no locus claim beyond the evidence-supported hand-back, and stops for human intervention rather than dispatching a worker. A second repair is therefore an unresolved human hand-back, never a second automatic repair. After an accepted repair, independent coordinator verification remains mandatory and authoritative; the repair write itself never performs that verification. The coordinator then performs the normal dispatch-appropriate checklist and all scratch, baseline, allowed-file, changed-path, and report comparisons. A repair cannot turn coordinator verification into RED or GREEN worker work.

  After each recovery continuation, re-diagnose only a successfully resumed same-worker result. A subsequent recovery continuation requires a new normalized diagnosis key and a remaining ledger slot. Exhaustion is terminal only after the duplicate check and after three distinct failed continuations have consumed the three distinct slots: it blocks checkbox changes, commit, and Step advance, and stops for human intervention naming the routing diagnosis, failure class when present, Cause Locus or unresolved state, distinct keys and ordinals spent, and the stopping reason. Duplicate, out-of-scope, unresolved, veto, transport-loss, coordinator-rejection, and repair hand-backs stop before exhaustion and do not fabricate a third attempt. Recovery hand-backs and announcements are conversation text only and never alter the progress plan.

   ## Terminal lifecycle handoff

   After the runner's Final sweep passes, the coordinator performs the single learnings promotion pass and immediately evaluates the terminal documentation set. It owns the visibility listing, commit-policy application, session-aware terminal authorization, exact-path staging, terminal documentation commit, and the no-op/decline handoff. RED and GREEN workers receive none of these responsibilities, and the retired monolithic apply instruction is not an executable source.

   ## Terminal Navigation

  After Final sweep passes, human verification gates are satisfied under the active
  fast-track or non-fast-track rules, and all commits are done, invoke the bound
  `terminal_navigation` action:
  - sole or final apply → run the shell-owned standalone completion action from
    `invocation.md` § Completion (print the exact pinned literal and stop)
  - non-final chained apply → run the composition-owned authorized transition only;
    do not print the standalone MANDATORY STOP message
  Incomplete apply (unchecked Step, unreviewed human verification under non-deferred
  rules, or pending commits) emits neither completion nor transition.
</TASK>

Follow instruction on <TASK> step by step
