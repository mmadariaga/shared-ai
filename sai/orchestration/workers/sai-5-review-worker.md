# Review Worker

Fetch @sai/orchestration/worker-lifecycle.md and follow it exactly.

## Invocation Envelope

The worker receives exactly two strings:

- `wrapper_echo_value`: the complete value after the opencode change-name-and-optional-parent-branch label, or empty when absent
- `arguments_value`: `$ARGUMENTS` exactly as received from the coordinator

Binding identifiers and continuation references are not worker input and must never be written to artifacts or returned.

## Prerequisites and Resolution

Use trimmed non-empty `wrapper_echo_value` before `arguments_value`. Parse the selected string as at most two positional values: change name, then optional parent branch. When neither value supplies a name, run `openspec list --json`. For zero changes, return the established no-active-changes failure. For one, ask `Use change '{name}'?` with ordered `yes` and `no` options; `yes` resolves and `no` returns `cancelled`. For multiple, ask `Which change?` with options in CLI order and repeat after invalid input without a retry cap. Do not scan parent conversation history.

After resolution, fetch `@sai/policies/prereqs.md` and enforce the OpenSpec CLI, `openspec/`, and `schema: sai-workflow` checks. Then verify `proposal.md`. If it is missing, return `failed` with exactly `openspec/changes/{change-name}/proposal.md not found. Ensure the change name is correct and that /sai-1-spec has been run for this change.` Perform no review analysis, mutation, or durable write after a prerequisite failure.

Every post-resolution payload includes `resolved_change_name`. Every payload includes the current ordered duplicate-free `changed_files` list. No payload contains artifact contents, continuation identifiers, or binding metadata.

## Review

Set `$ARGUMENTS` to the resolved change name plus the optional parent branch, fetch `@sai/commands/review/invocation.md`, and follow it exactly.

Detect the parent branch in this order: supplied parent, remote default, verified `master`, verified `main`. Compute name-status, stat, commit map, and `{parent}...HEAD` diff. If the diff is empty, return `cancelled` with exactly `No changes detected against {parent-branch}. Nothing to review.` For a diff over 500 LOC, do not load the full diff into the worker context; use at most eight read-only `budget-explorer` branches with explicit bounded output contracts.

Execute review passes 1-10 from the shared review instruction. Keep all research read-only and use `budget-explorer`. Then execute Pass 11 only under its activation gate. Prefer declared mutation tooling. Otherwise detect the test command, require a passing baseline, choose mutation definitions in this worker, and dispatch only mechanical apply/test/revert/verify work to write-capable `budget-subagent` batches of at most 5-6 mutations. Dispatch batches sequentially. Require one outcome per mutation from `killed`, `survived`, `pre-check-failed`, or `revert-failed`. Count missing outcomes as revert-failed-equivalent, record the discrepancy, emit the critical pollution warning, stop later batches, and complete the report. A reported `revert-failed` from a complete batch does not stop later sequential batches.

Write and verify only `openspec/changes/{change-name}/review.md` outside temporary bounded Pass 11 mutations. `changed_files` contains `review.md` plus only production files whose revert failed or whose outcome was unaccounted; exclude cleanly reverted targets.

Before returning `completed`, verify `review.md` exists, is non-empty, and contains findings, severity roll-up, coverage, Pass 11 outcomes, and all three audit recommendations. The worker-authored summary contains severity counts, up to three Blockers when present, report path, parent-branch statement, and the complete verbatim `## Recommended Audits` block. Return no report contents.

## Continuation and Reconstruction

Return `needs_input` for picker questions and continue the same review operation with the exact answer. Return `cancelled` for a deliberate decline or clean no-diff stop, and `failed` for blockers. Reconstruction uses only the original envelope, ordered changed-files union, exact opaque input history, and `resolved_change_name`; never package the prior journal or artifact contents.
