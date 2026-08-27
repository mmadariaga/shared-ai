<TASK>

  Fetch @sai/policies/verified-precondition-handback.md
  Fetch @skills/safe-operations/SKILL.md and use it
  Fetch @sai/policies/commit-rules.md and follow it at the commit gate.
  Fetch @sai/policies/remember.md
  Fetch @sai/policies/question-context.md
  Fetch @sai/commands/merge/lifecycle.md and use it as the merge lifecycle
  validation seam.
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
  selection, conflict detection, conflict classification, contextual objective
  analysis, complete global resolution strategies and alternatives,
  verification loop analysis, and incremental ADR/DDR collision scanning. You
  own the merge presentation seam, lifecycle routing, the conflict-triggered language
  question, the two coordinator presentation channels, the adaptive merge
  TODO, and ALL mutating execution: the merge launch, resolution file writes,
  ADR/DDR renames, reference updates, staging, and the final commit. Route
  every validated worker result through the fetched merge presentation seam
  before presenting it or continuing the lifecycle. Never perform the worker's
  read-only analysis on its behalf; never let the worker run `git merge`, write
  a file, rename a file, or run git.

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
    post-merge outcome report together with the captured invocation-scoped merge
    provenance.
  - `allowed_nonterminal_extensions` — the merge-only closed
    `conflict_detected` extension `{event: conflict_detected, emitted_on:
    string, summary: string, changed_files: string[], affected_files:
    string[], continuation_state: language-selection|strategy-analysis}`.
    This is the only nonterminal extension; it is not a worker status or a
    progress event.
  - `extension_handlers` — for `conflict_detected`, validate the complete
    source payload, record the affected-file inventory without treating it as a
    worker write, and route the first event to the coordinator's language
    question or the strategy-analysis event to the selected-language re-entry.
    The handler prints the concise conflict notice as ordinary conversation
    text, uses the active harness-native question mechanism for the first
    language decision, and resumes the same worker with the exact selected
    value. It never adds language to `arguments_value`, worker payload
    persistence, artifacts, or configuration.
    This adapter declares NO worker `progress_plan`: no progress event exists
    in this lifecycle and no acknowledgement literal is defined. The merge
    TODO is a separate coordinator-owned adaptive task list; it is not a worker
    progress plan, is not transported in the envelope, and does not change
    worker continuation semantics.
  - `replacement_reconstruction_fields` — the complete original envelope, the
    opaque input history (including forwarded gate answers), `fast_track_active`,
    the selected invocation-scoped `working_language` when a conflict has been
    detected, the captured merge provenance (`target_sha`, `source_sha`,
    `merge_base`, and the source-introduced ADR/DDR record inventory), and the
    ordered duplicate-free changed-files union; a replacement worker reconstructs
    only from these and never receives artifact contents or a language persisted
    in the envelope.
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

  ## Conflict-triggered language hand-off and presentation channels

  Initialize `working_language` as unresolved for every invocation. A clean
  merge leaves it unresolved and never asks for a language or a resolution
  strategy. When the worker returns the closed nonterminal
  `event: conflict_detected` with `continuation_state: language-selection`,
  first record its exact `affected_files` inventory and render one concise
  informational notice as ordinary conversation text. The notice may say that
  conflicts were detected, name the affected paths and current merge state, and
  explain that a working language is needed before conflict analysis; it must
  not expose semantic analysis or propose a resolution.

  After that notice, ask exactly one working-language question through the
  active harness-native question mechanism, using the closed-choice rule in
  `@sai/policies/remember.md` and the five-element anatomy in
  `@sai/policies/question-context.md`:

  The canonical English question is **"Which language should I use for the
  conflict explanation and resolution strategy?"**; render its explanatory
  wording in the ambient conversation language. Offer `English` and the
  current conversation language when they differ, and preserve the native
  free-text/Other path when the active harness supplies one. If the two named
  languages are the same, offer that value once rather than duplicating it.

  - Claude Code uses `AskUserQuestion`.
  - opencode uses the `question` tool.

  Offer the available language values for the invocation (including `English`
  and the current conversation language when they differ, plus the native
  free-text/Other path when the harness provides one). The option label may be
  readable in the ambient language, but its value is the exact language token.
  Store the selected value in invocation-scoped `working_language`, outside
  `arguments_value`, artifacts, configuration, and worker payload persistence.
  Forward the selected value unchanged as the next same-worker continuation. Do not
  translate it, wrap it in a new envelope key, or ask the worker to choose it.

  The first language question is the only language gate for this merge run. If
  a later `conflict_detected` event has `continuation_state:
  strategy-analysis`, print its concise state notice through the ordinary-text
  channel and continue the same worker with the already selected
  `working_language`; never ask the language question again. A replacement
  reconstruction uses the coordinator-owned session value, not a persisted
  worker payload.

  The coordinator has two user-facing channels after the language hand-off:

  1. **Ordinary conversation text** — print worker-authored informational
     summaries, global strategy proposals, verification findings, and open
     context/correction requests exactly as returned. Do not send these to a
     picker and do not rephrase, translate, or duplicate them.
  2. **Native questions** — send only closed decisions with non-empty options in
     their worker-authored order (including the language decision, branch/scope choices, global
     strategy confirmation, semantic choices when exposed, no-suite, and final
     authorization) to the active harness-native picker, preserving the exact
     question and option values.

  A worker `needs_input` with an empty `options` list is the explicit open-input
  form. Print its exact question once as ordinary text, wait for free-form user
  input, append only the exact answer to opaque input history, and forward it to
  the same worker. The coordinator must never synthesize closed options for a
  context or strategy correction request.

  ## Needs-input routing

  On a worker `needs_input` result — the dirty-worktree gate, the branch
  selector, the runtime scope gate, the global strategy confirmation, a
  contextual semantic decision, the no-suite escalation, or the authorization
  ask — first create the seam's gate presentation record from the worker source
  and current merge presentation state. When `options` is non-empty, present
  its exact question and ordered options through the native option-picker per
  the "Closed-choice prompts" rule in `@sai/policies/remember.md`, append only
  `{question, options, answer_value}` to the opaque input history, and forward
  the exact answer value to the same worker through the binding's continuation
  mechanism. Present any worker-authored summary or proposal through the seam
  as ordinary text before the ask and unaltered. Use the seam's active concise
  renderer: branch labels and values remain the worker-authored exact option
  pairs, the scope options are the worker's category-filtered eligible set,
  strategy content describes one complete global plan, contextual labels
  describe complete behavioral alternatives rather than merge jargon, and the
  authorization gate shows the seam's compact merge summary instead of a full
  staged-file dump.

  When `options` is empty, this is an open context/correction request rather
  than a closed gate. Present the exact question once as ordinary conversation
  text, wait for free-form input, append only that exact answer to the opaque
  input history, and forward it to the same worker. Do not invoke a picker,
  invent choices, or interpret the answer in the coordinator. The seam must not
  add a gate, change an option value, or alter continuation semantics. For
  `more-context`, preserve the pending alternatives and perform no mutation —
  no resolution write or staging — while continuing the same worker. For
  `ours`, `theirs`, or `synthesis`, forward the exact value without
  interpreting or replacing it; the worker must return the selected complete
  alternative only as part of a confirmed global strategy before the
  coordinator can mutate anything.

  ## Coordinator-owned execution

  After the worker returns each analysis, update the merge presentation state
  at the named lifecycle boundary, then execute the mutations in this order,
  each guarded by safe-operations. State updates are presentation-only and do
  not move ownership of any operation.

  Before each operation, validate the lifecycle transition using the fetched
  lifecycle seam. Call `validate_transition(current_state, target_state,
  operation_context)` with the current phase, the phase the next operation
  would enter, and the coordinator-owned context for that operation. The
  validation is deterministic and coordinator-owned. When the result is
  `invalid`, halt before selecting the operation: perform no mutation,
  dispatch no worker, and render no presentation update for the rejected
  transition. Report the current state, target state, and violated
  precondition as ordinary conversation text. When the result is `valid`,
  proceed to select and execute the operation. The validation does not change
  worker ownership, mutation ownership, or the presentation seam.

  - **Merge launch** — after the worker returns the branch-selection completion
    and the user has selected a branch, capture the merge provenance before any
    merge mutation and before any ref can move: `target_sha` from
    `git rev-parse --verify HEAD`, `source_sha` from
    `git rev-parse --verify <selected-branch>^{commit}`, and `merge_base` from
    `git merge-base <target_sha> <source_sha>`. From that captured
    `merge_base` and `source_sha`, record only exact `A` paths from
     `git diff --name-status --diff-filter=A --find-renames --find-copies --find-copies-harder
     <merge_base> <source_sha> -- docs/adr/ docs/ddr/` whose names match the
     ADR/DDR record pattern, excluding the exact canonical index paths
     `docs/adr/0000-INDEX.md` and `docs/ddr/0000-INDEX.md`. Source-side renames
     and copies are excluded, including copies whose unchanged source is outside
     the diff.
     Keep all four values (the three SHAs plus the ordered source-introduced
     inventory) in invocation-scoped merge provenance outside
     `arguments_value`/`original_envelope` and forward them unchanged with the
     post-merge outcome; never recompute them from post-merge `HEAD`.
    Then execute `git merge <branch>` on the current branch. Immediately after
    branch selection and before this launch, call `render_progress(presentation_state)`
    to render the first adaptive merge TODO. The TODO is never rendered before
    source-branch selection. Capture the outcome (clean or conflicted), report it
    together with the provenance to the worker as a continuation, and record it
    in the seam state. A clean outcome continues directly to the incremental
    ADR/DDR pass. A conflicted outcome must first return the worker's closed
    `conflict_detected` extension; do not let the worker read conflict versions
    or expose semantic analysis before the coordinator has printed the concise
    conflict notice and completed the working-language question. Reconcile the
    TODO to the actual path after the outcome: a clean merge removes scope,
    contextual-analysis, resolution, and verification steps instead of leaving
    them pending; a conflicted merge retains only the applicable scope,
    contextual-analysis, and resolution path, then verification.
    Add a collision step only after the worker reports an affected collision
    applicability of `repair-required` or `escalation-required`, followed by
    authorization. A source frontier with no final-state record, a skipped
    collision scan, or a scan with no affected collisions removes that step
    rather than leaving it pending. A clean merge skips conflict-resolution
    presentation entirely.
  - **Contextual decision gate — global strategy** — after the working language and scope are
    selected, update the seam to `contextual-analysis` and render the
    contextual TODO item. Present the worker's complete global strategy,
    including its facts, inferences, affected files, alternatives, and
    complete resolution content, as ordinary conversation text. Then present
    its closed strategy confirmation through the native picker. An empty
    `options` result is an open context/correction request and is presented as
    ordinary text, not a picker. A `more-context` or `revise-strategy` answer
    continues the same worker with the same pending alternatives and remains
    mutation-free. Fast-track may omit only the scope item; it must still ask
    for the working language and require this strategy confirmation. Mark
     contextual analysis complete only after `apply-strategy` is confirmed and
     the worker returns the matching complete alternatives. The strategy
     confirmation is required before any resolution write or staging.
  - **Resolution writes** — only after the worker returns a completed payload
    following explicit confirmation of the current global strategy and
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
       Each file record carries a `source` field.
    3. Each file's `source` must be exactly `"git-ours"`, `"git-theirs"`, or
       `"authored"`. When `git-ours` or `git-theirs`, the `regions` array must
       be empty and the coordinator uses `git checkout --ours` or
       `git checkout --theirs` to materialize it. When `"authored"`, `regions`
       is an array with at least one entry; each entry has a `conflict_id` that
       matches one in the file's `decisions`, and a `text` field holding the
       authored replacement for that region. Reject diffs, complete files, hunks,
       marker annotations, or content reconstructed from prose. Reject any
       `<<<<<<<`, `=======`, or `>>>>>>>` marker in any region's `text` value.
    4. Reject the entire payload if any record, decision, path, region, or
       source is missing or invalid; leave every conflict untouched and do not
       stage.
    After every record passes, materialize each file: when `source` is
    `git-ours` or `git-theirs`, use the corresponding git checkout command.
    When `source` is `"authored"`, splice each region's `text` into the working
    file at the conflict region identified by its `conflict_id`, maintaining
    deterministic order. Do not reconstruct content from prose, concatenate
    unselected alternatives, or author a synthesis in the coordinator. For a
    contradiction, leave markers in place until the human selects a complete
    branch outcome or a worker-validated safe synthesis; if no complete outcome
    exists, leave it unresolved and report the escalation. Add written paths to
    the union only after validation and successful materialization.
  - **Staging** — after writing resolutions: `git add` each resolved file.
    Never stage files with unresolved E3 escalations without noting them.
  - **Verification loop** — after staging: the worker runs the test suite and
    reports results. On failures within the 3-round budget, the worker returns
    proposed fixes; write the fixes, re-stage, and resume the worker for
    re-verification. On E5 cap exhaustion, proceed to the ADR/DDR pass with
    the current staged state. Record each round in the seam without resetting
    or committing the staged state; three failed rounds remain staged and
    uncommitted. If application or verification exposes a new conflict or
    inconsistency, do not apply the prior plan or ask for the language again:
    report the exact current state to the same worker, route its
    `conflict_detected` re-entry through the ordinary information channel, and
    return to global strategy analysis with the selected language intact. A new
    strategy confirmation is required before another resolution write. Reconcile
    the TODO after every outcome without changing the worker's verification
    ownership or three-round behavior.
  - **ADR/DDR renames** — after the worker returns the incremental collision-pass
    plan, already limited to candidate `(family, numeric prefix)` keys from the
    captured source frontier and the final merge state, with existing suffixed
    records and canonical index paths handled by the worker:
     for each proposed rename, first copy its family, exact old/new H1,
     old/new index-label, assigned identifier, suffix, path data, and the
     worker-derived introduction anchor/path/commit/timestamp into the seam's
     `adr_ddr_renames` state record, then
     execute `git mv <old> <new>`. For each proposed reference update, edit the
     file to replace the worker-supplied canonical old token with the exact
     family-aware new token. This includes same-family and cross-family
     markdown links, relationship tokens, and both `adr-index` and `ddr-index`
     structured metadata. Also apply the worker's exact `old_h1` → `new_h1`
     replacement in the renamed ADR/DDR file and the exact
     `old_index_label` → `new_index_label` replacement in its index file; these
     are coordinator-owned writes and must use the same assigned identifier as
     the filename. Do not reread artifacts to reconstruct missing presentation
     data, and never broad-replace an unrelated bare four-digit number. Apply
     only the worker's collision-free, family-aware assigned identifiers; never
     execute a rename whose target is occupied by another final-state record.
     For
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
     target/source branches, verification status, conflict result, incremental
     collision result and collision applicability (including a skipped
     source-frontier result), and staged-file count; present that
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
  (pre-merge checks, branch selection, conflict detection, conflict
  classification, contextual objective analysis, complete global resolution
  strategies and alternatives, scope gate, verification analysis, ADR/DDR
  scanning, authorization ask) belongs to the WORKER as read-only analysis and
  proposal procedure plus the source gate data. `@sai/commands/merge/presentation.md`
  belongs HERE as the coordinator-owned lifecycle, language hand-off,
  information/question channels, gate-summary, terminal, and progress-rendering
  seam. The seam owns the concise branch/scope/strategy/contextual-decision/
  authorization rendering and the adaptive TODO, while all mutations — merge
  launch, resolution writes, renames, reference updates, staging, and commit
  execution — belong HERE.

</TASK>

Follow instruction on <TASK> step by step
