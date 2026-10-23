# Design Step — Overview

Overview continuation. This file fires only when the coordinator sends the overview continuation, which it does only when `--overview-lang` carried a valid language; without that option no continuation is sent and this file is never loaded. It is not a step of the `design-steps@1` machine: the continuation names this file explicitly, the change name, the language, and the report path. This file is the normative home of the overview lifecycle. The worker card keeps only the rules that fire during any source write: Stale-before-first-write and the run-start no-effective-change capture.

The generator receives the Fetch directive for `@sai/commands/design/change-overview.md` in its dispatch prompt and loads the contract itself. The worker derives `overview_language` from raw `arguments_value` and supplies it as invocation-scoped state to the generator.

## Overview generation (design-worker-owned lifecycle)

The worker owns the change's overview lifecycle for `change-overview.md`:

- **Language transport** — pass the current invocation's selected `overview_language` to every initial generation or regeneration dispatch only when `--overview-lang` is present and valid.
- The generator localizes only eligible free-text prose in `change-overview.md`.
- It preserves structural/source values, writes only that file, and returns the five-field result envelope.
- A later unflagged invocation leaves the language unresolved rather than supplying or synthesizing `English`, and never reads a prior invocation's value.
- **Opt-in** — the overview continuation is the opt-in: the coordinator sends it only for a valid `--overview-lang` language, so dispatch the generation subagent when it arrives.
- Without the option the worker receives no continuation: it does not enter `materializing`, dispatch or continue a generator, report overview work, or create/clear failure metadata solely because generation was skipped.
- Existing overviews are retained. A source-modifying invocation still marks a previously current overview stale at the first effective source write; a no-write invocation leaves its prior state intact.
- The detailed first-materialization dispatch rules below apply only to a valid opted-in route.
- **Diagnostic reset and durable carrier** — the worker owns `overview.state`, `overview.failure_kind`, and `overview.failure_details` in `openspec/changes/{change-name}/.openspec.yaml`. `overview.state` holds exactly one of `unmaterialized`, `materializing`, `failed`, `current`, or `stale`; on a non-backfilled change an absent key reads as `unmaterialized`.
- At the conservative source-write transition (the `Stale-before-first-write` boundary), clear both diagnostic keys before any post-materialization source write.
- Immediately before every first-materialization or regeneration dispatch, clear both keys again so an older attempt cannot be reused.
- Whenever any of the three overview keys is written, include `.openspec.yaml` in the report's `changed_files`.
- Repopulate the keys only from the current attempt's generator result or parent-authored failure route.
- A successful materialization or reconciliation commits `overview.state: current` and clears both diagnostic keys.
- **First materialization** — on the overview continuation, after `design.md`, `tasks.md`, and `interfaces.md` verify successfully, set `overview.state: materializing`.
- Clear both diagnostic keys immediately before dispatch and dispatch the budget-routed generation subagent.
- The dispatch names the budget-subagent binding of the active harness explicitly: Claude Code dispatches `Agent(subagent_type: budget-subagent)` and opencode dispatches `task(subagent_type: budget-subagent)`.
- The dispatch prompt carries exactly three elements: (1) the resolved change name, (2) the current invocation's `overview_language` value, and (3) the Fetch directive — instruct the subagent to Fetch @sai/commands/design/change-overview.md and follow it exactly.
- The prompt SHALL NOT enumerate the source mappings, content requirements, faithful-copy rule, pre-write validation rules, or any other normative body of the shared contract; the subagent loads the contract itself.
- First materialization and regeneration use the same transport, binding, Fetch, and minimal prompt shape.
- When the subagent cannot load the shared contract, the design worker (the parent) authors the failure result using the process-loss mapping: `status: failed`, `changed_files: [openspec/changes/{change-name}/change-overview.md]`, `validation: not-performed`, non-empty English `failure_details` naming the load failure and the contract path, and `failure_kind: generation-error`.
- The subagent does not self-classify, does not produce a five-field envelope, and does not improvise from conversation context, worker prompt paraphrase, or the workflow schema's embedded `instruction:` text — it returns nothing usable and the parent classifies the route.
- The parent SHALL NOT use `failure_kind: dispatch-failed` for this route — the dispatch itself succeeded; only the contract load failed.
- `dispatch-failed` applies only to a dispatch that never ran.
- Commit `overview.state: current` only after a successful closed result envelope.
- A coherent generator failure writes its generator-owned failure record, persists the exact non-empty `failure_kind` and `failure_details`, reports the overview path plus `.openspec.yaml` in `changed_files`, sets `overview.state: failed`, and reports `blocked`.
- A failed first materialization is diagnostic state and is retryable by a later invocation.
- For a later source-modifying transaction, identify the first effective source-artifact write and record its conservative state immediately before that write.
- **Parent-authored first-materialization failures** — a dispatch failure before acknowledgement is represented with the exact five fields `status: failed`, `changed_files: []`, `validation: not-performed`, `failure_details` containing the dispatch operation, reason, and location, and `failure_kind: dispatch-failed`.
- A process-loss result after acknowledgement is represented with `status: failed`, `changed_files: [openspec/changes/{change-name}/change-overview.md]`, `validation: not-performed`, non-empty `failure_details` naming the lost generation operation, worker or continuation location, and missing result, and `failure_kind: generation-error`.
- A malformed or empty envelope uses the same `status: failed`, `changed_files` path, `validation: not-performed`, and `failure_kind: envelope-contract-violation` shape, with a non-empty diagnostic naming the detected contract violation, location, and verbatim offending value or `missing` field.
- If the invalid value supplied `failure_kind`, quote that value before reclassification.
- Persist the parent-authored classification and details in `.openspec.yaml`, set `overview.state: failed`, preserve the overview file, and suppress completion.
- **Stale-before-first-write** — defined in the worker card's § Overview lifecycle guard, which fires before this step loads.
- **Exactly one regeneration per effective transaction** — after all requested edits complete and the continuation arrives, regenerate exactly once through `materializing` → dispatch → `current`.
- A generator-run failure atomically leaves the generator-owned stale record, persists its exact `failure_kind` and non-empty `failure_details`, reports the overview path and `.openspec.yaml`, and sets `overview.state: stale`.
- A dispatch failure preserves the prior file, persists `dispatch-failed` and its diagnostic, reports only the state carrier in addition to the required changed-file union, and sets `stale`.
- Process loss and malformed or empty envelopes preserve whatever file state exists, report the potentially affected overview path and `.openspec.yaml`, and set `stale`. Persist the parent-authored diagnostic as `generation-error` for process loss or `envelope-contract-violation` for a malformed or empty envelope.
- The parent never writes, deletes, or edits `change-overview.md` in any failure mode.
- **Failure boundary** — whenever a generator or parent-owned overview-generation failure is mapped, report `blocked` with the applicable non-empty `failure_details` and the `failure_kind` in `summary` and `notes`, identifying the source, artifact, dispatch, envelope, worker, or file location.
- Do not report only the state or a generic failure sentence, and never report `done` for a failed first materialization or failed regeneration.
- **No-effective-change protocol** — the run-start byte capture of the five source sets is in the worker card's § Overview lifecycle guard.
- Compare the final source set byte-for-byte after edits; this byte-exact comparison is the effective-change gate.
- Byte-identical sources mean no effective change and do not dispatch generation: verify the existing overview against the captured sources and restore `overview.state: current` only when complete and consistent, clearing both diagnostics.
- Verification failure regenerates.
- Pre-transaction `unmaterialized`/absent and `failed` states always materialize on the continuation; pre-transaction `materializing` uses interrupted reconciliation.
- **Interrupted reconciliation and backfilled changes** — a pre-existing `materializing` state is reconciled only by a writable design-worker transaction: verify the overview against current sources, commit `current` when complete and consistent, or mark `failed`/regenerate otherwise.
- A materializing state with absent diagnostic keys means the attempt was interrupted before failure classification; it is never success and never reuses an older diagnostic.
- Backfilled changes carry no `overview.state` key and have no overview lifecycle.
- **Closed result envelope mapping** — generator-run results carry exactly `status` (`success|failed`), `changed_files`, `validation` (`passed|failed`), `failure_details`, and `failure_kind` (`none|blocking-contradiction|validation-failed|generation-error`).
- Parent-authored dispatch and contract-violation results preserve the same five fields with `validation: not-performed`; `dispatch-failed` and `envelope-contract-violation` are parent-authored failure kinds.
- Treat unknown fields, unknown status, missing mandatory fields, an empty result, invalid values, or empty `failure_details` on `status: failed` as an output-contract violation, never as success.
- Malformed or empty nested envelopes keep the parent-authored five-field result at `validation: not-performed`, naming the verbatim offending value or `missing` field, and classify the failure as `envelope-contract-violation`, never as `generation-error`.
- The parent-authored malformed-envelope shape is `status: failed`, `changed_files: [openspec/changes/{change-name}/change-overview.md]`, `validation: not-performed`, non-empty `failure_details`, and `failure_kind: envelope-contract-violation`.
- Persist the parent-authored diagnostic and set the materialization-history-dependent state without modifying `change-overview.md`.
- **Overview report evidence** — report `status: done` only after a generator success.
- A successful first materialization, regeneration, or interrupted reconciliation has written/verified `change-overview.md` and committed `overview.state: current`.
- That report's `changed_files` includes `openspec/changes/{change-name}/change-overview.md` and `openspec/changes/{change-name}/.openspec.yaml`.
- A dispatch failure, process loss, malformed or empty envelope, blocking contradiction, validation failure, generation error, or any other path that does not commit `overview.state: current` reports `blocked`.
- A non-empty failure classification and details are authoritative.
- **Repair (coordinator-driven)** — a failed overview returns to you as a corrected instruction or a new worker, within the coordinator's budget of 3 attempts for the obstacle. A repair safely re-dispatches the overview generator for validation, generation, or dispatch failures, never opens a second regeneration allowance, and commits `overview.state: current`, clears `overview.failure_kind` and `overview.failure_details`, and reports `.openspec.yaml` only after the overview and its source relationship verify.
- Before the first `blocked` report for an envelope-contract-violation, verify the existing overview for soundness, and say in `notes` whether it is sound.
- When repair does not complete, a first materialization keeps its `failed` state and a regeneration keeps its `stale` state, both preserving the current diagnostics, and the report names the failure kind and the stopping reason.

## Compact contract tables

### Overview state machine

| lifecycle point | `overview.state` action |
| --- | --- |
| no overview continuation | keep the state reached by earlier source writes; do not create/clear diagnostics just for the skip |
| first effective source write | set `overview.state: stale` and clear both diagnostic keys |
| opted-in generation begins | set `overview.state: materializing` and clear both diagnostic keys |
| verified generation or reconciliation succeeds | set `overview.state: current` and clear both diagnostic keys |
| first-materialization failure | set `overview.state: failed`, preserve the overview, and persist diagnostics |
| regeneration failure | set `overview.state: stale`, preserve the overview, and persist diagnostics |

### Generator failure-kind mapping

| condition | nested `failure_kind` | reported failure kind |
| --- | --- | --- |
| valid blocking source contradiction | `blocking-contradiction` | unchanged |
| valid candidate validation failure | `validation-failed` | unchanged |
| valid generator/process failure | `generation-error` | unchanged |
| parent dispatch failure before acknowledgement | `dispatch-failed` | `dispatch-failed` |
| malformed or empty nested envelope | `envelope-contract-violation` | `envelope-contract-violation` |

The nested generator vocabulary is closed and remains the existing five-field
envelope; unknown fields, statuses, values, or failure kinds are never
reclassified as success. A missing-language precondition is not a generator
failure record and must not overwrite a valid pre-existing overview.
