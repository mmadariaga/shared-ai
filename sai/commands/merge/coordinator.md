<TASK>

  Fetch @sai/policies/verified-precondition-handback.md
  Fetch @skills/safe-operations/SKILL.md and use it
  Fetch @sai/policies/commit-rules.md and follow it at the commit gate.
  Fetch @sai/policies/remember.md

  ## Prerequisite exemption

  `sai-merge` operates on git state only. It performs NO openspec prerequisite
  checks: never fetch `@sai/policies/prereqs.md`, never require the `openspec`
  binary, an `openspec/` directory, or `schema: sai-workflow`. This command is
  the documented exemption that works in projects without openspec. The
  openspec-dependent steps (spec semantic merge in the conflict analysis)
  degrade gracefully when `openspec/` is absent — the worker skips the specs
  classification and treats those paths as code.

  ## Fast-track parse

  Before dispatch, inspect the boot-provided `arguments_value` for the
  positional token `--fast-track`:
  - If the token is present anywhere in `arguments_value`:
    1. Set the in-conversation boolean `fast_track_active` to true.
    2. Remove the `--fast-track` token from `arguments_value` and trim
       surrounding whitespace.
    3. Print the exact line `> FAST-TRACK MODE ACTIVE` as ordinary conversation
       text (do not write it to any file).
    4. Use the cleaned remainder as the effective request for all downstream
       steps.
  - If the token is absent:
    1. Leave `fast_track_active` false.
    2. Use `arguments_value` verbatim.

  ## Merge phase adapter

  You are the user-facing merge coordinator. The worker owns every read-only
  procedure of the technical phase: pre-merge environment checks, branch
  selection, conflict analysis, resolution proposals, verification loop
  analysis, and ADR/DDR collision scanning. You own lifecycle routing, gate
  presentation, and ALL mutating execution: the merge launch, resolution file
  writes, ADR/DDR renames, reference updates, staging, and the final commit.
  Never perform the worker's read-only analysis on its behalf; never let the
  worker run `git merge`, write a file, rename a file, or run git.

  Declare the minimal phase-adapter field set:
  - `original_envelope` — the opaque single-string fast-track-cleaned request
    forwarded to the dispatch (the boot's `arguments_value` after the parse
    above; the stripped token survives only in `fast_track_active`).
  - `dispatch_operation` — dispatch exactly one `sai-merge-worker` through
    the active merge-worker binding
    (`Fetch @sai/orchestration/workers/bindings/merge-worker.md`) using the
    original envelope, and declare `fast_track_active` alongside the envelope
    as coordinator-owned session state (never an additional envelope key). The
    worker uses that signal for the documented fast-track auto-apply branch.
  - `continuation_operation` — continue the same worker through the binding's
    continuation mechanism, forwarding the selected answer value or the
    post-merge outcome report.
  - `allowed_nonterminal_extensions` — none; `extension_handlers` empty. This
    adapter declares NO `progress_plan`: no progress event exists in this
    lifecycle, no panel plan renders, and no acknowledgement literal is defined.
  - `replacement_reconstruction_fields` — the complete original envelope, the
    opaque input history (including forwarded gate answers), `fast_track_active`,
    and the ordered duplicate-free changed-files union; a replacement worker
    reconstructs only from these.
  - `terminal_navigation` — on a run whose final commit executed: print the
    worker-authored summary verbatim, print exactly `Merge done.`, stop. Every
    other closure prints the worker-authored summary verbatim and stops without
    the completion literal and without any mutation.
  - NO `recovery_policy` is declared: this adapter runs a minimal lifecycle
    without bounded recovery. Do not fetch `@sai/policies/bounded-recovery.md`,
    keep no recovery ledger, and perform no recovery continuations.

  Initialize one invocation-scoped ordered, duplicate-free changed-files union
  and an opaque input history; add the worker-reported paths in first-seen
  order. Validate every returned result against the shared runner's
  closed-payload rules before acting on it.

  ## Needs-input routing

  On a worker `needs_input` result — the dirty-worktree gate, the branch
  selector, the runtime scope gate, the no-suite escalation, or the
  authorization ask — present the exact question and ordered options through
  the native option-picker per the "Closed-choice prompts" rule in
  `@sai/policies/remember.md`, append only `{question, options, answer_value}`
  to the opaque input history, and forward the exact answer value to the same
  worker through the binding's continuation mechanism. Present any
  worker-authored payload content alongside the ask, unaltered.

  ## Coordinator-owned execution

  After the worker returns each analysis, execute the mutations in this order,
  each guarded by safe-operations:

  - **Merge launch** — after the worker returns the branch-selection completion
    and the user has selected a branch: execute `git merge <branch>` on the
    current branch. Capture the outcome (clean or conflicted). Report the
    outcome to the worker as a continuation so it can proceed to conflict
    analysis or the ADR/DDR pass.
  - **Resolution writes** — after the worker returns conflict-analysis
    proposals within the selected scope: for each proposed resolution, write
    the resolved file content (removing conflict markers and applying the
    proposed fusion). For E3 escalations (true semantic contradictions), do
    NOT auto-resolve — leave the conflict markers in place and report them in
    the terminal summary. Add written paths to the union.
  - **Staging** — after writing resolutions: `git add` each resolved file.
    Never stage files with unresolved E3 escalations without noting them.
  - **Verification loop** — after staging: the worker runs the test suite and
    reports results. On failures within the 3-round budget, the worker returns
    proposed fixes; write the fixes, re-stage, and resume the worker for
    re-verification. On E5 cap exhaustion, proceed to the ADR/DDR pass with
    the current staged state.
  - **ADR/DDR renames** — after the worker returns the collision-pass plan:
    for each proposed rename, execute `git mv <old> <new>`. For each proposed
    reference update, edit the file to replace the old token with the new
    token. For E7 orphans, report them but do not modify. For E8 escalations,
    report them but do not modify. Add renamed and edited paths to the union.
  - **Final staging** — after renames and reference updates: `git add` all
    changed paths.
  - **Commit authorization** — the worker returns the authorization ask as
    `needs_input`. Present it through the native picker. On `yes`: execute
    the merge commit using the HEREDOC form
    `git commit -m "$(cat <<'EOF' ... EOF)"` with a message composed by
    applying `sai/commands/commit/instructions.md` steps 1-5 with
    `@sai/policies/commit-rules.md` as the single source of commit-message
    rules. Capture and show the resulting commit SHA and subject. Then run
    `terminal_navigation`. On `no`: print the worker-authored summary
    verbatim — documenting the exact repo state per E9 — and stop without
    committing.

  ## Content assignment

  The split of technical content is fixed: `@sai/commands/merge/instructions.md`
  (pre-merge checks, branch selection, conflict analysis, resolution proposals,
  scope gate, verification analysis, ADR/DDR scanning, authorization ask)
  belongs to the WORKER as read-only analysis and proposal procedure plus the
  gate questions. All mutations — merge launch, resolution writes, renames,
  reference updates, staging, and commit execution — belong HERE.

</TASK>

Follow instruction on <TASK> step by step
