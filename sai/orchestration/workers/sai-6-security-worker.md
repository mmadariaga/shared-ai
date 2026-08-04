# Security Worker

Fetch @sai/orchestration/worker-lifecycle.md and follow it exactly.

## Invocation Envelope

The worker receives exactly two strings:

- `wrapper_echo_value`: the complete value after the opencode security-arguments label, or empty when absent
- `arguments_value`: `$ARGUMENTS` exactly as received from the coordinator

Binding identifiers and continuation references are not worker input and must never be written to artifacts or returned.

## Prerequisites and Resolution

Use trimmed non-empty `wrapper_echo_value` before `arguments_value`. Parse the selected string as a change name plus the optional `--full`, `--path {dir}`, and parent-branch values accepted by the shared security instruction. When neither value supplies a name, run `openspec list --json`. For zero changes, return the established no-active-changes failure. For one, ask `Use change '{name}'?` with ordered `yes` and `no` options; `yes` resolves and `no` returns `cancelled`. For multiple, ask `Which change?` with options in CLI order and repeat after invalid input without a retry cap. Do not scan parent conversation history.

After resolution, fetch `@sai/policies/prereqs.md` and enforce the OpenSpec CLI, `openspec/`, and `schema: sai-workflow` checks. Then verify `proposal.md`. If it is missing, return `failed` with exactly `openspec/changes/{change-name}/proposal.md not found. Ensure the change name is correct and that /sai-1-spec has been run for this change.` Perform no audit analysis or durable write after a prerequisite failure.

Every post-resolution payload includes `resolved_change_name`. Every payload includes the current ordered duplicate-free `changed_files` list. No payload contains artifact contents, continuation identifiers, or binding metadata.

## Security Audit

Set `$ARGUMENTS` to the resolved change name plus the optional scope and parent-branch values, fetch `@sai/commands/security/invocation.md`, and follow it exactly.

For diff scope, detect the parent branch in this order: supplied parent, remote default, verified `master`, verified `main`. State the selected parent branch. Compute name-status, stat, and `{parent}...HEAD` diff. If the diff is empty, complete the existing no-change security outcome without findings or protected-file writes. For a diff over 500 LOC, do not load the full diff into the worker context; use at most eight read-only `budget-explorer` branches. Every delegated result has explicit bounded evidence fields: file:line, flaw category, and at most 80 words per finding for file inspection, or file:line plus a one-line note capped at 200 words for contextual research. No delegated response contains raw code blocks.

Execute SAST exactly as defined by the shared security instruction: inspect only the selected scope, require concrete locations and evidence, require source-to-propagation-to-sink traces for injection findings, map CWE only when direct and obvious, use the established Critical/High/Medium/Low vocabulary, and omit speculative or pre-existing issues. Run SCA only when a dependency manifest changed. For SCA, authorize only bounded read-only execution of applicable `npm audit`, `pip-audit`, `mvn dependency-check`, `trivy`, or `osv-scanner` commands; never install, update, or rewrite dependencies, manifests, lockfiles, production files, or configuration.

Write and verify only `openspec/changes/{change-name}/security.md`. Before returning `completed`, verify it exists, is non-empty, and contains a concise executive summary, concrete evidence-backed findings, severity counts, acknowledged trade-offs when applicable, and applicable SCA evidence. The worker-authored summary contains severity counts, up to three Critical/High findings when present, the report path, and the selected parent branch. `changed_files` contains only `openspec/changes/{change-name}/security.md`. Return no report contents.

## Continuation and Reconstruction

Return `needs_input` for picker questions and continue the same security operation with the exact answer. Return `cancelled` for a deliberate decline, and `failed` for blockers. Reconstruction uses only the original envelope, ordered changed-files union, exact opaque input history, and `resolved_change_name`; never package the prior journal or artifact contents. This worker never emits a design notice.
