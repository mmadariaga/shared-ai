# Review Worker

Fetch @sai/policies/verified-precondition-handback.md
Fetch @sai/orchestration/worker-core.md and follow it exactly.
Fetch @sai/policies/bounded-dispatch-retry.md and follow it for every delegated subagent dispatch.
Fetch @sai/commands/review/steps/common.md and keep it in force for the entire run.

## Invocation Envelope

The worker receives exactly one opaque string:

- `arguments_value`: `$ARGUMENTS` exactly as received from the coordinator

Binding identifiers and continuation references are not worker input and must never be written to artifacts or returned.

## Prerequisites and Resolution

Parse `arguments_value` as at most two positional values: change name, then optional parent branch. When it supplies no name, run `openspec list --json`. For zero changes, return the established no-active-changes failure. For one, ask `Use change '{name}'?` with ordered `yes` and `no` options; `yes` resolves and `no` returns `cancelled`. For multiple, ask `Which change?` with options in CLI order and repeat after invalid input without a retry cap. Do not scan parent conversation history.

After resolution, fetch `@sai/policies/prereqs.md` and enforce the OpenSpec CLI, `openspec/`, and `schema: sai-workflow` checks. Then verify `proposal.md`. If it is missing, return `failed` with exactly `openspec/changes/{change-name}/proposal.md not found. Ensure the change name is correct and that /sai-1-spec has been run for this change.` Perform no review analysis, mutation, or durable write after a prerequisite failure.

Every post-resolution payload includes `resolved_change_name`. Every payload includes the current ordered duplicate-free `changed_files` list. No payload contains artifact contents, continuation identifiers, or binding metadata.

## Progress Reporting

This phase declares a progress plan with exactly these canonical step ids, in order:

- `resolve-change` — "Resolve change"
- `establish-diff-scope` — "Resolve diff scope"
- `resolve-review-analysis` — "Resolve review analysis"
- `resolve-mutation-analysis` — "Resolve mutation-analysis gate"
- `close-review-outcome` — "Close review outcome"

Return exactly one progress event per completed batch after prerequisite checks pass and change resolution completes, whenever one or more plan steps complete, per `@sai/orchestration/worker-core.md`'s Nonterminal Result Transport: each event is returned as the worker's result, the turn ends there, and the coordinator resumes the worker with `continue_after_progress`. Composing the event as text inside this session marks nothing. The startup act (prerequisite checks + change resolution + proposal gate) reports as one batch carrying `resolve-change` and is the Startup Handshake — return it before dispatching any `budget-explorer` or `budget-subagent`, computing the diff, or beginning any review pass; the diff-scope batch carries `establish-diff-scope`; the review-analysis batch carries `resolve-review-analysis`; the mutation-analysis batch carries `resolve-mutation-analysis`, reported completed when the Pass 11 activation gate is resolved whether the applicable mutation path runs or is legitimately skipped; the outcome batch carries `close-review-outcome`. Before an early terminal outcome, report the completed resolution and scope milestones that led to it — an empty diff reports `establish-diff-scope` before returning the existing `cancelled` result. Report ids in plan order; `changed_files` lists every path written since the preceding result. Audit progress plans receive no Milestone Stamp annotation. Never emit a progress event before resolution, in place of a terminal payload, or during a `needs_input` pause — the run always closes with exactly one terminal lifecycle status.

## Active Step Execution

Instruction stretches are delivered just-in-time, one step file at a time. Each progress-event continuation carries one pointer line — `Active step: <id> — follow <path>` — naming exactly the step to execute next; execute only that named step, following its file exactly, and never prefetch, open, or follow any other step instruction file. Step-file paths exist solely as coordinator continuation lines; this contract plus common.md is the sealed initial surface, and `resolve-change` runs from it before the first progress event with the first delivered pointer targeting `establish-diff-scope`. A gated stage resolved by legitimate skip still reports its milestone, and the next delivered pointer advances past it without that step file executing. A continuation without a pointer line (picker answers) leaves the active step unchanged in this continuous session. Steps never widen this contract: status returns, progress reporting, changed_files accounting, and prerequisite handling apply unchanged while any step executes.

## Review

Execute only the active step named by the coordinator's most recent `Active step:` pointer line, following that step file exactly.

Detect the parent branch in this order: supplied parent, remote default, verified `master`, verified `main`. Compute name-status, stat, commit map, and `{parent}...HEAD` diff. If the diff is empty, return `cancelled` with exactly `No changes detected against {parent-branch}. Nothing to review.` For a diff over 500 LOC, do not load the full diff into the worker context; use at most eight read-only `budget-explorer` branches with explicit bounded output contracts.

Execute review passes 1-10 from the active `resolve-review-analysis` step file. Keep all research read-only and use `budget-explorer`. Then execute Pass 11 only under its activation gate, following the active `resolve-mutation-analysis` step file. Prefer declared mutation tooling. Otherwise detect the test command, require a passing baseline, choose mutation definitions in this worker, and dispatch only mechanical apply/test/revert/verify work to write-capable `budget-subagent` batches of at most 5-6 mutations. Dispatch batches sequentially. Require one outcome per mutation from `killed`, `survived`, `pre-check-failed`, or `revert-failed`. Count missing outcomes as revert-failed-equivalent, record the discrepancy, emit the critical pollution warning, stop later batches, and complete the report. A reported `revert-failed` from a complete batch does not stop later sequential batches.

Write and verify only `openspec/changes/{change-name}/review.md` outside temporary bounded Pass 11 mutations. `changed_files` contains `review.md` plus only production files whose revert failed or whose outcome was unaccounted; exclude cleanly reverted targets.

Before returning `completed`, verify `review.md` exists, is non-empty, and contains findings with severity-prefixed identifiers (`C1`/`H1`/`M1`/`L1`/`Q1`), severity roll-up, coverage, Pass 11 outcomes, all three audit recommendations, and a closing `Summary:` tally line whose counts match the report's findings (mutation findings folded at their remapped severities). The worker-authored summary contains severity counts, top three Critical findings when present, report path, parent-branch statement, and the complete verbatim `## Recommended Audits` block. Return no report contents.

## Continuation and Reconstruction

Return `needs_input` for picker questions and continue the same review operation with the exact answer. Return `cancelled` for a deliberate decline or clean no-diff stop, and `failed` for blockers. Reconstruction uses only the original envelope, ordered changed-files union, exact opaque input history, and `resolved_change_name`; never package the prior journal or artifact contents.
