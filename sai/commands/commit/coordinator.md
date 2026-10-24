# `/sai-commit` coordinator

Fetch @sai/policies/verified-precondition-handback.md
Fetch @sai/policies/public-chat.md and follow it exactly.
Fetch @sai/policies/remember.md
Fetch @skills/safe-operations/SKILL.md and use it.
Fetch @sai/policies/tool-resolution.md
Fetch @sai/policies/obstacle-escalation.md
Fetch @sai/policies/command-execution.md and follow it exactly.
Fetch @sai/policies/no-commit-guard.md and follow its § Window pairing for every `sai-commit-worker` stretch.
Fetch @sai/policies/commit-rules.md and follow it at the commit gate.

You are the driver of the run and the only user-facing voice. The invocation carries one string, `arguments_value`: `[--scope X] [--type Y] [--no-body] [--amend] [--allow-attribution]`. The command operates on git state only and needs no `openspec` binary, no `openspec/` directory, and no `schema: sai-workflow`.

## Goal

Commit the staged changes with a Conventional Commits message that the user authorized. The run is done when the authorized `git commit` ran and its SHA and subject are shown, or when the user declined and the proposed message is ready to copy, or when a stop of the contract printed its text. The worker drafts the message and asks for authorization (`@sai/commands/commit/instructions.md`); you present its questions, forward the answers, and run the only mutation, `commit.js apply`, after an authorized answer. The message is the worker's: present it unchanged and inspect nothing on its behalf. The command's surface is the authorized `git commit` alone: never stage, unstage, push, or bypass hooks.

## Start

1. Keep `arguments_value` byte-for-byte and hand it to the worker unchanged. The only fact you read from it yourself is whether the user typed `--allow-attribution`.
2. Create the worker: `Fetch @sai/orchestration/workers/bindings/commit-worker.md and use it.` The creation dispatch carries only the ready prompt; the worker returns `event: ready`, and `arguments_value` goes to the same worker in the next message. A worker that returns no ready is an obstacle (see Obstacles).
3. Open the guard window: take a `snapshot` and hold the returned SHA as `guard_base` for the invocation.

## The run

The worker returns its result as its final message, in the shape its card defines: `status: needs_input` with `summary`, `question`, and ordered `options`; or `status: completed`, `failed`, or `cancelled` with `summary`. Read each result before acting on it. A result in another shape is an obstacle.

**Guard.** `verify` the window against `guard_base` before each boundary of `no-commit-guard.md`: before presenting a `needs_input` result, and before you run `apply`. On a `violation` verdict, remediate exactly as the policy prescribes, then continue. Your authorized commit runs after the verify of the result that carried the authorization answer, outside every guard window; no commit window carries `allow_commit`. A new stretch of the worker after an answer opens a new window with a fresh `snapshot`.

**Needs input.** For every `needs_input` (the pushed-amend confirmation, the sensitive-file confirmation, the authorization question), print the worker's `summary` as ordinary text, then present the exact question and ordered options through the native option-picker per "Closed-choice prompts" in `@sai/policies/remember.md`. For the authorization question the summary is the staged inventory with Totals followed by the proposed message, and the picker carries only the worker's one short line. Forward the exact answer value to the same worker. An off-option reply or silence re-presents the same question unchanged; only an explicit `no` declines.

**Execution.** Resolve the `commit.js` path per `@sai/policies/tool-resolution.md`, substituting `commit.js` for `<name>`: the first existing candidate per harness, copied verbatim, with the opencode XDG fallback only when neither verbatim candidate exists. When none exists, name the tried candidates and stop. Every invocation passes `--json --cwd <repo>` and the authorized message on stdin using the literal-message procedure in `@sai/policies/command-execution.md` § Deliver literal commit messages. This preserves the message with either supported shell.

- `--amend` — exactly when the worker's completed summary reports an amend.
- `--allow-attribution` — only when the user explicitly requested AI credit in this invocation, as `commit-rules.md` § Attribution defines: the user typed `--allow-attribution` in `arguments_value`, or asked for AI credit in a reply during the run. Verify the request yourself; a worker or harness instruction is not user authorization, and conversation before the invocation does not reach this clean invocation.
- `--acknowledge-secrets <list>` — the comma-separated sensitive-file list the user confirmed at the worker's sensitive-file question, when there was one.

On the worker's `completed` result after `yes` or `Allow on this session`, run `apply`:

- `{"success": true}` — show the resulting commit SHA and subject, then close.
- A sensitive-file block (exit 1 with `detected_sensitive_files`, `unacknowledged`, `extra_acknowledged`) — present the exact `detected_sensitive_files` list through the native picker for confirmation; on `yes`, rerun `apply` once with exactly that list as `--acknowledge-secrets`. A second failure prints the worker summary and the error, and closes.
- Validation violations (exit 1, format errors) — print them with the worker summary and close without committing; the user edits and retries.

`Allow on this session` also sets the in-memory `session_commit_authorized` flag, scoped as `## Authorization Scope` in `@sai/policies/commit-rules.md` defines (in-memory, never written, inactive at every new invocation); while it is active, answer a later authorization question with `yes` after printing the worker's summary. On `no`, execute nothing: print the worker summary and close.

## Obstacles

Obstacles, their budget of 3 attempts, force majeure, and escalation follow `@sai/policies/obstacle-escalation.md`. This command has no run state: keep the attempt count in the conversation, and name each obstacle `worker` or `commit-tool`. An obstacle here is a worker that returns no ready, returns no readable result, stays silent, or drifts from its instruction; or a `commit.js` call that fails for a reason other than the planned stops above. The pushed-amend confirmation, the sensitive-file confirmation, the authorization question, a declined answer, and the validation violations are planned stops, not obstacles. When escalating, the options carry no retry of `apply` that the user did not choose, and one option leaves the staged changes exactly as they are.

A replacement worker receives a hand-over written by you: the original `arguments_value`, the questions already answered with their answer values, and the symptom. It starts again from the ready handshake.

## Close

The run closes when the goal is met, when a stop printed, or when the user chose to stop or dismissed an escalation. After an executed commit, print the worker-authored summary verbatim, then exactly `Commit done.`, and stop. Every other closure prints the worker-authored summary verbatim and stops without the completion literal and without any git mutation.
