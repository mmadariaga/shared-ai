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

  `sai-merge` operates on git state only and is the documented exemption from
  the openspec prerequisites: it never fetches `@sai/policies/prereqs.md` and
  needs no `openspec` binary, `openspec/` directory, or `schema: sai-workflow`.
  Without `openspec/`, the worker classifies spec paths as code.

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

  Fast-track changes exactly two gates: the method is pinned to `merge` and the
  scope is `full`. The language question, the strategy confirmation, and every
  other gate stay.

  ## Merge phase adapter

  You are the user-facing merge coordinator. The worker owns the read-only
  analysis and the gate data (`@sai/commands/merge/instructions.md`) plus the
  resolution-content writes. You own the presentation seam, the lifecycle
  check, the working-language question, the adaptive TODO, the
  post-resolution review, and every git mutation: branch refresh with
  `git fetch --prune origin`, the launch and squash,
  `git checkout --ours/--theirs`, collision replacements and `git mv`,
  staging, `git rebase --continue`, and commits. Route every validated worker
  result through the presentation seam before presenting it or moving on.
  Leave the analysis to the worker; confine the worker to its write boundary.

  Declare the minimal phase-adapter field set:
  - `original_envelope` — the fast-track-cleaned `arguments_value`, one opaque
    string; the stripped token survives only in `fast_track_active`.
  - `dispatch_operation` — dispatch exactly one `sai-merge-worker` through the
    active merge-worker binding
    (`Fetch @sai/orchestration/workers/bindings/merge-worker.md`) with the
    original envelope, declaring `fast_track_active` beside it as session
    state, never as an envelope key.
  - `continuation_operation` — continue the same worker through the binding's
    continuation mechanism, forwarding the answer value (for a batch, the
    ordered id-to-value answers in one continuation), an open-input answer
    unchanged, a coordinator-collected `branch_entry` for `sai:enter-branch` or
    picker free text, or an operation outcome together with
    the merge provenance.
  - `allowed_nonterminal_extensions` — the merge-only closed
    `conflict_detected` extension `{event: conflict_detected,
    summary: string, changed_files: string[], affected_files:
    string[], continuation_state: language-selection|strategy-analysis}`.
    It is the only nonterminal extension, not a worker status or a progress
    event, and it arrives after ready.
  - `extension_handlers` — for `conflict_detected`, validate the payload,
    record `affected_files` as the conflict inventory (never as a worker
    write), read the `Categories:` and `Eligible scope:` summary lines, and
    route per § Conflict hand-off.
    This adapter declares NO worker `progress_plan`: no progress event exists
    and no acknowledgement literal is defined. The merge TODO is separate
    coordinator state; it never travels in the envelope.
  - `replacement_reconstruction_fields` — the original envelope, the opaque
    input history (ordered `{id, question, options, answer_value}` pairs,
    including any coordinator-owned open branch-entry answer),
    `fast_track_active`, `branch_selection_source`, `branch_entry` when set,
    `working_language` once selected, the merge provenance, and the ordered
    duplicate-free changed-files union. A replacement worker reconstructs
    only from these.
  - `terminal_navigation` — hand the validated worker source and the
    presentation state to the seam's terminal renderer: it prints the
    worker-authored summary verbatim, then `Merge done.` only when
    `commit_executed` is true, and stops.
  - NO `recovery_policy` is declared: this adapter runs a minimal lifecycle
    without bounded recovery. Do not fetch `@sai/policies/bounded-recovery.md`,
    keep no recovery ledger, and perform no recovery continuations.

  Keep `branch_selection_source` and `branch_entry` as invocation-scoped state
  beside the opaque input history, never as keys in `original_envelope`, a
  worker payload, or a persistent artifact.

  Keep one invocation-scoped ordered, duplicate-free changed-files union and an
  opaque input history. The union holds only target-repository paths the
  worker wrote or you materialized, renamed, or updated, in first-seen order;
  fetched contracts and installed bindings are never target paths. Validate
  every worker result against the shared runner's closed-payload rules before
  acting on it.

  ## No-commit guard

  Fetch @sai/policies/no-commit-guard.md and follow its § Window pairing for
  every `sai-merge-worker` stretch: `snapshot` opens a window, holding the returned SHA as
  invocation-scoped `guard_base`, and `verify` closes it before each boundary. On a `violation` verdict,
  remediate exactly as the policy prescribes, then continue the route. Your
  own git mutations always run between guard windows, never inside one. No
  merge window carries `allow_commit`.

  ## Lifecycle check

  Before each operation, call `validate_transition` from the lifecycle seam
  with the current state, the state the operation enters, and its context.
  Proceed on `valid`; on `invalid`, halt as the seam prescribes.

  ## Gates

  Route each worker `needs_input` through the seam's `render_gate` when
  `options` is non-empty and `render_open_input` when it is empty. Present
  closed options through the native picker per "Closed-choice prompts" in
  `@sai/policies/remember.md`, append each exact answer to the opaque input
  history, and forward the exact value to the same worker. Open input goes back
  unchanged; build no options for it and interpret nothing.

  Resolve Batch 1's answers in this order, then forward them to the worker in
  one continuation. An abandoned batch forwards nothing.

  1. **`dirty` is `no`** — forward the batch as answered, ignoring any branch
     text; the worker closes the run with no fetch, validation, or mutation.
  2. **Classify the `branch` answer the picker returns**, in this order. A
     picker may return an option's label instead of its value: an answer
     equal to the exact value or the exact label of a listed candidate or of
     the sentinel option is that option's selection, mapped to its value
     before classification. Only an answer matching no option's value or
     label is picker free text.
     - an exact listed candidate value sets `branch_selection_source: listed`,
       including picker free text that exactly matches a listed value;
     - the branch-entry sentinel `sai:enter-branch` (a routing choice, never a
       Git ref) prints the seam's branch-entry prompt through
       `render_open_input`; record the typed answer in input history as
       `{id: branch-entry, question, options: [], answer_value}`;
     - any other non-empty answer is picker free text: the typed answer
       itself, with no second prompt; its Batch 1 history pair already
       records it, so add no `branch-entry` pair;
     - an empty or whitespace-only answer is not a branch: repeat the branch
       question, with no fetch.

     Both text paths set `branch_selection_source: free-text`. On the sentinel
     path the typed text wins even when it matches a listed candidate.
  3. **Typed text** — the exact typed value is `branch_entry`. Validate the
     `branch-selection` → `branch-validation` transition, then forward
     `branch_entry` with the ordered Batch 1 answers.

  Choosing text entry pre-authorizes exactly one `git fetch --prune origin`
  (§ Branch validation), never an integration.

  ## Conflict hand-off

  `working_language` starts unresolved; a clean run never asks for it.

  On `conflict_detected` with `continuation_state: language-selection`, print
  one concise notice as ordinary text (conflicts detected, the affected paths,
  the unresolved integration, and that a working language is needed), with no
  semantic analysis. Then present Batch 2 in one trip through the active
  harness-native question mechanism (`AskUserQuestion` on Claude Code,
  `question` on opencode):

  - `language` — the canonical question **"Which language should I use for the
    conflict explanation and resolution strategy?"**, rendered in the ambient
    conversation language. Options are `English` and the current conversation
    language (once, when they coincide), plus the harness's free-text path when
    it has one. Labels may be localized; each value is the exact language
    token.
  - `scope` — outside fast-track, the worker's `Eligible scope:` values, worded
    per the seam.

  Store the language answer as invocation-scoped `working_language`, outside
  `arguments_value`, artifacts, configuration, and worker payload
  persistence, and forward the ordered batch answers in one continuation.

  On `conflict_detected` with `continuation_state: strategy-analysis`, print
  its notice as ordinary text and continue the same worker with the selected
  `working_language`; the language question runs once per run.

  ## Coordinator-owned execution

  Each operation below runs after its lifecycle check and under
  safe-operations; presentation-state updates follow the operation outcome.

  - **Branch validation.** A worker's Step 4 `completed` result is only the
    integration proposal; do not render it as terminal output until branch
    validation and launch resolve. Derive `source_ref` yourself from the
    unmodified answer and pass it to git as one literal argument:
    - **Listed candidate** — `refs/heads/<value>`; do not fetch. Resolve it
      with `git rev-parse --verify <source_ref>^{commit}`; if it no longer
      resolves, continue the worker with a branch-resolution failure.
    - **`branch_entry`** — the route is already in `branch-validation`. An
      entry beginning with the exact prefix `origin/` maps to
      `refs/remotes/origin/<remainder>`; every other entry maps to
      `refs/heads/<value>`. Run `git fetch --prune origin` first; if it fails,
      check nothing further. After a successful fetch, run
      `git check-ref-format <source_ref>`, then
      `git show-ref --verify --quiet <source_ref>`, then
      `git rev-parse --verify <source_ref>^{commit}`. If fetch or any check
      fails, continue the worker with the exact entry and the failure outcome.

    The ref is exactly this derived value: do not interpolate the user's text
    into shell syntax, use any ref from the worker's proposal, resolve
    arbitrary revisions, or create a local branch for an `origin/<branch>`
    entry. On a failure the worker returns a closing `completed` result stating
    that no integration started; do not capture provenance or launch on that
    path. On success, capture the merge provenance exactly as
    `@sai/commands/merge/instructions.md` § Merge provenance defines it,
    using this exact `source_ref`; remain in the current branch state until
    Launch.

  - **Launch.** After branch validation succeeds (or a listed local branch is
    selected without fetch), keep the captured provenance from the unchanged
    refs invocation-scoped, outside `arguments_value`, and forward it unchanged
    with every outcome. Before launching, validate the lifecycle transition to
    `merge-outcome`: from `branch-selection` for a listed candidate (provenance
    captured, no fetch) or from `branch-validation` for a free-text entry
    (fetch succeeded and the exact ref resolves). Then call `render_progress`
    to render the first TODO and launch by method:
    - `merge` — `git merge --no-ff --no-commit <source_ref>`;
    - `rebase` — `git rebase <source_ref>`;
    - `rebase-squash` — when `merge_base` differs from `target_sha`,
      `git reset --soft <merge_base>` then one `git commit` holding the
      squashed change, with its message composed per
      `@sai/policies/commit-rules.md`; then `git rebase <source_ref>`.

    Record the outcome — `clean` or `conflicted`, and for a rebase `stopped` or
    `finished` — report it with the provenance to the worker, and reconcile the
    TODO to the actual route.
  - **Resolution validation.** The worker writes `authored` files after
    `apply-strategy` and returns the `## Complete resolution payload` JSON
    object defined in `@sai/commands/merge/instructions.md`. Surrounding prose
    is explanation, never file content. Validate the whole object at once:
    1. `selected_contextual_decisions` holds exactly one `ours`, `theirs`, or
       `synthesis` per semantic conflict, each matching the decision the
       confirmed strategy states for it.
    2. `files` holds exactly one record per conflicted path in the selected
       scope, with no duplicate or unexpected path, the worker's category, and
       `decisions` that agree with the decision records.
    3. `source` is `git-ours` or `git-theirs` with empty `regions`, or
       `authored` with at least one region, each region's `conflict_id` present
       in the file's `decisions`. No region `text` holds a `<<<<<<<`,
       `=======`, or `>>>>>>>` line, a diff, a hunk, or a complete file.
    4. Any missing or invalid record, decision, path, region, or source rejects
       the whole payload: touch no conflict and stage nothing.

    After every record passes, materialize `git-ours` / `git-theirs` files with
    `git checkout --ours` / `--theirs`; `authored` files are already written.
    Add each materialized path to the union after its checkout succeeds.
  - **Post-resolution review.** Compare the working tree with the confirmed
    strategy held in your context. A `git-ours` / `git-theirs` file is
    byte-identical to its `git show :2:` / `:3:` stage. An `authored` file
    matches its stage content outside the resolved regions and carries the
    confirmed decisions inside them. No write lands outside the agreed regions
    or the selected scope. On a divergence (an unapproved change, an unresolved
    region, an out-of-scope write, any deviation from the strategy), stage
    nothing and send the named divergence to the same worker as a correction,
    then review again. After three rounds without a match, stop without
    staging: report that the confirmed strategy could not be materialized
    within the retry budget.
  - **Staging.** After the review passes, `git add` every resolved file. A
    file with an unresolved escalation is staged only with the escalation
    noted.
  - **Verification.** Resume the worker to run the suite. For each failed
    round below three, the worker applies its fixes; re-stage the corrected
    files and resume it. On cap exhaustion the resolution stays staged and the
    run continues. A new conflict or inconsistency arrives as a
    `strategy-analysis` event: route it per § Conflict hand-off, and require a
    fresh strategy confirmation before the next resolution write.
  - **Collision repair.** When the worker's collision plan is
    `repair-required`, for each rename first record its worker data in the
    seam's `adr_ddr_renames`, then apply exactly the worker's replacements —
    `old_h1` → `new_h1`, `old_index_label` → `new_index_label` in its index,
    and every listed reference update — and then `git mv <old> <new>`. Apply
    only replacements the worker supplied, and never rename onto a path
    another final-state record occupies. Orphan, ambiguous, and delete/modify
    escalations are reported, never modified. Add renamed and updated paths to
    the union.
  - **Final staging.** `git add` exactly the union.
  - **Authorization.** On the worker's authorization `needs_input`, build
    `compact_authorization_summary` and present it with the exact question
    and options. On `yes`:
    - merge in progress, or a finished rebase with a staged repair —
      `git commit -m "$(cat <<'EOF' ... EOF)"` with a message composed by
      applying `sai/commands/commit/instructions.md` Steps 1–5 under
      `@sai/policies/commit-rules.md`; show the resulting SHA and subject;
    - rebase stopped — `GIT_EDITOR=true git rebase --continue`, then report
      the new outcome to the worker: a new conflicted commit re-enters
      § Conflict hand-off as `strategy-analysis`; a finished rebase goes to the
      collision pass.

    On `no`, record `authorization_status: refused` and pass the worker's
    refusal record through the seam; stop without committing.

  ## Content assignment

  `@sai/commands/merge/instructions.md` is the worker's: read-only analysis,
  gate data, the strategy and payload, verification analysis, the collision
  plan, and resolution-content writes. `@sai/commands/merge/presentation.md`
  and `@sai/commands/merge/lifecycle.md` are yours: rendering, channels, TODO,
  and the state machine. Every git mutation and the post-resolution review are
  yours alone.

</TASK>

Follow instruction on <TASK> step by step
