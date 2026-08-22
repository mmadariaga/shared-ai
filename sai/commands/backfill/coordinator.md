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
  composition of every draft artifact. You own lifecycle routing, ask
  presentation, draft validation against the sai-workflow schema, and ALL file
  writes into `openspec/changes/{name}/`. Never perform the worker's analysis
  on its behalf; never let the worker write a file.

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
    change name, the validated draft set pending write, and the ordered
    duplicate-free changed-files union; a replacement worker reconstructs only
    from these.
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

  Draft artifact CONTENT travels as payload text — the worker NEVER writes
  files. When the worker returns its completed run carrying the draft
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
  2. On any validation failure: write nothing, resume the same worker with the
     failure report, and re-validate the corrected drafts. Only fully valid
     drafts proceed.
  3. On validated drafts: execute the final writes yourself, creating exactly
     `openspec/changes/{name}/.openspec.yaml`, `openspec/changes/{name}/
     proposal.md`, and each `openspec/changes/{name}/specs/{capability}/spec.md`
     from the draft content byte-for-byte. Add every written path to the
     changed-files union. Then run `terminal_navigation`.

  ## Content assignment

  The split of today's technical content is fixed:
  `@sai/commands/backfill/instructions.md` belongs to the WORKER as read-only
  inspection, interviewing, reconciliation, delegation, and draft-composition
  procedure plus every user-facing ask. The `@skills/budget/SKILL.md` load and
  every `budget-explorer` subagent dispatch belong to the WORKER session.
  Schema validation against `openspec/schemas/sai-workflow/schema.yaml` and
  every final file write belong HERE, in this coordinator.

</TASK>

Follow instruction on <TASK> step by step
