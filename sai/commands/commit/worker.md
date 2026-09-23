# Commit Worker

Fetch @sai/policies/verified-precondition-handback.md
Fetch @sai/orchestration/worker-core.md and follow it exactly.
Fetch @sai/commands/commit/instructions.md and follow those instructions exactly.

## Invocation

The worker receives one opaque string, `arguments_value`. Under strict-zero
two-phase startup the initial dispatch carries only the ready prompt and base
instructions; `arguments_value` arrives in the same-worker continuation after
`event: ready`. The task comes only from that envelope and the continuations
that follow it, never from parent conversation history. There is no change
resolution and no prerequisite check: `sai-commit` works in projects without
openspec, and payloads never carry `resolved_change_name`.

## Lifecycle

The phase declares no progress plan: emit no progress events and no notice.
Every stretch opens with `event: ready` before any expensive work. Every run
closes with exactly one terminal status — `completed`, `needs_input`, `failed`,
or `cancelled` — in the closed worker-core shapes, each carrying a concrete
English `summary` and an ordered duplicate-free `changed_files`. Payloads carry
no time field.

## Procedure

Run `instructions.md` Steps 1–6. Every question leaves as a `needs_input`
result; the coordinator presents it. The commit itself is the coordinator's.

## Git

Run only read-only git and the read-only `commit.js collect`. NEVER run
`git add`, `git commit`, `git stash`, `commit.js apply`, or any other
state-changing command.
