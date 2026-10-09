# Security Worker

Fetch @sai/policies/verified-precondition-handback.md
Fetch @sai/orchestration/worker-core.md and follow it exactly.
Fetch @sai/policies/bounded-dispatch-retry.md and follow it for every delegated subagent dispatch.
Fetch @sai/commands/security/steps/common.md and keep it in force for the entire run.

## Invocation Envelope

The worker receives exactly one opaque string:

- `arguments_value`: `$ARGUMENTS` exactly as received from the coordinator

Binding identifiers and continuation references are not worker input and must never be written to artifacts or returned.

## Change Resolution and Proposal Gate

Parse `arguments_value` as a change name plus the optional `--full`, `--path {dir}`, and parent-branch values accepted by `steps/common.md` § Scope. When it supplies no name, run `openspec list --json`. For zero changes, return `failed` with exactly: "No active changes found. Run `/sai-1-spec` to create one." For one, ask `Use change '{name}'?` with ordered `yes` and `no` options; `yes` resolves and `no` returns `cancelled`. For multiple, ask `Which change?` with options in CLI order and repeat after invalid input without a retry cap.

After resolution, verify `proposal.md`. If it is missing, return `failed` with exactly `openspec/changes/{change-name}/proposal.md not found. Ensure the change name is correct and that /sai-1-spec has been run for this change.` Perform no audit analysis or durable write after a missing `proposal.md`.

Every post-resolution payload includes `resolved_change_name`. Every payload includes the current ordered duplicate-free `changed_files` list. No payload contains artifact contents, continuation identifiers, or binding metadata.

## Steps

This phase declares a progress plan with exactly these canonical step ids, in order, each reported in the batch named here:

- `resolve-security-scope` — "Resolve security scope" — the startup act (change selection + proposal gate + scope flags + parent); it must pass before dispatching any `budget-explorer`, running any scanner, or beginning SAST or SCA work. It reports in one batch together with `discover-module-map`, per `@sai/orchestration/worker-core.md` § Step-machine task disclosure.
- `discover-module-map` — "Discover modules and trust boundaries" — first batch. When it decides the audit does not apply (an empty diff is this case), the first batch also carries `resolve-sast-analysis` and `resolve-sca`; `close-security-outcome` then writes the Not Applicable report and the run returns `completed`.
- `resolve-sast-analysis` — "Resolve SAST analysis" — the SAST batch. When the SCA gate admits no manifest, the SAST batch also carries `resolve-sca`.
- `resolve-sca` — "Audit dependencies" — the SCA batch, when the gate admits at least one manifest.
- `close-security-outcome` — "Close security outcome" — the outcome batch, which ends with the terminal `completed`.

Return exactly one progress event per completed batch after change resolution completes, per `@sai/orchestration/worker-core.md`'s Nonterminal Result Transport: each event is returned as the worker's result, the turn ends there, and the coordinator resumes the worker with `continue_after_progress`. Composing the event as text inside this session marks nothing. Report ids in plan order; `changed_files` lists every path written since the preceding result. Never emit a progress event before resolution, in place of a terminal payload, or during a `needs_input` pause — the run always closes with exactly one terminal lifecycle status.

Each progress-event continuation carries one pointer line — `Active step: <id> — follow <path>` — naming exactly the step to execute next. Execute exactly that step, following its file exactly; each step file is opened when its pointer arrives. This contract plus common.md is the sealed initial surface, and `resolve-security-scope` runs from it before the first progress event, with the first delivered pointer targeting `discover-module-map`. A gated stage resolved by legitimate skip still reports its milestone, and the next delivered pointer advances past it without that step file executing. A continuation without a pointer line (picker answers) leaves the active step unchanged in this continuous session. Status returns, progress reporting, changed_files accounting, and failure classification apply unchanged while any step executes.

## Continuation and Reconstruction

Return `needs_input` for picker questions and continue the same security operation with the exact answer. Return `cancelled` for a deliberate decline, and `failed` for blockers. Reconstruction uses only the original envelope, ordered changed-files union, exact opaque input history, and `resolved_change_name`; never package the prior journal or artifact contents.
