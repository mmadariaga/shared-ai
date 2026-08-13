# Design Worker

Fetch @sai/worker-core.md and follow it exactly.

## Invocation Envelope

The worker receives exactly two strings:

- `wrapper_echo_value`: the value after the exact opencode line `**Change-name argument and and optional flags:** <value>`, or empty when absent
- `arguments_value`: `$ARGUMENTS` exactly as received from the coordinator
- `overview_language`: worker-owned invocation state derived from the optional flag after parsing; `English` when absent, never written to an artifact or configuration file.

Every post-resolution worker result carries the current `overview_language` alongside its normal lifecycle metadata; the generator result envelope remains separate and unchanged.

## Prerequisites and Resolution

Parse invocation-scoped options before change resolution. Scan the selected envelope source (wrapper echo when non-empty, otherwise `arguments_value`) for the option syntax `--overview-lang <language>` and consume exactly one following non-empty token. If the option is absent, set `overview_language: English`; if its value is missing, is another option, or the option occurs more than once, return a clear `failed` validation result before change resolution or dispatch. Remove only the option and its value before resolving the change name. A change-consuming invocation requires the change name before the option; if parsing leaves no change name, return a clear missing-change-name validation result and never treat the language value as the change name. `--fast-track` is recognized independently and remains active in either order. The cleaned arguments and `overview_language` are invocation-scoped and never persisted.

If `--fast-track` is present in the combined envelope, activate the signal, remove the token from its source value, and emit `> FAST-TRACK MODE ACTIVE` once per session unless reconstruction says `fast_track_banner_emitted: true`.
Then run universal prerequisite checks via `Fetch @sai/policies/prereqs.md`.
Return `failed` with the missing-prerequisite summary when a check fails.

When both envelope values are non-empty, wrapper echo takes precedence. When
both are empty, run the change picker; when one is non-empty, use it directly.
Strip a remaining `--fast-track` from the resolved name and trim it.

For zero changes return the established no-active-changes failure. For one,
ask `Use change '{name}'?` with ordered yes/no options; yes resolves and no
cancels. For multiple changes ask `Which change?`, preserve CLI order, and
repeat the same request for invalid input without a retry cap.

Verify `proposal.md` and at least one `specs/**/*.md`. Missing artifacts return
the established change-not-found failure. Unless fast-track is active, ask for
spec approval, write the approval metadata, and handle amendments per
`design.md`.

## Progress Reporting

This phase declares a progress plan with exactly these canonical step ids, in
order:

- `prereqs-resolution` — "Prerequisites and change resolution"
- `specs-approval` — "Specs approval gate"
- `research` — "Research and open questions"
- `artifacts` — "Artifact generation and verification"

Emit exactly one progress event per completed batch after prerequisite checks
pass and change resolution completes, whenever one or more plan steps
complete. The startup act (fast-track parsing + prerequisites + resolution)
reports as one batch carrying every step id that act completed; a
fast-track-skipped gate step folds into the completed batch with no separate
`skipped` field. Report ids in plan order; `changed_files` lists every path
written since the preceding result. Never emit a progress event before
resolution, and never in place of a terminal payload — the run always closes
with exactly one terminal lifecycle status.

## Planning

Fetch @sai/commands/design/invocation.md and follow it exactly.
Delegate all codebase discovery and deep reading to one budget-explorer using
the prompt specified by `design.md`. Delegate each Open Question to a
budget-explorer and resolve all questions before `tasks.md`.

Write `design.md`, `tasks.md`, and `interfaces.md` directly to the change
directory and verify each exists and is non-empty. Planning questions SHALL
comply with `@sai/policies/question-context.md`, and the design notice
`message` SHALL comply with that policy's informational-notice subset.
Worker-owned feedback is
applied without re-presenting the coordinator's feedback gate. For
coordinator-forwarded artifact feedback, process only the supplied feedback
text; MUST NOT emit, re-present, or duplicate the feedback-text prompt.

For Architecture Snapshot presentation, retain the previous `interfaces.md` text in invocation-scoped state before worker-owned feedback edits. Apply the normalization and complete-effective-artifact comparison defined by `sai/commands/design/instructions.md`. The existing terminal `summary` includes the current Architecture Snapshot on the initial iteration and after a later normalized interface change, and omits it after identical regeneration or `design.md`/`tasks.md`-only changes. Do not add a payload field; generation, comparison, and summary composition remain worker-owned.

### Overview generation (design-worker-owned lifecycle)

The worker owns the change's overview lifecycle for `change-overview.md` per `specs/change-overview-synchronization/spec.md` and `specs/change-overview-generation-routing/spec.md`:

- **Language transport** — pass the current invocation's `overview_language` to every initial generation or regeneration dispatch. The generator localizes only eligible free-text prose in `change-overview.md`; it preserves structural/source values, writes only that file, and returns the unchanged five-field result envelope. A later unflagged invocation supplies `English` rather than reading a prior invocation's value.
- **Diagnostic reset and durable carrier** — the worker owns `overview.state`, `overview.failure_kind`, and `overview.failure_details` in `openspec/changes/{change-name}/.openspec.yaml`. At the conservative source-write transition (the `Stale-before-first-write` boundary), clear both diagnostic keys before any post-materialization source write. Immediately before every first-materialization or regeneration dispatch, clear both keys again so an older attempt cannot be reused. Whenever any of the three overview keys is written, include `.openspec.yaml` in the outer worker `changed_files` union. Repopulate the keys only from the current attempt's generator result or parent-authored failure route. A successful materialization or reconciliation commits `overview.state: current` and clears both diagnostic keys.
- **First materialization** — at the feedback gate's `Continue` processing, after `design.md`, `tasks.md`, and `interfaces.md` verify successfully, set `overview.state: materializing`, clear both diagnostic keys immediately before dispatch, and dispatch the budget-routed generation subagent. Commit `overview.state: current` only after a successful closed result envelope. A coherent generator failure writes its generator-owned failure record, persists the exact non-empty `failure_kind` and `failure_details`, reports the overview path plus `.openspec.yaml` in the union, sets `overview.state: failed`, and suppresses the design completion sentence. A failed first materialization remains diagnostic state and is retryable by a later invocation. For a later source-modifying transaction, identify the first effective source-artifact write and record its conservative state immediately before that write.
- **Parent-authored first-materialization failures** — a dispatch failure before acknowledgement is represented with the exact five fields `status: failed`, `changed_files: []`, `validation: not-performed`, `failure_details` containing the dispatch operation, reason, and location, and `failure_kind: dispatch-failed`. A process-loss result after acknowledgement is represented with `status: failed`, `changed_files: [openspec/changes/{change-name}/change-overview.md]`, `validation: not-performed`, non-empty `failure_details` naming the lost generation operation, worker or continuation location, and missing result, and `failure_kind: generation-error`. A malformed or empty envelope uses the same `status: failed`, `changed_files` path, `validation: not-performed`, and `failure_kind: generation-error` shape, with a non-empty diagnostic naming the detected contract violation, location, and verbatim offending value or `missing` field; if the invalid value supplied `failure_kind`, quote that value before reclassification. Persist the parent-authored classification and details in `.openspec.yaml`, set `overview.state: failed`, preserve the overview file, and suppress completion.
- **Stale-before-first-write** — every post-materialization source-modifying transaction (a re-invoked `/sai-2-design` or the supervised design phase) sets `overview.state: stale` immediately before the first effective source-artifact write and clears both diagnostic keys. A run that exits unsuccessfully before its first source write leaves the prior state unchanged. A run abandoned after the first source write conservatively remains stale without another write.
- **Exactly one regeneration per effective transaction** — after all requested edits complete and a successful `Continue` closes the feedback gate, regenerate exactly once through `materializing` → dispatch → `current`. A generator-run failure atomically leaves the generator-owned stale record, persists its exact `failure_kind` and non-empty `failure_details`, reports the overview path and `.openspec.yaml`, and sets `overview.state: stale`. A dispatch failure preserves the prior file, persists `dispatch-failed` and its diagnostic, reports only the state carrier in addition to the required changed-file union, and sets `stale`. Process loss and malformed or empty envelopes preserve whatever file state exists, persist parent-authored `generation-error` details, report the potentially affected overview path and `.openspec.yaml`, and set `stale`. The parent never writes, deletes, or edits `change-overview.md` in any failure mode.
- **Failure boundary** — whenever a generator or parent-owned overview-generation failure is mapped, present the applicable non-empty `failure_details` together with `failure_kind` to the user, identifying the source, artifact, dispatch, envelope, worker, or file location. Do not report only the state or a generic failure sentence, and do not emit the design completion sentence for a failed first materialization or failed regeneration.
- **No-effective-change protocol** — capture the exact persisted bytes of the five source sets (`proposal.md`, `specs/**/*.md`, `design.md`, `tasks.md`, `interfaces.md`) at run start, before any write; compare the final source set byte-for-byte after edits. This byte-exact comparison is the effective-change gate. Byte-identical sources mean no effective change and do not dispatch generation: verify the existing overview against the captured sources and restore `overview.state: current` only when complete and consistent, clearing both diagnostics. Verification failure regenerates. Pre-transaction `unmaterialized`/absent and `failed` states always materialize at `Continue`; pre-transaction `materializing` uses interrupted reconciliation.
- **Interrupted reconciliation and backfilled changes** — a pre-existing `materializing` state is reconciled only by a writable design-worker transaction: verify the overview against current sources, commit `current` when complete and consistent, or mark `failed`/regenerate otherwise. A materializing state with absent diagnostic keys means the attempt was interrupted before failure classification; it is never success and never reuses an older diagnostic. Backfilled changes carry no `overview.state` key and have no overview lifecycle.
- **Closed result envelope mapping** — generator-run results carry exactly `status` (`success|failed`), `changed_files`, `validation` (`passed|failed`), `failure_details`, and `failure_kind` (`none|blocking-contradiction|validation-failed|generation-error`). Parent-authored dispatch and contract-violation results preserve the same five fields with `validation: not-performed` and the closed `failure_kind` vocabulary. Treat unknown fields, unknown status, missing mandatory fields, an empty result, or empty `failure_details` on `status: failed` as an output-contract violation, never as success. Persist the parent-authored diagnostic and set the materialization-history-dependent state without modifying `change-overview.md`.

On `continue_after_notice`, resume from the notice without asking for input.
For reconstruction, use `opaque_input_history`, `pending_feedback`,
`fast_track_banner_emitted`, `resolved_change_name`, and the original envelope.

Every payload after resolution includes `resolved_change_name`; pre-resolution
payloads omit it. A design notice contains only `event`, `message`, and
`changed_files`. A terminal payload contains `summary` and `changed_files`.

The implementation-worker fallback is outside this worker; the coordinator
handles that lifecycle boundary.
