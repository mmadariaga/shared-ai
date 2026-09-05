<TASK>

  Fetch @sai/policies/verified-precondition-handback.md
  Fetch @skills/safe-operations/SKILL.md and use it
  Fetch @skills/openspec-archive-change/SKILL.md
  The coordinator runs `openspec archive <name> --yes --json` as the sole
  sync + move primitive on the ordinary route. The CLI's deterministic
  pre-write validation is the scenario-preservation guarantee; the CLI's
  JSON result is the completion record. The upstream skill's manual sync
  and move steps are not used.

  ## Prerequisite checks

  `sai-archive` REQUIRES the openspec project — unlike `sai-commit`, there is no
  exemption. Perform the full prerequisite checks by fetching
  @sai/policies/prereqs.md and applying them exactly:
  1. The `openspec` binary is in PATH.
  2. The `openspec/` directory exists.
  3. `openspec/config.yaml` declares `schema: sai-workflow`.
  On a failed check, halt with the check's own message and stop.

  ## Fast-track parse

  Before resolution, inspect the boot-provided `arguments_value` for the
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

  ## Change resolution

  Resolve the OpenSpec change name before dispatching the worker: fetch
  @sai/policies/change-picker.md and follow it exactly against the cleaned
  request. On the picker's stop paths (no active changes, declined
  confirmation), print its exact stop text and stop without dispatching. The
  resolved name becomes the effective request for the remainder of the run.

  ## Archive phase adapter

  You are the user-facing archive coordinator. The worker owns every read-only
  procedure of the technical phase: artifact classification, checkbox-state
  scanning, delta-sync diffing against main specs, target-name collision
  checking, and the authoring of the unchecked-items pre-mutation gate
  question. On the ordinary route, you own lifecycle routing, gate
  presentation, and ALL mutating execution: the CLI archive invocation
  (`openspec archive <name> --yes --json`) as the sole sync + move primitive,
  and every git operation of the post-archive commit gate. The explicit
  Direct Build (unattended) route is the only exception: you validate the worker's prepared
  mutation order and authorize it, then the same archive worker performs the
  CLI archive invocation, exact-path staging, and local commit continuation.
  Never perform the worker's read-only analysis on its behalf; never let an
  execution continuation act before validation and authorization.

  Declare the minimal phase-adapter field set:
  - `original_envelope` — the opaque single-string fast-track-cleaned request
    forwarded to the dispatch (the boot's `arguments_value` after the parse
    above; the stripped token survives only in `fast_track_active`).
  - `dispatch_operation` — dispatch exactly one `sai-archive-worker` through
     the active archive-worker binding
     (`Fetch @sai/orchestration/workers/bindings/archive-worker.md`) using the
     original envelope with the resolved change name as `arguments_value`, and
     declare `fast_track_active` alongside the envelope as coordinator-owned
     session state (never an additional envelope key). The worker uses that
     signal for the documented fast-track auto-proceed branches. The
     Direct Build (unattended) composition instead sends the same worker an initial
     `--direct-build-prepare` marker and retains `direct_build_mode` outside the opaque
     envelope.
  - `continuation_operation` — continue the same worker through the binding's
    continuation mechanism, forwarding the selected answer value.
  - `allowed_nonterminal_extensions` — none; `extension_handlers` empty. This
    adapter declares NO `progress_plan`: no progress event exists in this
    lifecycle, no panel plan renders, and no acknowledgement literal is defined.
  - `replacement_reconstruction_fields` — the complete original envelope, the
     opaque input history (including forwarded gate answers), the resolved
     change name, `fast_track_active`, the Direct Build (unattended) mode, the validated closed
     execution order, the one-shot execution state, and the ordered
     duplicate-free changed-files union; a replacement worker reconstructs only
     from these and cannot replay an executed order.
  - `terminal_navigation` — on a run whose archive move executed: print the
    worker-authored summary verbatim, print exactly `Archive done.`, stop.
    Every other closure prints the worker-authored summary verbatim and stops
    without the completion literal and without any mutation.
  - NO `recovery_policy` is declared: this adapter runs a minimal lifecycle
    without bounded recovery. Do not fetch `@sai/policies/bounded-recovery.md`,
    keep no recovery ledger, and perform no recovery continuations.

  Initialize one invocation-scoped ordered, duplicate-free changed-files union
  and an opaque input history; add the worker-reported paths in first-seen
  order. Validate every returned result against the shared runner's
  closed-payload rules before acting on it.

  ## Needs-input routing

  On a worker `needs_input` result — the unchecked-items gate — present the
  exact question and ordered options through the native option-picker per the
  "Closed-choice prompts" rule in `@sai/policies/remember.md`, append only
  `{question, options, answer_value}` to the opaque input history, and forward
  the exact answer value to the same worker through the binding's continuation
  mechanism. Present any worker-authored payload content (the combined
  delta-sync summary, the unchecked-item list) alongside the ask, unaltered.

  ## Coordinator-owned execution (ordinary route)

   After the gates resolve through forwarded answers, execute the archive and
   commit in this order (initialise `archive_content_fix_attempted` to false;
   it bounds the single classified content-fix below):

   - **CLI archive** — run `openspec archive <name> --yes --json` as the sole
     sync + move primitive. The CLI validates scenario preservation before
     writing and couples delta-spec synchronization with the archive directory
     move in one deterministic operation. Parse the JSON result: on success,
     the sync and move are complete. Obtain exact spec paths from the
     pre-flight inventory for `changed_files`
     because the CLI's `specsUpdated` is not a path list. Add the realized
     archive path and spec paths to the union.
     - On failure or invalid JSON, classify before anything else:
       - **Content failure with cited header** — the error carries a
         delta-content signal (a JSON error code or message naming
         `archive_spec_update_failed`, an already-existing requirement, or a
         missing/unknown requirement) AND cites at least one concrete
         `### Requirement:` header. Only then, and only while
         `archive_content_fix_attempted` is still false: set it true and
         dispatch exactly one `sai-backfill-worker` through the active
         backfill-worker binding
         (`Fetch @sai/orchestration/workers/bindings/backfill-worker.md`)
         with a `--fix-delta-headers <name>` envelope carrying the verbatim
         CLI error plus the cited headers. The worker returns corrected spec
         content for the cited headers only — never a full regeneration.
         Validate it against the sai-workflow delta format, verify it by
         staging the corrected specs to OS-temp and running
         `node sai/tools/check-delta-headers.js <name> --delta-dir <tmp>/specs`
         exactly like the backfill preflight, write the corrected specs on
         pass, and retry the CLI archive exactly once. Any second failure —
         from the retry, the validation, or the fix continuation itself —
         stops with the literal error and no further retry. Never replace the
         worker and never send a second fix.
       - **Every other failure** — archive-directory collision, empty index,
         infrastructure errors (missing binary, timeouts, invalid JSON), any
         failure on a `--skip-specs` run, or a content signal with no cited
         header: never reroute to backfill. Report the exact error and stop
         without manual fallback, staging, retry, or commit.
  - **Post-archive commit gate** — fetch
    @sai/commands/archive/archive-commit-gate.instructions.md and apply its
    coordinator-owned surface exactly as written: the skip-rule `git
    status` check, the three-option selector presentation (suppressed under
    `fast_track_active`, which auto-selects the new-commit option), staging of
    exactly the two literal paths, the shared empty-index guard, the
    pushed-HEAD guard with its secondary confirmation, and the authorized
    commit or amend. Compose messages by applying
    `sai/commands/commit/instructions.md` steps 1–5 with
    `@sai/policies/commit-rules.md` as the single source of commit-message
    rules, exactly as that instruction directs.

  Then run `terminal_navigation`.

  ## Direct Build (unattended) prepare -> execute routing

  This route is used only by the Explore Direct Build (unattended)
  composition and leaves the ordinary archive coordinator path unchanged. The
  initial `--direct-build-prepare` dispatch runs classification, completion,
  collision detection, and every applicable fast-track gate without mutation.
  The worker returns a closed plan containing the archive destination, owned
  staging paths, and the pre-authorized one-commit boundary.

  The coordinator validates that plan against the fresh worker findings and
  the implementer's changed-files union. After the existing gates and the
  Direct Build (unattended) authorization resolve, it continues the same worker exactly once
  with an opaque `--direct-build-execute` payload containing the validated closed
  execution order. That continuation is the explicit execution authorization;
  it is never inferred from a completed prepare result, a fast-track notice,
  or a worker summary. The coordinator forwards no additional path or action.

   The worker owns the authorized CLI archive invocation, exact-path staging,
   commit-message authoring, and local commit in that order. The CLI
   (`openspec archive <name> --yes --json`) is the sole sync + move primitive;
   any CLI failure stops staging and commit without retry or fallback. The
   classified content-fix loop above is ordinary-route only: the Direct Build
   execute continuation keeps its one-shot no-retry rule. Add every
  worker reported path to the invocation union and print its summary verbatim.
  A failed or cancelled execution is terminal: report the exact partial state,
  never silently retry or send a second execute continuation, and never fall
  back to the normal coordinator mutation surface.

  ## Content assignment

  The split of today's technical content is fixed: `@sai/commands/archive/
  instructions.md` (Classification Check, Completion Check scan, collision
  check) belongs to the WORKER as verification, completeness, and diffing
  procedure plus the unchecked-items pre-mutation gate question. The
  coordinator owns the CLI archive invocation (`openspec archive <name>
  --yes --json`) and the post-archive commit gate
  (`@sai/commands/archive/archive-commit-gate.instructions.md`) on the
  ordinary route. The Direct Build (unattended) route uses the same
  coordinator validation and authorization, then delegates only its validated
  closed execution order — CLI archive, exact-path staging, and local commit —
  to the existing archive worker.

</TASK>

Follow instruction on <TASK> step by step
