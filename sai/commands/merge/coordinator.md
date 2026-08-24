<TASK>

  Fetch @sai/policies/verified-precondition-handback.md
  Fetch @skills/safe-operations/SKILL.md and use it
  Fetch @sai/policies/commit-rules.md and follow it at the commit gate.
  Fetch @sai/policies/remember.md
  Fetch @sai/commands/merge/presentation.md and use it as the merge
  presentation seam.
  Fetch @sai/adapters/claude/panel-render.md when the active harness is Claude
  Code, or Fetch @sai/adapters/opencode/panel-render.md when the active
  harness is opencode, and use that harness-native task-list binding for the
  merge TODO.

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

  Fast-track changes only the documented runtime scope gate. It may not select
  an `ours`, `theirs`, or `synthesis` outcome, hide a semantic ambiguity, or
  authorize resolution writes before the worker's required contextual decision
  has been answered.

  ## Merge phase adapter

  You are the user-facing merge coordinator. The worker owns every read-only
  procedure of the technical phase: pre-merge environment checks, branch
  selection, conflict classification, contextual objective analysis, complete
  resolution alternatives, verification loop analysis, and ADR/DDR collision
  scanning. You own the merge presentation seam, lifecycle routing, the
  adaptive merge TODO, and ALL mutating execution: the merge launch, resolution
  file writes, ADR/DDR renames, reference updates, staging, and the final
  commit. Route every validated worker result through the fetched merge
  presentation seam before presenting it or continuing the lifecycle. Never
  perform the worker's read-only analysis on its behalf; never let the worker
  run `git merge`, write a file, rename a file, or run git.

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
    adapter declares NO worker `progress_plan`: no progress event exists in
    this lifecycle and no acknowledgement literal is defined. The merge TODO
    is a separate coordinator-owned adaptive task list; it is not a worker
    progress plan, is not transported in the envelope, and does not change
    worker continuation semantics.
  - `replacement_reconstruction_fields` — the complete original envelope, the
    opaque input history (including forwarded gate answers), `fast_track_active`,
    and the ordered duplicate-free changed-files union; a replacement worker
    reconstructs only from these.
  - `terminal_navigation` — pass the validated worker source and the current
    merge presentation state to the seam's terminal renderer. On a run whose
    final commit executed, it prints the worker-authored summary verbatim,
    prints exactly `Merge done.`, and stops. Every other closure prints the
    worker-authored summary verbatim and stops without the completion literal
    and without any mutation. The seam owns rendering; it does not change the
    worker payload or authorize the commit.
  - NO `recovery_policy` is declared: this adapter runs a minimal lifecycle
    without bounded recovery. Do not fetch `@sai/policies/bounded-recovery.md`,
    keep no recovery ledger, and perform no recovery continuations.

  Initialize one invocation-scoped ordered, duplicate-free changed-files union
  and an opaque input history; add only worker-reported target-repository merge,
  resolution, rename, and reference-update paths in first-seen order. The
  installed `sai/commands/merge/presentation.md` contract is not a target path
  and must never be injected into this union merely because the coordinator
  fetched it. If a repository-local seam copy is encountered, add it only
  after independently verifying that it exists and is owned by the target
  repository. The installed harness panel-render binding is likewise a
  presentation contract, never a target path and never a staging candidate.
  Validate every returned result against the shared runner's closed-payload
  rules before acting on it.

  ## Needs-input routing

  On a worker `needs_input` result — the dirty-worktree gate, the branch
  selector, the runtime scope gate, a contextual semantic-decision or
  `more-context` continuation, the no-suite escalation, or the authorization
  ask — first create the seam's gate presentation record from the worker source
  and current merge presentation state. Present its exact question and ordered
  options through the native option-picker per the "Closed-choice prompts" rule
  in `@sai/policies/remember.md`, append only `{question, options,
  answer_value}` to the opaque input history, and forward the exact answer value
  to the same worker through the binding's continuation mechanism. Present any
  worker-authored payload content through the seam, alongside the ask and
  unaltered. Use the seam's active concise renderer: branch labels and values
  remain the worker-authored exact option pairs, the scope options are the
  worker's category-filtered eligible set, contextual labels describe complete
  behavioral alternatives rather than merge jargon, and the authorization gate
  shows the seam's compact merge summary instead of a full staged-file dump.
  The seam must not add a gate, change an option value, or alter continuation
  semantics. For `more-context`, preserve the pending alternatives and perform
  no mutation — no resolution write or staging — while continuing the same
  worker. For `ours`,
  `theirs`, or `synthesis`, forward the exact value without interpreting or
  replacing it; the worker must return the selected complete alternative before
  the coordinator can mutate anything.

  ## Coordinator-owned execution

  After the worker returns each analysis, update the merge presentation state
  at the named lifecycle boundary, then execute the mutations in this order,
  each guarded by safe-operations. State updates are presentation-only and do
  not move ownership of any operation:

  - **Merge launch** — after the worker returns the branch-selection completion
    and the user has selected a branch: execute `git merge <branch>` on the
    current branch. Immediately after branch selection and before this launch,
    call `render_progress(presentation_state)` to render the first adaptive
    merge TODO. The TODO is never rendered before source-branch selection.
    Capture the outcome (clean or conflicted), report it to the worker as a
    continuation so it can proceed to conflict analysis or the ADR/DDR pass,
    and record it in the seam state. Reconcile the TODO to the actual path
    after the outcome: a clean merge removes scope, contextual-analysis,
    resolution, and verification steps instead of leaving them pending; a
    conflicted merge retains only the applicable scope, contextual-analysis,
    and resolution path, then verification.
     Add a collision step only after the worker reports collision applicability
     as `repair-required` or `escalation-required`, followed by authorization.
     A skipped collision scan or a scan with no collisions removes that step
     rather than leaving it pending. A clean merge skips conflict-resolution
     presentation entirely.
  - **Contextual decision gate** — after scope selection and before any
    resolution write or staging, update the seam to `contextual-analysis` and
    render the contextual TODO item. If the worker returns `needs_input`, ask
    the exact human-facing question through the native picker and perform no
    mutation. A `more-context` answer continues the same worker with the same
    pending alternatives and remains mutation-free. Fast-track may omit only
    the scope item; it must still stop here for semantic ambiguity. If the
    worker returns an obvious-conflict result without a gate, or returns the
    final selected alternatives after all required decisions, mark contextual
    analysis complete before entering resolution.
  - **Resolution writes** — only after the worker returns a completed payload
    containing the explicitly selected complete alternative for every required
    semantic decision within the selected scope. The payload MUST contain the
    `## Complete resolution payload` JSON object defined by
    `@sai/commands/merge/instructions.md`; treat all surrounding prose as
    explanation, never as file content. Before any write, parse and validate all
    of the object atomically:
    1. `selected_contextual_decisions` contains exactly one accepted `ours`,
       `theirs`, or `synthesis` value for every semantic conflict, and every
       value was an option previously offered for that conflict. It contains no
       `more-context` value. An obvious conflict has no decision record but
       still requires a file record.
    2. `files` contains exactly one record for every conflicted path in the
       selected scope, with no duplicate or unexpected path, the worker's exact
       category, and `decisions` that agree with the selected decision records.
    3. Every `content` value is a JSON string holding the complete final UTF-8
       file contents for that path. Reject diffs, hunks, region replacements,
       marker annotations, missing content, or content reconstructed from
       prose. Reject any `<<<<<<<`, `=======`, or `>>>>>>>` marker.
    4. Reject the entire payload if any record, decision, path, or content is
       missing or invalid; leave every conflict untouched and do not stage.
    After every record passes, write each `content` value exactly as supplied.
    Do not reconstruct content from prose, concatenate unselected alternatives,
    or author a synthesis in the coordinator. For a contradiction, leave
    markers in place until the human selects a complete branch outcome or a
    worker-validated safe synthesis; if no complete outcome exists, leave it
    unresolved and report the escalation. Add written paths to the union only
    after validation and successful writes.
  - **Staging** — after writing resolutions: `git add` each resolved file.
    Never stage files with unresolved E3 escalations without noting them.
  - **Verification loop** — after staging: the worker runs the test suite and
    reports results. On failures within the 3-round budget, the worker returns
    proposed fixes; write the fixes, re-stage, and resume the worker for
    re-verification. On E5 cap exhaustion, proceed to the ADR/DDR pass with
    the current staged state. Record each round in the seam without resetting
    or committing the staged state; three failed rounds remain staged and
    uncommitted. Reconcile the TODO after every outcome without changing the
    worker's verification ownership or three-round behavior.
  - **ADR/DDR renames** — after the worker returns the collision-pass plan:
     for each proposed rename, first copy its family, exact old/new H1,
     old/new index-label, assigned identifier, suffix, and path data into the
     seam's `adr_ddr_renames` state record, then
     execute `git mv <old> <new>`. For each proposed reference update, edit the
     file to replace the worker-supplied canonical old token with the exact
     family-aware new token. This includes same-family and cross-family
     markdown links, relationship tokens, and both `adr-index` and `ddr-index`
     structured metadata. Also apply the worker's exact `old_h1` → `new_h1`
     replacement in the renamed ADR/DDR file and the exact
     `old_index_label` → `new_index_label` replacement in its index file; these
     are coordinator-owned writes and must use the same assigned identifier as
     the filename. Do not reread artifacts to reconstruct missing presentation
     data, and never broad-replace an unrelated bare four-digit number. For
     orphan or ambiguous references, record the worker's escalation and do not
     modify or invent a destination. For E8 escalations, report them but do not
     modify. Add renamed and edited paths to the union.
  - **Final staging** — after renames and reference updates: `git add` only
     the union of actual merge, resolution, rename, and reference-update paths.
     Never stage the installed presentation contract or another globally
     installed seam. A repository-local seam copy may be staged only after the
     existence and target-repository-ownership checks above succeed.
  - **Commit authorization** — the worker returns the authorization ask as
     `needs_input`. Build `compact_authorization_summary` from the current
     target/source branches, verification status, conflict result, collision
     result and collision applicability, and staged-file count; present that
     summary with the exact worker question and options through the native
     picker. Do not include the full staged-file list in this gate. On `yes`:
     execute the merge commit using
    the HEREDOC form
    `git commit -m "$(cat <<'EOF' ... EOF)"` with a message composed by
     applying `sai/commands/commit/instructions.md` steps 1-5 with
     `@sai/policies/commit-rules.md` as the single source of commit-message
     rules. Capture and show the resulting commit SHA and subject. Record
     `authorization_status: committed`, mark the authorization TODO completed,
     set `commit_executed: true`, clear the merge-marked TODO surface in
     terminal navigation, and then run `terminal_navigation`. On `no`, record
     `authorization_status: refused`, clear the authorization TODO before
     terminal rendering, and pass the worker-authored summary and exact refusal
     state through the seam; it documents the exact repo state per E9 and stops
     without committing.

  ## Content assignment

  The split of technical content is fixed: `@sai/commands/merge/instructions.md`
  (pre-merge checks, branch selection, conflict classification, contextual
  objective analysis, complete resolution alternatives, scope gate,
  verification analysis, ADR/DDR scanning, authorization ask) belongs to the
  WORKER as read-only analysis and proposal procedure plus the source gate
  data. `@sai/commands/merge/presentation.md` belongs HERE as the
  coordinator-owned lifecycle, gate-summary, terminal, and progress-rendering
  seam. The seam owns the concise branch/scope/contextual-decision/
  authorization rendering and the adaptive TODO, while all mutations — merge
  launch, resolution writes, renames, reference updates, staging, and commit
  execution — belong HERE.

</TASK>

Follow instruction on <TASK> step by step
