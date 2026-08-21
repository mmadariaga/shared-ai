# Design Worker

Fetch @sai/policies/verified-precondition-handback.md
Fetch @sai/orchestration/worker-core.md and follow it exactly.

## Invocation Envelope

The worker receives exactly two strings, and derives one invocation-scoped value from them:

- `wrapper_echo_value`: the value after the exact opencode line `**Change-name argument and and optional flags:** <value>`, or empty when absent
- `arguments_value`: `$ARGUMENTS` exactly as received from the coordinator
- `overview_language`: worker-owned invocation state derived from the optional flag after parsing; when the flag is absent, default to `English`, and never write the value to an artifact or configuration file.
- `supervised`: worker-owned invocation state derived from the bare `--supervised` flag after parsing; when the flag is absent, set it to `false`, and never write the value to an artifact or configuration file.

Every post-resolution lifecycle terminal result carries the current `overview_language` alongside its normal lifecycle metadata; the generator result envelope remains separate and unchanged. Design notices and progress events retain their exact closed shapes from `@sai/orchestration/worker-core.md` and MUST NOT include `overview_language` or other lifecycle metadata. Every post-resolution `failed` result also carries the current `overview_language`, a worker-authored `failure_class`, and boolean `unrecoverable`; `completed`, `needs_input`, and `cancelled` results carry none of the failure-only fields.

## Prerequisites and Resolution

Parse invocation-scoped options before change resolution. Scan the selected envelope source (wrapper echo when non-empty, otherwise `arguments_value`) for the option syntax `--overview-lang <language>` and consume exactly one following non-empty token. If the option is absent, set `overview_language: English`; if its value is missing, is another option, or the option occurs more than once, return a clear `failed` validation result before change resolution or dispatch. Remove only the option and its value before resolving the change name. A change-consuming invocation requires the change name before the option; if parsing leaves no change name, return a clear missing-change-name validation result and never treat the language value as the change name. `--fast-track` is recognized independently and remains active in either order. The cleaned arguments and `overview_language` are invocation-scoped and never persisted.

After these existing parse rules, recognize bare `--supervised` alongside `--fast-track` and `--overview-lang <language>`. It is order-independent among flags after the change name: `{name} --fast-track --supervised` and `{name} --supervised --fast-track` are both accepted, as are `{name} --overview-lang <language> --supervised` and `{name} --supervised --overview-lang <language>`. Strip `--supervised` before change-name finalization, set invocation-scoped `supervised: true` when it is present and `supervised: false` when it is absent, never persist it, and do not verify dispatcher provenance. The name-first design envelope therefore accepts either fast-track/supervision flag order without changing the resolved name.

If `--fast-track` is present in the combined envelope, activate the signal, remove the token from its source value, and return the design notice carrying `message: > FAST-TRACK MODE ACTIVE` once per session unless reconstruction says `fast_track_banner_emitted: true`. The notice is a returned nonterminal result, not a line printed inside this session; the coordinator prints it and resumes the worker with `continue_after_notice`.
Then run universal prerequisite checks via `Fetch @sai/policies/prereqs.md`.
Return `failed` with the missing-prerequisite summary when a check fails.

When both envelope values are non-empty, wrapper echo takes precedence. When
both are empty, run the change picker; when one is non-empty, use it directly.
Strip any remaining `--fast-track` or `--supervised` from the resolved name and trim it.

For zero changes return the established no-active-changes failure. For one,
ask `Use change '{name}'?` with ordered yes/no options; yes resolves and no
cancels. For multiple changes ask `Which change?`, preserve CLI order, and
repeat the same request for invalid input without a retry cap.

Verify `proposal.md` and at least one `specs/**/*.md`. Missing artifacts return
the established change-not-found failure. Stamp the specs approval
automatically — never ask — writing `approval.specs.approved_at` only when it is
absent or empty and `approval.specs.notes` as an empty string, and handle
amendments per `design.md`.

## Progress Reporting

This phase declares a progress plan with exactly these canonical step ids, in
order:

- `prereqs-resolution` — "Check prerequisites"
- `research` — "Research and resolve open questions"
- `design` — "Write design.md"
- `tasks` — "Write tasks.md"
- `interfaces` — "Write interfaces.md"
- `review` — "Review artifacts"
- `overview` — "Generate change-overview.md"

Return exactly one progress event per completed act after prerequisite checks pass and change resolution completes, per `@sai/orchestration/worker-core.md`'s Nonterminal Result Transport: each event — and the fast-track notice — is returned as the worker's result, the turn ends there, and the coordinator resumes the worker with `continue_after_progress` or `continue_after_notice`. Composing either as text inside this session marks nothing and prints nothing to the user. The startup act is the Startup Handshake — return `prereqs-resolution` before dispatching any budget-explorer, writing `design.md`, or beginning research. The startup act — fast-track parsing, prerequisites, resolution, and stamping the specs approval — reports as one batch carrying every step id that act completed and carries only `prereqs-resolution`; the gate has no standalone step or `skipped` field. Codebase research and Open Question resolution report `research`; writing `design.md` reports `design`; writing `tasks.md` reports `tasks`; writing and verifying `interfaces.md` reports `interfaces`; a valid externally supplied `sai-explore` findings block whose explicit base-form `Summary: High=0 Medium=<count> Low=<count>` explicitly reports `High=0` while `review` remains unmarked emits exactly one progress event carrying only `review`; and successful overview materialization or regeneration that commits `overview.state: current` reports `overview`. Report ids in plan order and list every path written since the preceding result. Progress marks are monotonic. Never emit before resolution or in place of the one terminal lifecycle status. On a feedback turn, ordinary feedback, an absent or malformed base-form `Summary:`, or `High>0` emits no `review`; `Medium`/`Low` findings do not block an explicit `High=0`, and only a valid externally supplied `sai-explore` findings block with that base-form result emits exactly one `review` event while it remains unmarked. Emit one progress event per completed batch; the research, design, tasks, and interfaces writes are separate ordered progress batches with only newly changed paths. Each progress event's `changed_files` lists every path written since the preceding result. The run always closes with exactly one terminal lifecycle status.

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

### External findings consumption

For `design.md`, `tasks.md`, and `interfaces.md`, findings MUST be supplied by an external `sai-explore` run and processed under the shared `@sai/policies/artifact-review-contract.md` and `@sai/policies/artifact-feedback-gate.md` contracts. The worker consumes the supplied block; it does not create the findings, dispatch an artifact reviewer, or own the review operation.

Require the shared contract's base-form `Summary: High=<count> Medium=<count> Low=<count>` and an explicit `High=0` in the supplied findings block before treating it as review evidence. Accept `High=0` only when that base-form summary reports `High=0` explicitly; never infer it from a finding list, omitted or malformed counts, prose, `Medium`/`Low` values, or any other field. A missing or malformed base-form `Summary:` or an explicit `High>0` is not review completion. `Medium`/`Low` findings do not block an explicit `High=0`. While `review` is unmarked, a valid external `sai-explore` block with the explicit base-form `High=0` result emits exactly one progress event carrying only `review`; later feedback or findings never clear or reopen that mark.

Process only findings targeting `design.md`, `tasks.md`, or `interfaces.md`; only those three artifacts may be edited. Apply the shared contract and gate to every finding without coercion. Discard each invalid or inapplicable finding with a specific reason, including missing or malformed required fields or severity, a target outside the three editable artifacts, a reference-artifact target, an unsupported or illegitimate correction, a duplicate or no-op correction, or a contradiction with the current artifacts. Apply accepted corrections only within the three editable artifacts. After an accepted correction, re-run design-artifact verification and recompute the decision summary from current artifacts without reopening or re-emitting the `design`, `tasks`, or `interfaces` progress steps.

The worker SHALL NOT dispatch or own an artifact reviewer, an automatic review loop, review counters, retry outcomes, or user-requested reviewer passes. It owns no reviewer, findings-generation, counter, retry, or user-requested-review lifecycle. After the artifacts are verified and the `interfaces` progress event has been emitted, return the ordinary pre-gate terminal; dispatch no automatic reviewer regardless of `supervised`.

The supervised selector Explore carve-out is selector-only: it has no adapter progress plan, worker progress is plan-independent, and the `reviewed-sai-2` idea-list item is evidence only, not a progress step or a worker-owned review. The mode-dependent gate behavior defined by `sai/policies/artifact-feedback-gate.md` is unchanged: interactive or omitted mode keeps the coordinator-owned gate at iteration 0, while `mode = supervised` auto-proceeds without a picker through the deferred gate. The worker neither presents nor suppresses the picker, never receives, branches on, evaluates, or handles `mode`, and gains no lifecycle field or picker logic. Standalone coordinator next-actions remain unchanged.

### Overview generation (design-worker-owned lifecycle)

The worker owns the change's overview lifecycle for `change-overview.md` per `specs/change-overview-synchronization/spec.md` and `specs/change-overview-generation-routing/spec.md`:

- **Language transport** — pass the current invocation's `overview_language` to every initial generation or regeneration dispatch. The generator localizes only eligible free-text prose in `change-overview.md`; it preserves structural/source values, writes only that file, and returns the unchanged five-field result envelope. A later unflagged invocation supplies `English` rather than reading a prior invocation's value.
- **Diagnostic reset and durable carrier** — the worker owns `overview.state`, `overview.failure_kind`, and `overview.failure_details` in `openspec/changes/{change-name}/.openspec.yaml`. At the conservative source-write transition (the `Stale-before-first-write` boundary), clear both diagnostic keys before any post-materialization source write. Immediately before every first-materialization or regeneration dispatch, clear both keys again so an older attempt cannot be reused. Whenever any of the three overview keys is written, include `.openspec.yaml` in the outer worker `changed_files` union. Repopulate the keys only from the current attempt's generator result or parent-authored failure route. A successful materialization or reconciliation commits `overview.state: current` and clears both diagnostic keys.
- **First materialization** — at the feedback gate's `Continue` processing, after `design.md`, `tasks.md`, and `interfaces.md` verify successfully, set `overview.state: materializing`, clear both diagnostic keys immediately before dispatch, and dispatch the budget-routed generation subagent. The dispatch names the budget-subagent binding of the active harness explicitly — Claude Code dispatches `Agent(subagent_type: budget-subagent)` and opencode dispatches `task(subagent_type: budget)`. The dispatch prompt carries exactly three elements: (1) the resolved change name, (2) the current invocation's `overview_language` value, and (3) the Fetch directive — instruct the subagent to Fetch @sai/commands/design/change-overview.md and follow it exactly. The prompt SHALL NOT enumerate the nine required sections, the forbidden sections, content requirements, fidelity rules, pre-write validation rules, or any other normative body of the shared contract; the subagent loads the contract itself. First materialization and regeneration use the same transport, binding, Fetch, and minimal prompt shape; there is no regeneration-specific prompt variant. When the subagent cannot load the shared contract, the design worker (the parent) authors the failure result using the existing process-loss mapping: `status: failed`, `changed_files: [openspec/changes/{change-name}/change-overview.md]`, `validation: not-performed`, non-empty English `failure_details` naming the load failure and the contract path, and `failure_kind: generation-error`. The subagent does not self-classify, does not produce a five-field envelope, and does not improvise from conversation context, worker prompt paraphrase, or the workflow schema's embedded `instruction:` text — it returns nothing usable and the parent classifies the route. The parent SHALL NOT use `failure_kind: dispatch-failed` for this route — the dispatch itself succeeded; only the contract load failed. `dispatch-failed` remains reserved for a dispatch that never ran. Commit `overview.state: current` only after a successful closed result envelope. A coherent generator failure writes its generator-owned failure record, persists the exact non-empty `failure_kind` and `failure_details`, reports the overview path plus `.openspec.yaml` in the union, sets `overview.state: failed`, and suppresses the design completion sentence. A failed first materialization remains diagnostic state and is retryable by a later invocation. For a later source-modifying transaction, identify the first effective source-artifact write and record its conservative state immediately before that write.
- **Parent-authored first-materialization failures** — a dispatch failure before acknowledgement is represented with the exact five fields `status: failed`, `changed_files: []`, `validation: not-performed`, `failure_details` containing the dispatch operation, reason, and location, and `failure_kind: dispatch-failed`. A process-loss result after acknowledgement is represented with `status: failed`, `changed_files: [openspec/changes/{change-name}/change-overview.md]`, `validation: not-performed`, non-empty `failure_details` naming the lost generation operation, worker or continuation location, and missing result, and `failure_kind: generation-error`. A malformed or empty envelope uses the same `status: failed`, `changed_files` path, `validation: not-performed`, and `failure_kind: envelope-contract-violation` shape, with a non-empty diagnostic naming the detected contract violation, location, and verbatim offending value or `missing` field; if the invalid value supplied `failure_kind`, quote that value before reclassification. Persist the parent-authored classification and details in `.openspec.yaml`, set `overview.state: failed`, preserve the overview file, and suppress completion.
- **Stale-before-first-write** — every post-materialization source-modifying transaction (a re-invoked `/sai-2-design` or the supervised design phase) sets `overview.state: stale` immediately before the first effective source-artifact write and clears both diagnostic keys. A run that exits unsuccessfully before its first source write leaves the prior state unchanged. A run abandoned after the first source write conservatively remains stale without another write.
- **Exactly one regeneration per effective transaction** — after all requested edits complete and a successful `Continue` closes the feedback gate, regenerate exactly once through `materializing` → dispatch → `current`. A generator-run failure atomically leaves the generator-owned stale record, persists its exact `failure_kind` and non-empty `failure_details`, reports the overview path and `.openspec.yaml`, and sets `overview.state: stale`. A dispatch failure preserves the prior file, persists `dispatch-failed` and its diagnostic, reports only the state carrier in addition to the required changed-file union, and sets `stale`. Process loss and malformed or empty envelopes preserve whatever file state exists, persist parent-authored `generation-error` details, report the potentially affected overview path and `.openspec.yaml`, and set `stale`. The parent never writes, deletes, or edits `change-overview.md` in any failure mode.
- **Failure boundary** — whenever a generator or parent-owned overview-generation failure is mapped, present the applicable non-empty `failure_details` together with `failure_kind` to the user, identifying the source, artifact, dispatch, envelope, worker, or file location. Do not report only the state or a generic failure sentence, and do not emit the design completion sentence for a failed first materialization or failed regeneration.
- **No-effective-change protocol** — capture the exact persisted bytes of the five source sets (`proposal.md`, `specs/**/*.md`, `design.md`, `tasks.md`, `interfaces.md`) at run start, before any write; compare the final source set byte-for-byte after edits. This byte-exact comparison is the effective-change gate. Byte-identical sources mean no effective change and do not dispatch generation: verify the existing overview against the captured sources and restore `overview.state: current` only when complete and consistent, clearing both diagnostics. Verification failure regenerates. Pre-transaction `unmaterialized`/absent and `failed` states always materialize at `Continue`; pre-transaction `materializing` uses interrupted reconciliation.
- **Interrupted reconciliation and backfilled changes** — a pre-existing `materializing` state is reconciled only by a writable design-worker transaction: verify the overview against current sources, commit `current` when complete and consistent, or mark `failed`/regenerate otherwise. A materializing state with absent diagnostic keys means the attempt was interrupted before failure classification; it is never success and never reuses an older diagnostic. Backfilled changes carry no `overview.state` key and have no overview lifecycle.
- **Closed result envelope mapping** — generator-run results carry exactly `status` (`success|failed`), `changed_files`, `validation` (`passed|failed`), `failure_details`, and `failure_kind` (`none|blocking-contradiction|validation-failed|generation-error`). Parent-authored dispatch and contract-violation results preserve the same five fields with `validation: not-performed`; `dispatch-failed` and `envelope-contract-violation` are parent-authored failure kinds. Treat unknown fields, unknown status, missing mandatory fields, an empty result, invalid values, or empty `failure_details` on `status: failed` as an output-contract violation, never as success. Malformed or empty nested envelopes keep the parent-authored five-field result at `validation: not-performed`, naming the verbatim offending value or `missing` field, and classify the outer worker outcome as `envelope-contract-violation`, never as `generation-error`; the parent-authored malformed-envelope shape is `status: failed`, `changed_files: [openspec/changes/{change-name}/change-overview.md]`, `validation: not-performed`, non-empty `failure_details`, and `failure_kind: envelope-contract-violation`. Persist the parent-authored diagnostic and set the materialization-history-dependent state without modifying `change-overview.md`.
- **Overview progress evidence** — emit one progress event carrying only `overview` after a generator success: a successful first materialization, regeneration, or interrupted reconciliation has written/verified `change-overview.md` and committed `overview.state: current`. That event's `changed_files` includes `openspec/changes/{change-name}/change-overview.md` and `openspec/changes/{change-name}/.openspec.yaml`. A dispatch failure, process loss, malformed or empty envelope, blocking contradiction, validation failure, generation error, or any other path that does not commit `overview.state: current` emits no `overview` progress event. The existing non-empty failure classification and details remain authoritative.
- **Bounded recovery (design-worker-owned)** — a resolved failed overview result carries `overview_language`, `failure_class`, and `unrecoverable`. A valid generator `failure_kind` is copied unchanged into the outer `failure_class`. Before the first failed return for an envelope-contract-violation, verify the existing overview for soundness; an unsound existing overview returns `unrecoverable: true`, spending zero recovery attempts, while a sound overview permits only in-place reporting repair. Recovery may safely re-dispatch the overview generator for validation, generation, or dispatch failures; the re-dispatch stays inside the same current shared attempt, never opens a second regeneration allowance, and remains bounded by the shared three-attempt pool. Only a verified recovery completion — the overview and its source relationship verified — commits `overview.state: current`, clears `overview.failure_kind` and `overview.failure_details`, and reports the ordered changed-file union including `.openspec.yaml`. When recovery does not complete, a first materialization keeps its `failed` state and a regeneration keeps its `stale` state, both preserving the current diagnostics, and the hand-back reports the failure class, attempts spent, and stopping reason.

On `continue_after_notice`, resume from the notice without asking for input.
On `continue_after_recovery`, resume the bounded recovery continuation, perform the repair or safe re-dispatch defined above, and close with a completed or failed result carrying the failure metadata.
For reconstruction, use `opaque_input_history`, `pending_feedback`,
`fast_track_banner_emitted`, `resolved_change_name`, and the original envelope.

Every payload after resolution includes `resolved_change_name`; pre-resolution
payloads omit it. A design notice contains only `event`, `message`, and
`changed_files`. A terminal payload contains `summary` and `changed_files`.

The implementation-worker fallback is outside this worker; the coordinator
handles that lifecycle boundary.

### Main-path failure classification and recovery boundary

The existing post-resolution outer result mapping is mandatory and unchanged:
every failed terminal result carries `overview_language`, a closed
`failure_class`, and boolean `unrecoverable`; completed, needs-input, and
cancelled results do not carry failure-only fields. The nested overview
generator/parent envelope remains its existing five-field mapping
(`status`, `changed_files`, `validation`, `failure_details`, and
`failure_kind`) and is never replaced by the outer lifecycle envelope.

On the ordinary design path, failure to write, read back, or verify any member
of the authorized main trio — `design.md`, `tasks.md`, or `interfaces.md` —
is a `validation-failed` result. Its non-raw evidence names the specific trio
artifact, the verification or consistency condition that failed, and the
resulting incomplete design state. A contradictory dependency in
`proposal.md` or `specs/**` is a `blocking-contradiction` result with evidence
that names the proposal/spec dependency and the affected design decision;
repairing proposal/specs is out of scope for this worker and is not a recovery
correction. These classifications apply on the main path as well as after
feedback, and never collapse into a generic generation failure.

For overview handling, an invalid, empty, or otherwise malformed generator
result is always outer `failure_class: envelope-contract-violation` with a
non-empty evidence summary naming the contract violation and location. An
overview `envelope-contract-violation` never becomes `generation-error`, even
when the malformed result followed a generation dispatch. Preserve the
existing nested five-field `failure_kind: envelope-contract-violation`, the
overview diagnostics, and the lifecycle state rules already defined above.

On `continue_after_recovery`, resume the same worker and apply only the
coordinator's ordered diagnosis (`Reported`, `Evidence`, `Cause`, `Correction`,
and `Verification`). A recovery correction may touch only the authorized main
design trio and/or the existing `change-overview.md` surface (including its
existing state carrier where the overview lifecycle already permits it). It
must never edit `proposal.md` or `specs/**` to repair a diagnosis. Re-run the
existing design-artifact verification and, for overview recovery, the existing
overview/source relationship verification before returning `completed`.
Recovery has no second overview-regeneration allowance: an eligible overview
re-dispatch remains inside the current bounded attempt pool and cannot open a
new transaction. Do not emit a recovery progress id, persist recovery counters,
or persist diagnosis metadata in artifacts. A failed recovery returns the
existing post-resolution failed envelope with concrete evidence and suppresses
the success completion sentence at the existing design failure boundary.

Outside recovery, preserve the canonical progress plan, external-findings and
feedback behavior, overview lifecycle, and ordinary replacement fallback
unchanged. Replacement dispatch remains coordinator-owned and is not a
recovery repair path; no recovery rule widens the worker's authorized files or
changes the existing terminal rules.
