# Design Worker

Fetch @sai/policies/verified-precondition-handback.md
Fetch @sai/orchestration/worker-core.md and follow it exactly.
Fetch @sai/commands/design/steps/common.md and keep it in force for the entire run.

## Invocation Envelope

The worker receives exactly one opaque string and derives invocation-scoped values from it:

- `arguments_value`: `$ARGUMENTS` exactly as received from the coordinator
- `overview_language`: worker-owned invocation state derived from the optional flag after parsing; when the flag is absent, leave the value `unresolved`, never synthesize `English`, and never write the value to an artifact or configuration file.
- `supervised`: worker-owned invocation state derived from the bare `--supervised` flag after parsing; when the flag is absent, set it to `false`, and never write the value to an artifact or configuration file.

Every post-resolution lifecycle terminal result carries the current `overview_language` — including the `unresolved` value when the option is absent — alongside its normal lifecycle metadata; the generator result envelope remains separate and unchanged. Design notices and progress events retain their exact closed shapes from `@sai/orchestration/worker-core.md` and MUST NOT include `overview_language` or other lifecycle metadata. Every post-resolution `failed` result also carries the current selected `overview_language`, a worker-authored `failure_class`, and boolean `unrecoverable`; selected-language failures retain that metadata, while an absent language remains unresolved and does not synthesize an overview.

## Parsing and Resolution

Parse invocation-scoped options before change resolution.

- Scan `arguments_value` for the option token `--overview-lang <language>`; raw presence is the opt-in signal.
- Remove only the option and its value before resolving the change name.
- A change-consuming invocation requires the change name before the option. If parsing leaves no change name, return a clear missing-change-name validation result and never treat the language value as the change name.
- `--fast-track` is recognized independently and remains active in either order.
- The cleaned arguments and selected `overview_language` are invocation-scoped and never persisted.

After these existing parse rules, recognize bare `--supervised` alongside `--fast-track` and `--overview-lang <language>`. It is order-independent among flags after the change name: `{name} --fast-track --supervised` and `{name} --supervised --fast-track` are both accepted, as are `{name} --overview-lang <language> --supervised` and `{name} --supervised --overview-lang <language>`. Strip `--supervised` before change-name finalization, set invocation-scoped `supervised: true` when it is present and `supervised: false` when it is absent, never persist it, and do not verify dispatcher provenance. The name-first design envelope therefore accepts either fast-track/supervision flag order without changing the resolved name.

If `--fast-track` is present in the combined envelope, activate the signal, remove the token from its source value, and return the design notice carrying `message: > FAST-TRACK MODE ACTIVE` once per session unless reconstruction says `fast_track_banner_emitted: true`, or `supervised` is true. On the supervised route no coordinator is present and Explore owns the chained-segment banner, so this worker returns no notice and the invocation still yields exactly one visible activation confirmation. The notice is a returned nonterminal result, not a line printed inside this session; the coordinator prints it and resumes the worker with `continue_after_notice`.
Fetch @sai/policies/prereqs-paths.md

When `arguments_value` is empty, run the change picker; otherwise use it directly.
Strip any remaining `--fast-track` or `--supervised` from the resolved name and trim it.

This phase parses `--supervised` positionally after the change name, which diverges deliberately from the spec phase's leading-marker-line grammar. The design envelope is name-first, so a leading marker line would have to precede the name the envelope opens with. The divergence is recorded rather than unified; neither grammar is being migrated to the other.

For zero changes return the established no-active-changes failure. For one,
ask `Use change '{name}'?` with ordered yes/no options; yes resolves and no
cancels. For multiple changes ask `Which change?`, preserve CLI order, and
repeat the same request for invalid input without a retry cap.

Verify `proposal.md` and at least one `specs/**/*.md`. Missing artifacts return
the established change-not-found failure. Stamp the specs approval
automatically — never ask — writing `approval.specs.approved_at` only when it is
absent or empty and `approval.specs.notes` as an empty string, and handle
amendments per @sai/commands/design/steps/design.md (Spec-problem handling).

## Progress Reporting

The startup act is one batch: it parses fast-track, resolves the change, stamps the specs approval, and commits the selected immutable plan. The startup event carries every step id completed by that one batch, and no later act changes the immutable plan.

Fetch @sai/commands/design/phase-contract.md and use its canonical `DesignProgressPlan` variants and its canonical step-machine routing. This worker does not redeclare them, add a third plan, or alter them after startup.

Select the immutable progress plan exactly once before the startup event, using raw token presence only: a present `--overview-lang` token selects the opted-in six-step plan, and an absent token selects the unopted five-step plan. Malformed, missing-value, and duplicate occurrences remain present for this selection; this worker alone validates them before resolution, and no other surface halts them first.

Immediately before the first effective source-artifact write, set the overview lifecycle state to stale; this is the stale-before-first-write boundary.



Return exactly one progress event per completed act after change resolution
completes, per
`@sai/orchestration/worker-core.md`'s Nonterminal Result Transport.
- Return each progress event and the fast-track notice as the worker's result; the turn ends there, and the coordinator resumes the worker with `continue_after_progress` or `continue_after_notice`.
- Composing either event as text inside this session marks nothing and prints nothing to the user.
- The startup act must pass before dispatching any budget-explorer, writing `design.md`, or beginning research.
- The startup act — fast-track parsing, resolution, and stamping the specs approval — completes `prereqs-resolution`; the gate has no standalone step or `skipped` field. Per `@sai/orchestration/worker-core.md` § Step-machine task disclosure, it reports in one event together with `research`, the step the task-disclosure pointer names.
- Codebase research and Open Question resolution report `research`.
- Writing `design.md` reports `design`.
- Writing `tasks.md` reports `tasks`.
- Writing and verifying `interfaces.md` reports `interfaces`.
- Successful overview materialization or regeneration that commits `overview.state: current` reports `overview`.
- Report ids in plan order and list every path written since the preceding result.
- Progress marks are monotonic.
- Never emit before resolution or in place of the one terminal lifecycle status.
- Emit one progress event per completed batch; the research, design, tasks, and interfaces writes are separate ordered progress batches with only newly changed paths.
- Each progress event's `changed_files` lists every path written since the preceding result.
- The run always closes with exactly one terminal lifecycle status.

The selected plan gates overview generation. Without `--overview-lang`, the worker performs no generation at `Continue`, emits no `overview` progress event, and does not synthesize English or create failure metadata for a skipped attempt. If this invocation modifies sources for an existing current overview, mark it stale immediately before the first effective source write under **Stale-before-first-write**; do not claim it remains current. A valid selected language is carried into the opted-in generation continuation; only that route generates, emits `overview` progress, or records generation failures.

## Active Step Execution

Instruction stretches are delivered just-in-time, one step file at a time. Each progress-event continuation carries one pointer line — `Active step: <id> — follow <path>` — naming exactly the step to execute next; execute only that named step, following its file exactly, and never prefetch, open, or follow any other step instruction file. Step-file paths exist solely as coordinator continuation lines; this contract plus common.md is the sealed initial surface, and `prereqs-resolution` runs from it before the first progress event with the first delivered pointer targeting research. A continuation without a pointer line (artifact feedback, recovery) leaves the active step unchanged in this continuous session. The one exception is a generation-trigger or overview-recovery continuation that names `@sai/commands/design/steps/overview.md`: load that file, and only it, when it is not already loaded. Steps never widen this contract: status returns, progress reporting, changed_files accounting, and failure classification apply unchanged while any step executes.

## Planning

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

- Retain the previous complete `design.md` text in invocation-scoped state before applying feedback and regenerating artifacts.
- Extract the complete `## Target State` block — from the `## Target State` heading through the start of the next top-level section — from both the previous and the regenerated `design.md`.
- Normalize the two extracted blocks by converting CRLF and CR line endings to LF and removing trailing whitespace from every line.
- Preserve all other text and ordering.
- Present the updated Architecture Snapshot immediately before the next feedback loop only when the normalized Target State blocks differ.
- Identical normalized blocks — or feedback that changes only Context, Decisions, Risks, or other non-Target-State prose — omit the snapshot for that iteration.
- The comparison input is the extracted block, never the whole `design.md`.
- The terminal `summary` includes the current Architecture Snapshot on the initial iteration and after a later normalized Target State change, and omits it after identical regeneration or non-Target-State-only changes.
- Do not add a snapshot payload field or top-level artifact; generation, comparison, and summary composition are worker-owned.

### Reviewer ownership

- The worker SHALL NOT dispatch or own an artifact reviewer, an automatic review loop, review counters, retry outcomes, or user-requested reviewer passes.
- It owns no reviewer, findings-generation, counter, retry, or user-requested-review lifecycle.
- After the artifacts are verified and the `interfaces` progress event has been emitted, return the pre-gate terminal.
- Dispatch no automatic reviewer regardless of `supervised`.

- The supervised selector Explore carve-out is selector-only.
- It has no adapter progress plan and worker progress is plan-independent; explore carries no review-evidence panel entries, and design progress is worker-independent with no idea-list review item.
- The mode-dependent gate behavior defined by `sai/policies/artifact-feedback-gate.md` is: interactive or omitted mode keeps the coordinator-owned gate at iteration 0, while `mode = supervised` auto-proceeds without a picker through the deferred gate.
- The worker neither presents nor suppresses the picker, never receives, branches on, evaluates, or handles `mode`, and gains no lifecycle field or picker logic.

### Overview lifecycle guard

The overview lifecycle rules (materialization, regeneration, failure mapping, bounded recovery, state tables) live in `@sai/commands/design/steps/overview.md`, loaded only when the coordinator's `overview` pointer, generation-trigger continuation, or overview-recovery continuation names it. Two rules fire during any source write and stay here:

- **Stale-before-first-write** — every post-materialization source-modifying transaction (a re-invoked `/sai-2-design` or the supervised design phase) sets `overview.state: stale` and clears `overview.failure_kind` and `overview.failure_details` immediately before the first effective source-artifact write, without loading the overview step and without regenerating; include `.openspec.yaml` in `changed_files` when a key is written. A run that exits before its first source write leaves the prior state unchanged; a run abandoned after it is conservatively stale without another write. Backfilled changes carry no `overview.state` key and have no overview lifecycle.
- **No-effective-change capture** — capture the exact persisted bytes of the five source sets (`proposal.md`, `specs/**/*.md`, `design.md`, `tasks.md`, `interfaces.md`) at run start, before any write. A run whose final sources are byte-identical keeps the prior overview state; the verification and restore rule is in the overview step.

For reconstruction, use the original `arguments_value`, `opaque_input_history`, `pending_feedback`,
`fast_track_banner_emitted`, `resolved_change_name`, `active_step_id`, and the
original envelope. The `overview_language` value is re-derivable from raw
`arguments_value`.

Every payload after resolution includes `resolved_change_name`; pre-resolution
payloads omit it. The closed result shapes remain single-sourced in
`@sai/orchestration/worker-core.md`: a notice is exactly `event`,
`message`, and `changed_files`; a progress event is exactly `event`,
`step_ids`, and `changed_files`; terminal payloads carry their
closed status fields, including `summary` and `changed_files`. Do not add
overview-language or other lifecycle metadata to notices or progress events.

The implementation-worker fallback is outside this worker; the coordinator
handles that lifecycle boundary.

### Compact contract tables

#### Invocation flag grammar

| input form | worker action |
| --- | --- |
| no `--overview-lang` token | keep `overview_language: unresolved`; use the five-step plan and no-generation terminal |
| one `--overview-lang <language>` token | consume one non-empty value, validate it, and use the six-step plan |
| missing value, option in value position, malformed occurrence, or duplicate | return a pre-resolution validation failure; do not resolve or dispatch |
| `--fast-track` or `--supervised` in either supported order | parse independently and strip only that marker |


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

Outside recovery, preserve the canonical progress plan, feedback behavior,
overview lifecycle, and ordinary replacement fallback unchanged. Replacement dispatch remains coordinator-owned and is not a
recovery repair path; no recovery rule widens the worker's authorized files or
changes the existing terminal rules.
