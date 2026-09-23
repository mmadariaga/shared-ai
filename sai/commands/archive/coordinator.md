<TASK>

  Fetch @sai/policies/verified-precondition-handback.md
  Fetch @skills/safe-operations/SKILL.md and use it
  Fetch @sai/commands/archive/retirement-declaration.md

  ## Prerequisite checks

  `sai-archive` requires an openspec project. Fetch @sai/policies/prereqs.md
  and apply it exactly; on a failed check, print that check's message and stop.

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

  Resolve the change name before dispatching: fetch
  @sai/policies/change-picker.md and follow it exactly against the cleaned
  request. On its stop paths (no active changes, declined confirmation), print
  its exact stop text and stop without dispatching. The resolved name is the
  effective request from here on.

  ## Archive phase adapter

  You are the user-facing archive coordinator. The worker owns the read-only
  pre-flight (`@sai/commands/archive/instructions.md`) and the unchecked-items
  question. On the ordinary route you own gate presentation and every
  mutation: the retirement declaration, the CLI archive
  `openspec archive <name> --yes --json` (the sole sync and move primitive,
  whose pre-write validation guarantees scenario preservation and whose JSON
  result is the completion record), and the post-archive commit gate. On the
  Direct Build (unattended) route you validate and authorize the worker's
  prepared order and the same worker executes it. Leave the pre-flight to the
  worker, and send an execution continuation only after validation and
  authorization.

  Declare the minimal phase-adapter field set:
  - `original_envelope` — the fast-track-cleaned request, one opaque string;
    the stripped token survives only in `fast_track_active`.
  - `dispatch_operation` — dispatch exactly one `sai-archive-worker` through
    the active archive-worker binding
    (`Fetch @sai/orchestration/workers/bindings/archive-worker.md`) with the
    resolved change name as `arguments_value`, declaring `fast_track_active`
    beside it as session state, never as an envelope key. The Direct Build
    (unattended) composition instead sends an initial `--direct-build-prepare`
    marker and keeps `direct_build_mode` outside the envelope.
  - `continuation_operation` — continue the same worker through the binding's
    continuation mechanism, forwarding the selected answer value.
  - `allowed_nonterminal_extensions` — none; `extension_handlers` empty. This
    adapter declares NO `progress_plan`: no progress event exists in this
    lifecycle, no panel plan renders, and no acknowledgement literal is defined.
  - `replacement_reconstruction_fields` — the original envelope, the opaque
    input history, the resolved change name, `fast_track_active`, the Direct
    Build mode, the validated closed execution order, the execution state, and
    the ordered duplicate-free changed-files union. A replacement worker
    reconstructs only from these and never replays an executed order.
  - `terminal_navigation` — when the archive move executed, print the
    worker-authored summary verbatim, then exactly `Archive done.`, and stop.
    Every other closure prints the worker-authored summary verbatim and stops
    without the completion literal and without any mutation.
  - NO `recovery_policy` is declared: this adapter runs a minimal lifecycle
    without bounded recovery. Do not fetch `@sai/policies/bounded-recovery.md`,
    keep no recovery ledger, and perform no recovery continuations.

  Keep one invocation-scoped ordered, duplicate-free changed-files union and an
  opaque input history; add worker-reported paths in first-seen order. Validate
  every worker result against the shared runner's closed-payload rules before
  acting on it.

  ## No-commit guard

  Fetch @sai/policies/no-commit-guard.md and follow its § Window pairing for
  every `sai-archive-worker` stretch: `snapshot` opens a window, holding the returned SHA as
  invocation-scoped `guard_base`, and `verify` closes it before each boundary. On a `violation` verdict,
  remediate exactly as the policy prescribes, then continue the route. Your own
  CLI archive, staging, and commit operations run between windows, never inside
  one. The Direct Build (unattended) execute continuation is the one
  `allow_commit` carrier in the system: it always opens its own window per the
  policy's `allow_commit` isolation, and that window's verify runs with
  `--allow-commit`, because its validated order contains the one pre-authorized
  local commit.

  ## Needs-input routing

  On the worker's unchecked-items `needs_input`, present the exact question and
  ordered options through the native option-picker per "Closed-choice prompts"
  in `@sai/policies/remember.md`, with the worker's payload content (the
  delta-sync summary, the unchecked-item list) beside it unaltered. Append
  `{question, options, answer_value}` to the opaque input history and forward
  the exact answer to the same worker.

  ## Ordinary route execution

  After the worker's confirming `completed` result, present its summary, then
  run in order (`archive_content_fix_attempted` starts false):

  - **Retirement declaration** — when the summary names retired capabilities,
    perform the Write procedure of `retirement-declaration.md`. A refusal or a
    failed re-parse stops the run before the CLI archive, with no question.
  - **CLI archive** — run `openspec archive <name> --yes --json` and parse the
    JSON. On success the sync and move are complete: add the realized archive
    path and the spec paths from the pre-flight inventory (the CLI's
    `specsUpdated` is not a path list) to the union. On failure or invalid
    JSON, classify:
    - **Content failure with a cited header** — the error carries a
      delta-content signal (`archive_spec_update_failed`, an already-existing
      requirement, or a missing or unknown requirement) and cites at least one
      `### Requirement:` header. Once per run
      (`archive_content_fix_attempted`): dispatch exactly one
      `sai-backfill-worker` through the active backfill-worker binding
      (`Fetch @sai/orchestration/workers/bindings/backfill-worker.md`) with a
      `--fix-delta-headers <name>` envelope carrying the verbatim CLI error and
      the cited headers. It returns corrected content for those headers only.
      Validate it against the sai-workflow delta format, write it to an
      OS-temp directory, and check it with
      `node <check-delta-headers.js path> <name> --delta-dir <tmp>/specs`,
      resolving the tool path per `@sai/policies/tool-resolution.md` (first
      existing candidate per harness; when none exists, name the tried
      candidates and stop). On a pass, write the corrected specs and retry the
      CLI archive once. Any second failure — the retry, the validation, or the
      fix continuation — stops with the literal error: no further retry, no
      second fix, no replacement worker.
    - **Every other failure** — an archive-directory collision, an empty
      index, an infrastructure error (missing binary, timeout, invalid JSON), a
      failure on a `--skip-specs` run, or a content signal with no cited header:
      report the exact error and stop, with no fallback, staging, retry, or
      commit.
  - **Post-archive commit gate** — fetch
    @sai/commands/archive/archive-commit-gate.instructions.md and apply it
    exactly.

  Then run `terminal_navigation`.

  ## Direct Build (unattended) route

  Used only by the Explore Direct Build (unattended) composition. The
  `--direct-build-prepare` dispatch runs the whole pre-flight and every
  applicable fast-track gate without mutation and returns either a refusal or a
  closed plan: the archive destination, the owned staging paths, the
  pre-authorized one-commit boundary, and, when capabilities are retired, the
  retirement declaration as a named member of the order.

  Validate the plan against the fresh worker findings and the implementer's
  changed-files union. After the existing gates and the Direct Build
  authorization resolve, continue the same worker exactly once with an opaque
  `--direct-build-execute` payload holding the validated closed execution
  order. That continuation is the execution authorization; it is never inferred
  from a completed prepare result, a fast-track notice, or a worker summary, and
  it carries no additional path or action.

  Add every worker-reported path to the union and print its summary verbatim.
  The classified content fix above is ordinary-route only; a CLI failure here
  follows the Direct Build supervision contract. A defect repeated without
  progress after correction closes as failed-retryable with the verbatim
  failure in view. A failure after a partial mutation reports the exact partial
  state and never refires an order onto it. A late continuation after success
  is rejected without mutation. These closures carry no finality: new retries
  run only at explicit user request. Never fall back to the ordinary-route
  mutation surface.

</TASK>

Follow instruction on <TASK> step by step
