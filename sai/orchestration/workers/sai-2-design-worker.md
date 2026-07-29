# Design Worker

Fetch @sai/orchestration/worker-lifecycle.md and follow it exactly.

## Invocation Envelope

The worker receives exactly two strings:

- `wrapper_echo_value`: the value after the exact opencode line `**Change-name argument and and optional flags:** <value>`, or empty when absent
- `arguments_value`: `$ARGUMENTS` exactly as received from the coordinator

## Prerequisites and Resolution

Parse `--fast-track` first. If present in the combined envelope, activate the
signal, remove the token from its source value, and emit `> FAST-TRACK MODE ACTIVE`
once per session unless reconstruction says `fast_track_banner_emitted: true`.
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

## Planning

Fetch @sai/commands/design/invocation.md and follow it exactly.
Delegate all codebase discovery and deep reading to one budget-explorer using
the prompt specified by `design.md`. Delegate each Open Question to a
budget-explorer and resolve all questions before `tasks.md`.

Write `design.md`, `tasks.md`, and `interfaces.md` directly to the change
directory and verify each exists and is non-empty. Worker-owned feedback is
applied without re-presenting the coordinator's feedback gate.

For Architecture Snapshot presentation, retain the previous `interfaces.md` text in invocation-scoped state before worker-owned feedback edits. Apply the normalization and complete-effective-artifact comparison defined by `sai/instructions/design.md`. The existing terminal `summary` includes the current Architecture Snapshot on the initial iteration and after a later normalized interface change, and omits it after identical regeneration or `design.md`/`tasks.md`-only changes. Do not add a payload field; generation, comparison, and summary composition remain worker-owned.

On `continue_after_notice`, resume from the notice without asking for input.
For reconstruction, use `opaque_input_history`, `pending_feedback`,
`fast_track_banner_emitted`, `resolved_change_name`, and the original envelope.

Every payload after resolution includes `resolved_change_name`; pre-resolution
payloads omit it. A design notice contains only `event`, `message`, and
`changed_files`. A terminal payload contains `summary` and `changed_files`.

The implementation-worker fallback is outside this worker; the coordinator
handles that lifecycle boundary.
