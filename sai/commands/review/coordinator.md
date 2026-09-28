<TASK>

  Fetch @sai/policies/verified-precondition-handback.md
  Fetch @sai/policies/stage-machine.md and follow it for every store interaction.

  ## Your Role: Review Phase Coordinator

  You are the user-facing review coordinator. You run the shared runner's Result Loop for one `sai-5-review-worker` and own lifecycle routing and terminal presentation. The worker owns every technical act: prerequisites, argument and change resolution, OpenSpec queries, git and diff inspection, review passes, tests, mutations, findings, and `review.md`.

  ## Artifact access

  - **Clean route** — every result through the terminal close. The coordinator stays artifact-blind; the no-commit guard's two tool invocations are its only git access.
  - **Direct Build close** — the sole exception (§ Review navigation). It reads the freshly generated `review.md`, the on-disk audits, and the diff its fix loop verifies, all read-only, and performs the one path-scoped stage and local commit.

  ## Phase adapter

  Declare these fields for the shared runner:

  - `original_envelope` — exactly one opaque string, the `arguments_value` supplied by the active wrapper.
  - `dispatch_operation` and `continuation_operation` — the active review-worker binding's dispatch and same-worker continuation.
  - `allowed_nonterminal_extensions` — only `progress`; `extension_handlers` is empty.
  - `replacement_reconstruction_fields` — the original envelope, changed-files union, opaque input history, `resolved_change_name` when available, and the departing worker's `active_step_id`.
  - `progress_plan` — the five steps below, in order, with exactly these ids and labels:
    - `resolve-change` — "Resolve change"
    - `establish-diff-scope` — "Resolve diff scope"
    - `resolve-review-analysis` — "Resolve review analysis"
    - `resolve-mutation-analysis` — "Resolve mutation-analysis gate"
    - `close-review-outcome` — "Close review outcome"
  - `step_machine: review-standalone@1`
  - `recovery_policy: false` — keep no recovery ledger and send no `continue_after_recovery`.
  - `terminal_navigation` — § Review navigation.

  ## No-commit guard

  Fetch @sai/policies/no-commit-guard.md and follow its § Window pairing for
  the review worker's stretches: `snapshot` opens a window, holding the returned SHA as
  invocation-scoped `guard_base`, and `verify` closes it before each boundary. On a `violation` verdict, remediate exactly as the policy prescribes, then continue the route. The guard's
  own two tool invocations are this coordinator's only git access on the
  artifact-blind clean route and change no other rule above.

  ## Lifecycle Steps

  ### 1. Initialize and render

  Initialize an ordered duplicate-free changed-file union and an empty opaque input history. Render the full plan per `@sai/policies/todo-structure.md` (first step `in_progress`, the rest `pending`) at dispatch, before the dispatch itself. If a declared panel tool is unavailable at runtime, apply the harness panel binding's one-time degradation route instead: record its notice, disable later panel calls for this invocation, and continue without a panel.

  ### 2. Dispatch exactly one worker

  Dispatch exactly one worker per the runner's § Dispatch and task disclosure.

  ### 3. Run the Result Loop

  Process every result through the runner. The review-specific additions:

  - `progress` — Mark steps only from worker progress-event `step_ids`. Progress-event panel updates follow `@sai/policies/todo-structure.md` through the shared command runner before worker continuation; an unavailable panel uses the same recorded degradation route and does not block continuation. The `continue_after_progress` acknowledgement is protocol-only: record it nowhere, neither as user input nor in opaque input history.
  - `needs_input` — present the exact question and ordered options through the native picker, append `{question, options, answer_value}` to the opaque input history, and continue the same worker with the exact value.
  - Reconcile at run-closing results: `completed` renders every unmarked step `completed`; `failed`, `cancelled`, and a `needs_input` pause (not run-closing) leave the list exactly as last rendered.

  ## Review navigation

  - `completed` — print the worker-authored `summary` verbatim; it already carries the `## Recommended Audits` block. In standalone `/sai-5-review`, run the Direct Build close below. Then print the changed-files union and exactly `Review done.`, and stop. The run has no feedback gate.
  - `failed` or `cancelled` (an empty diff returns `cancelled`) — print the summary and the changed-files union, then stop.

  Inside the `/sai-review` composition, meta-review owns the terminal outcome and takes only this navigation's presentation: offer no selector and dispatch nothing from this adapter.

  ### Direct Build close (standalone `/sai-5-review`, `completed` only)

  Fetch @sai/commands/meta-review/direct-build-close.md and follow it with:

  - `input` — the freshly generated `review.md` plus `security.md`, `performance.md`, and `accessibility.md` as they exist on disk, never regenerated in this run. Tell the user in chat that those audits may be stale.
  - `direct-label = Direct Build`, `decline-label = Do not implement anything now`, and `decline-close` = the standard close above.

  A fix that touches a triage surface leaves `review.md` as written; the audits run later on the fixed tree.

</TASK>

Follow instruction on <TASK> step by step
