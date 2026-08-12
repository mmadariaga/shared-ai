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

For Architecture Snapshot presentation, retain the previous `interfaces.md` text in invocation-scoped state before worker-owned feedback edits. Apply the normalization and complete-effective-artifact comparison defined by `sai/instructions/design.md`. The existing terminal `summary` includes the current Architecture Snapshot on the initial iteration and after a later normalized interface change, and omits it after identical regeneration or `design.md`/`tasks.md`-only changes. Do not add a payload field; generation, comparison, and summary composition remain worker-owned.

### Overview generation (design-worker-owned lifecycle)

The worker owns the change's overview lifecycle for `change-overview.md` per `specs/change-overview-synchronization/spec.md` and `specs/change-overview-generation-routing/spec.md`:

- **Language transport** — pass the current invocation's `overview_language` to every initial generation or regeneration dispatch. The generator localizes only eligible free-text prose in `change-overview.md`; it preserves the existing structural/source values, writes only that file, and returns the unchanged five-field result envelope. A later unflagged invocation supplies `English` rather than reading a prior invocation's value.
- **First materialization** — at the feedback gate's `Continue` processing, after all source artifacts (`design.md`, `tasks.md`, `interfaces.md`) verify successfully: set `overview.state: materializing` in `openspec/changes/{change-name}/.openspec.yaml` immediately before dispatching the budget-routed generation subagent, and commit `overview.state: current` only after a successful closed result envelope. A failed first-materialization dispatch sets `overview.state: failed` (the coordinator suppresses the success terminal; a later re-invoked run retries first materialization from `failed`). The worker NEVER writes, deletes, or edits `change-overview.md` itself — the generator exclusively owns writes to that file; the worker only transitions `overview.state`.
- **Stale-before-first-write** — every post-materialization source-modifying transaction (a re-invoked `/sai-2-design`, the supervised design phase) sets `overview.state: stale` immediately before the run's first effective source-artifact write — never only at transaction end — so cancellation, worker failure, process loss, or chat abandonment at any later point conservatively leaves `stale` with no further execution point required. A run that exits unsuccessfully before its first source write leaves the prior state unchanged.
- **Exactly one regeneration per effective transaction** — after the requested edits complete and the run closes with a successful `Continue`, regenerate exactly once (via `materializing` → dispatch → `current`), reflecting the post-transaction sources. A regeneration failure from a generator that ran leaves the stale record the generator wrote (carrying the contradiction details on a blocking contradiction) and sets `stale`; a dispatch failure (the subagent never ran, parent-reported `failure_kind: dispatch-failed`) or process loss preserves the prior file and sets `stale`; a malformed or empty envelope (output-contract violation) preserves whatever file state exists and sets `stale` (regeneration) or `failed` (first materialization) — the parent never writes `change-overview.md` in any failure mode.
- **No-effective-change protocol** — capture the exact persisted bytes of the five source sets (`proposal.md`, `specs/**/*.md`, `design.md`, `tasks.md`, `interfaces.md`) at run start, before any write; after all edits, compare the final source set byte-exactly against the capture (any byte difference — including line-ending or trailing-whitespace drift — is an effective change and triggers the normal regeneration path). Byte-identical → no effective change: verify the existing `change-overview.md` against the captured current sources — section completeness, statement traceability, verbatim snapshot projection, manifest fold equality (the recomputed fold must equal the persisted `design.md` manifest) — and only then commit `overview.state: current` directly, with no `materializing` and no dispatch (a state-restoration transition). Verification failure (out-of-band divergence, stale record, partial file) regenerates. Pre-transaction `unmaterialized`/absent and `failed` states always materialize at `Continue`; pre-transaction `materializing` uses the interrupted-reconciliation path (verify the file against the current sources, commit `current` when complete and consistent, else mark `failed` or regenerate).
- **Backfilled changes** — carry no `overview.state` key; their overview status is not applicable.
- **Closed result envelope mapping** — the generator returns exactly `status` (`success|failed`), `changed_files`, `validation` (`passed|failed`), `contradiction_details`, and `failure_kind` (`none|blocking-contradiction|validation-failed|generation-error`); map each result deterministically per the transitions above, and treat an envelope with unknown fields, an unknown status, a missing mandatory field, or an empty result as an output-contract violation, never as success.

On `continue_after_notice`, resume from the notice without asking for input.
For reconstruction, use `opaque_input_history`, `pending_feedback`,
`fast_track_banner_emitted`, `resolved_change_name`, and the original envelope.

Every payload after resolution includes `resolved_change_name`; pre-resolution
payloads omit it. A design notice contains only `event`, `message`, and
`changed_files`. A terminal payload contains `summary` and `changed_files`.

The implementation-worker fallback is outside this worker; the coordinator
handles that lifecycle boundary.
