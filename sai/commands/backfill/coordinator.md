<TASK>

  Fetch @sai/policies/verified-precondition-handback.md
  Fetch @skills/safe-operations/SKILL.md and use it
  Fetch @sai/policies/remember.md

  ## Prerequisite checks

  `sai-backfill` REQUIRES the openspec project — unlike `sai-commit`, there is
  no exemption. Perform the full prerequisite checks by fetching
  @sai/policies/prereqs.md and applying them exactly:
  1. The `openspec` binary is in PATH.
  2. The `openspec/` directory exists.
  3. `openspec/config.yaml` declares `schema: sai-workflow`.
  On a failed check, halt with the check's own message and stop.

  ## Backfill phase adapter

  You are the user-facing backfill coordinator. The worker owns every step of
  the technical procedure: diff-source selection, diff computation and its
  summary, optional intent capture, intent reconciliation, the fixed and
  adaptive interview, scope-drift reporting, conflict detection through
  `budget-explorer` subagents, change-name derivation and confirmation, and the
  composition of every draft artifact. On the ordinary route, you own
  lifecycle routing, ask presentation, draft validation against the sai-workflow
  schema, and ALL file writes into `openspec/changes/{name}/`. The explicit
  Direct Build (unattended) execution route is the only exception: you still validate and
  authorize the closed draft order, then the same backfill worker performs the
  exact writes on its `--direct-build-execute` continuation. Never perform the
  worker's analysis on its behalf and never let an execution continuation write
  before validation and authorization.

  Backfill operates on OTHER changes: it authors retroactive artifacts for a
  change that was already implemented without the workflow, whatever else is
  open under `openspec/changes/`. It never depends on, reads, or writes any
  other change's lifecycle state — including the change that carries this
  command's own evolution.

  Declare the minimal phase-adapter field set:
  - `original_envelope` — exactly the opaque single-string `arguments_value`
    received from the active wrapper, byte-for-byte.
  - `dispatch_operation` — dispatch exactly one `sai-backfill-worker` through
    the active backfill-worker binding (`Fetch @sai/orchestration/workers/bindings/backfill-worker.md`)
    using the original envelope.
  - `continuation_operation` — continue the same worker through the binding's
    continuation mechanism (SendMessage-style / task-id resume), forwarding the
    exact answer value or the validation report.
  - `allowed_nonterminal_extensions` — none; `extension_handlers` empty. This
    adapter declares NO `progress_plan`: no progress event exists in this
    lifecycle, no panel plan renders, and no acknowledgement literal is defined.
  - `replacement_reconstruction_fields` — the complete original envelope, the
     opaque input history (including forwarded interview answers), the confirmed
     change name, the Direct Build (unattended) mode, the validated draft set and closed
     execution order pending write, the one-shot execution state, and the
     ordered duplicate-free changed-files union; a replacement worker
     reconstructs only from these and can never replay an executed order.
  - `terminal_navigation` — on a run closed by validated artifacts written into
    `openspec/changes/{name}/`: print the worker-authored summary verbatim,
    print exactly `Backfill complete in openspec/changes/{name}/.` (with the
    confirmed name substituted — today's established MANDATORY STOP text,
    preserved), then print the completion handoff block exactly:

    ```
    ## Ready to Archive

    **Change name**: {name}
    **Open a new chat** and run `/sai-archive {name}` (--fast-track).
    ```

    with the confirmed name substituted. The block is the LAST output of the
    command: no tool call, no follow-up command, and no further prose follows
    it; never invoke or prefetch anything from the archive flow yourself.
    Every other closure prints the worker-authored summary verbatim and stops
    without the completion literal, without the block, and without any file
    write.
  - NO `recovery_policy` is declared: this adapter runs a minimal lifecycle
    without bounded recovery. Do not fetch `@sai/policies/bounded-recovery.md`,
    keep no recovery ledger, and perform no recovery continuations.

  Initialize one invocation-scoped ordered, duplicate-free changed-files union
  and an opaque input history. Validate every returned result against the
  shared runner's closed-payload rules before acting on it.

  ## Needs-input routing

  On an unattended envelope — a detected crystallized block, a parsed
  diff-source token, and `--fast-track` — the worker returns zero
  `needs_input` results: route directly from dispatch to coordinator-owned
  validation and execution, presenting worker-authored payload content (such
  as the verbatim conflict report auto-proceeded under fast-track) unaltered
  as ordinary conversation text.

  On a worker `needs_input` result, present it per its kind and forward the
  exact answer to the same worker through the binding's continuation mechanism,
  appending only `{question, options, answer_value}` to the opaque input
  history:

  - **Closed-choice asks** — the diff-source selection ("Which diff should I
    analyze?"), the intent-capture choice with its two declared options, the
    conflict decision ("Do you want to proceed with these updates, or abort?"),
    and the change-name confirmation ("Is that correct?"): present the exact
    question and ordered options through the native option-picker per the
    "Closed-choice prompts" rule in `@sai/policies/remember.md`, carrying any
    worker-authored payload content (the diff summary, the conflict report, the
    proposed name) alongside the ask unaltered. A free-text reply that maps to
    none of the listed options is invalid — re-ask without writing anything.
  - **Open-ended and free-text asks** — Question 1 ("What problem does this
    solve?"), Question 2 ("What are the known limitations or technical debt
    left behind?"), any generated reconciliation question, the intent
    follow-up ("Share your statement of intent below."), and the base-commit
    request ("Provide the base commit SHA:") when option 1 was selected:
    present each question string exactly once as ordinary conversation text
    and end the turn there, per the instruction's Delivery rule — never route
    an open-ended or free-text ask through the native option-picker and never
    echo or restate it in the same turn. Wait for the user's full response and
    forward it verbatim.

  ## Coordinator-owned validation and execution

  Draft artifact CONTENT travels as payload text. On the ordinary route the
  worker NEVER writes files. When the worker returns its completed run carrying the draft
  `.openspec.yaml`, draft `proposal.md`, and draft capability specs:

  1. Validate every draft against the project schema before writing anything:
     the `.openspec.yaml` key set matches the no-intent three-key form
     (`schema`, `created`, `backfilled`) or the usable-intent four-key form
     (plus `prior_intent`) with `created` a date-only `YYYY-MM-DD`; the
     proposal opens with the exact applicable POST-HOC RECORD blockquote,
     carries the required headings in order (`## Why`, `## What Changes`,
     `## Capabilities`, `### New Capabilities`, `### Modified Capabilities`,
     `## Impact`), and ends `## Impact` with the Out-of-scope line; every
     capability spec follows the sai-workflow delta format of
     `openspec/schemas/sai-workflow/schema.yaml` and its templates — concrete
     `### Requirement:` headings with SHALL/MUST language and at least one
     `#### Scenario:` block with exactly one `- **WHEN**` line and one
     `- **THEN**` line; only `.openspec.yaml`, `proposal.md`, and capability
     specs exist in the draft set — never `design.md`, `tasks.md`, or
     `implementation.md`.
   2. Run the deterministic delta-header preflight before writing anything:
      stage each draft capability spec byte-for-byte under a fresh OS-temp
      directory preserving `<tmp>/specs/<capability>/spec.md` layout (create
      it from the project root with
      `node -e "console.log(require('fs').mkdtempSync(require('path').join(require('os').tmpdir(),'sai-delta-preflight-')))"`),
      run `node sai/tools/check-delta-headers.js <name> --delta-dir <tmp>/specs`
      with the confirmed change name (main specs resolve from the project
      root), then remove the temp directory best-effort. Exit 0 proceeds;
      exit 1 means misclassified ADDED/MODIFIED/REMOVED headers — write
      nothing into `openspec/changes/{name}/`, continue the same worker with
      the verbatim script report plus the cited headers and the Phase 6c
      existence rule, then re-validate and re-run this preflight on the
      corrected drafts. Exit 2 (usage/IO error) is a tooling failure: write
      nothing, report the verbatim error, and stop.
   3. On any validation or preflight failure: write nothing, resume the same
      worker with the failure report, and re-validate the corrected drafts
      (including a fresh preflight run). Only fully valid drafts proceed.
   4. On validated drafts in the ordinary route: execute the final writes
     yourself, creating exactly `openspec/changes/{name}/.openspec.yaml`,
     `openspec/changes/{name}/proposal.md`, and each
     `openspec/changes/{name}/specs/{capability}/spec.md` from the draft content
     byte-for-byte. Add every written path to the changed-files union. Then run
     `terminal_navigation`.

  ## Direct Build (unattended) prepare -> execute routing

  This route is used only by the Explore Direct Build (unattended) composition
  and does not alter a normal `/sai-backfill` invocation. The composition
  dispatches this worker with an initial `--direct-build-prepare` marker. The worker
  performs the ordinary technical flow and returns the draft content without
  writing it. The coordinator then:

   1. validates the complete returned draft set against
      `openspec/schemas/sai-workflow/schema.yaml` and the closed path/content
      allow-list, plus the same deterministic delta-header preflight above
      (staged from the prepared draft content into OS-temp); a preflight
      failure returns to the same worker with the verbatim script report
      exactly like the ordinary route and never authorizes execution;
  2. records the validated plan and keeps the invocation-scoped
     `changed_files` union; and
  3. only after the active Direct Build (unattended) authorization and all applicable phase
     gates resolve, continues the same worker with one opaque
     `--direct-build-execute` payload containing that exact validated order.

  The continuation is the execution authorization. It is not inferred from a
  completed prepare result, a worker summary, or the earlier selector alone.
  Forward only the byte-for-byte draft content and paths already returned by
  preparation; do not add new content or an unvalidated path. A successful
  execute result owns the exact draft writes and contributes the realized paths
  to the union. A failed or cancelled execute result is terminal for this route: the
  coordinator reports the worker's concrete partial state, never silently
  retries or sends a second execute continuation, and never falls back to
  coordinator-side writes.

  ## Content assignment

  The split of today's technical content is fixed:
  `@sai/commands/backfill/instructions.md` belongs to the WORKER as inspection,
  interviewing, reconciliation, delegation, and draft-composition procedure
  plus every user-facing ask. The ordinary route keeps all writes in this
  coordinator; the Direct Build (unattended) route hands only its validated closed execution
  order back to the worker. The `@skills/budget/SKILL.md` load and every
  `budget-explorer` subagent dispatch belong to the WORKER session. Schema
  validation and authorization remain HERE in this coordinator in both routes.

</TASK>

Follow instruction on <TASK> step by step
