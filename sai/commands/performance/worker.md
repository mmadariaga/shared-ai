# Performance Worker

Fetch @sai/policies/verified-precondition-handback.md
Fetch @sai/orchestration/worker-core.md and follow it exactly.
Fetch @sai/policies/bounded-dispatch-retry.md and follow it for every delegated subagent dispatch.
Fetch @sai/commands/performance/steps/common.md and keep it in force for the entire run.

## Invocation Envelope

The worker receives exactly one opaque string:

- `arguments_value`: `$ARGUMENTS` exactly as received from the coordinator

Binding identifiers and continuation references are not worker input and must never be written to artifacts or returned.

## Change Resolution and Proposal Gate

Parse `arguments_value` per `options.md`: an optional change name, then the declared options. The first token that does not start with `--` and is not an option's value is the change name; a leading `--` token means no name was supplied. An unknown `--` option, a second positional value, an option missing its value, or a `--tier` value outside the declared set returns `failed` before any resolution, naming the token (a second positional value is answered with: the parent branch is passed as `--parent-branch <branch>`). When it supplies no name, run `openspec list --json`. For zero changes, return `failed` with exactly: "No active changes found. Run `/sai-1-spec` to create one." For one, ask `Use change '{name}'?` with ordered `yes` and `no` options; `yes` resolves and `no` returns `cancelled`. For multiple, ask `Which change?` with options in CLI order and repeat after invalid input without a retry cap. Do not scan parent conversation history.

After resolution, verify `proposal.md`. If it is missing, return `failed` with exactly `openspec/changes/{change-name}/proposal.md not found. Ensure the change name is correct and that /sai-1-spec has been run for this change.` Perform no audit analysis or durable write after a missing `proposal.md`.

Every post-resolution payload includes `resolved_change_name`. Every payload includes the current ordered duplicate-free `changed_files` list and a `summary` string. No payload contains artifact contents, continuation identifiers, or binding metadata.

## Steps

This phase declares a progress plan with exactly these canonical step ids, in order, each reported in the batch named here:

- `resolve-performance-scope` — "Resolve performance scope and tier" — the startup act (change selection + proposal gate + scope grammar + tier filter + runtime flag + parent); it must pass before dispatching any `budget-explorer`, running any diagnostic, or beginning tier analysis. It reports in one batch together with `map-stack-hot-paths`, per `@sai/orchestration/worker-core.md` § Step-machine task disclosure.
- `map-stack-hot-paths` — "Map stack and hot paths" — first batch. When it decides the audit does not apply (an empty diff is this case), the first batch also carries `audit-performance-tiers` and `resolve-diagnostics`; `close-performance-outcome` then writes the Not Applicable report and the run returns `completed`.
- `audit-performance-tiers` — "Resolve performance tier analysis" — the tier-analysis batch. Without `--runtime`, the batch also carries `resolve-diagnostics`.
- `resolve-diagnostics` — "Resolve diagnostics gate" — the diagnostics batch, with `--runtime`; reported completed when the gate is resolved, whether the authorized diagnostics run or are legitimately skipped.
- `close-performance-outcome` — "Close performance outcome" — the outcome batch, which ends with the terminal `completed`.

The report takes the shape defined in `sai/commands/performance/performance-report.template.md`, and `close-performance-outcome` writes it.

Return exactly one progress event per completed batch after change resolution completes, per `@sai/orchestration/worker-core.md`'s Nonterminal Result Transport: each event is returned as the worker's result, the turn ends there, and the coordinator resumes the worker with `continue_after_progress`. Composing the event as text inside this session marks nothing. Report ids in plan order; `changed_files` lists every path written since the preceding result. Never emit a progress event before resolution, in place of a terminal payload, or during a `needs_input` pause (the diagnostics authorization question is such a pause) — the run always closes with exactly one terminal lifecycle status.

Each progress-event continuation carries one pointer line — `Active step: <id> — follow <path>` — naming exactly the step to execute next. Execute exactly that step, following its file exactly; each step file is opened when its pointer arrives. This contract plus common.md is the sealed initial surface, and `resolve-performance-scope` runs from it before the first progress event, with the first delivered pointer targeting `map-stack-hot-paths`. A gated stage resolved by legitimate skip still reports its milestone, and the next delivered pointer advances past it without that step file executing. A continuation without a pointer line (picker answers) leaves the active step unchanged in this continuous session. Status returns, progress reporting, changed_files accounting, and failure classification apply unchanged while any step executes.

## Continuation and Reconstruction

Return `needs_input` for picker or diagnostic-authorization questions and continue the same performance operation with the exact answer. Return `cancelled` for a deliberate decline, and `failed` for blockers. Reconstruction uses only the original envelope, ordered changed-files union, exact opaque input history, and `resolved_change_name`; never package the prior journal or artifact contents.
