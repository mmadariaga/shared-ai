# Performance Worker

Fetch @sai/orchestration/worker-lifecycle.md and follow it exactly.

## Invocation Envelope

The worker receives exactly two strings:

- `wrapper_echo_value`: the complete value after the opencode performance-arguments label, or empty when absent
- `arguments_value`: `$ARGUMENTS` exactly as received from the coordinator

Binding identifiers and continuation references are not worker input and must never be written to artifacts or returned.

## Prerequisites and Resolution

Use trimmed non-empty `wrapper_echo_value` before `arguments_value`. Parse the selected string as a change name plus the optional `--full`, `--path {dir}`, `--tier backend|frontend|db|queue`, and parent-branch values accepted by the shared performance instruction. When neither value supplies a name, run `openspec list --json`. For zero changes, return the established no-active-changes failure. For one, ask `Use change '{name}'?` with ordered `yes` and `no` options; `yes` resolves and `no` returns `cancelled`. For multiple, ask `Which change?` with options in CLI order and repeat after invalid input without a retry cap. Do not scan parent conversation history.

After resolution, enforce the OpenSpec CLI, `openspec/`, and `schema: sai-workflow` checks. Then verify `proposal.md`. If it is missing, return `failed` with exactly `openspec/changes/{change-name}/proposal.md not found. Ensure the change name is correct and that /sai-1-spec has been run for this change.` Perform no audit analysis or durable write after a prerequisite failure.

Every post-resolution payload includes `resolved_change_name`. Every payload includes the current ordered duplicate-free `changed_files` list and a `summary` string. No payload contains artifact contents, continuation identifiers, or binding metadata.

## Performance Audit

The complete scope grammar is the resolved change name with the optional full, path, tier, and parent-branch values accepted by the shared performance instruction. The four tiers are backend, frontend, database, and queue.

Set `$ARGUMENTS` to the resolved change name plus the optional scope, tier, and parent-branch values, fetch `@sai/commands/performance/invocation.md`, and follow it exactly.

For diff scope, detect the parent branch in this order: supplied parent, remote default, verified `master`, verified `main`. State the selected parent branch. Compute name-status, stat, and `{parent}...HEAD` diff. If the diff is empty, complete the existing no-change performance outcome without findings or protected-file writes. A diff over 500 LOC is the 500-LOC cutover: do not load the full diff into the worker context; use at most eight read-only `budget-explorer` branches under the eight-call cap. Every delegated result uses the canonical bounded evidence contract and exact evidence policy: file:line, tier, finding category, and at most 80 words per finding for file inspection, or file:line plus a one-line note capped at 200 words for contextual research. No delegated response contains raw code blocks.

Evaluate only the selected scope and tier filter across backend, frontend, database, and queue checks. Preserve the Critical, High, Medium, Low, and Informational taxonomy. Require a precise location or concrete endpoint/query/route, measured metric, baseline reference, remediation, expected impact, and validation method for every finding. Respect accepted trade-offs and omit speculative or out-of-scope findings.

Run diagnostics only after explicit user authorization and only in bounded read-only measurement mode as permitted by the shared performance instruction. Never modify production code, schemas, migrations, configuration, dependencies, manifests, or lockfiles.

The lifecycle payload shapes are `worker_completed`, `worker_needs_input_before_resolution`, and `worker_unsuccessful`; lifecycle payloads carry metadata only, not report or `performance.md` contents. Lifecycle payloads carry metadata rather than performance.md contents. The `needs_input` payload contains a question and ordered options. On successful completion, write and verify only `openspec/changes/{change-name}/performance.md`. Before returning `completed`, verify it exists, is non-empty, records the selected parent branch, contains severity counts and clean-category statements, and includes acknowledged trade-offs and top Critical/High findings when applicable. The worker-authored summary contains severity counts, up to three Critical/High findings when present, the report path, and the selected parent branch. `changed_files` contains only `openspec/changes/{change-name}/performance.md`. Report contents must not be returned.

## Continuation and Reconstruction

Return `needs_input` for picker or diagnostic-authorization questions and continue the same performance operation with the exact answer. Return `cancelled` for a deliberate decline and `failed` for blockers. Return failed for blockers or cancelled for a deliberate decline with `resolved_change_name` after resolution. Reconstruction uses only the original envelope, ordered changed-files union, exact opaque input history, and `resolved_change_name`; never package the prior journal or artifact contents. This worker never emits a design notice.
