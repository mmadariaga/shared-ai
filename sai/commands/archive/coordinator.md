# `/sai-archive` coordinator

Fetch @sai/policies/verified-precondition-handback.md
Fetch @sai/policies/public-chat.md and follow it exactly.
Fetch @sai/policies/remember.md
Fetch @skills/safe-operations/SKILL.md and use it.
Fetch @sai/policies/tool-resolution.md
Fetch @sai/policies/obstacle-escalation.md
Fetch @sai/policies/prereqs-paths.md
Fetch @sai/commands/archive/retirement-declaration.md
Fetch @sai/policies/scenario-preservation.md
Fetch @sai/policies/command-execution.md and follow it exactly.
Fetch @sai/policies/no-commit-guard.md and follow its § Window pairing for every `sai-archive-worker` stretch.

You are the driver of the run and the only user-facing voice. The invocation carries one string, `arguments_value`: `[change-name] [--fast-track]`. The worker owns the read-only pre-flight (`@sai/commands/archive/instructions.md`). On the ordinary route you own gate presentation and every mutation: the retirement declaration, the CLI archive `openspec archive <name> --yes --json` (the sole sync and move primitive, whose pre-write validation guarantees scenario preservation and whose JSON result is the completion record), and the post-archive commit gate. On the Direct Build (unattended) route you validate and authorize the worker's prepared order and the same worker executes it.

## Goal

Archive one completed change. The run is done when the CLI archive moved the change and the post-archive commit gate closed, or when a stop of the contract printed its text, or when the user stopped. The worker reads and reports; you present its findings, run the mutations after the gates, and send an execution continuation only after validation and authorization. Never perform the worker's pre-flight on its behalf.

## Start

1. **Fast-track parse.** Inspect `arguments_value` for the positional token `--fast-track`.
   - Present: set the in-conversation boolean `fast_track_active` to true, remove the token and trim the surrounding whitespace, print the exact line `> FAST-TRACK MODE ACTIVE` as ordinary conversation text (never write it to a file), and use the cleaned remainder as the effective request from here on.
   - Absent: leave `fast_track_active` false and use `arguments_value` verbatim.
2. **Change resolution.** Fetch @sai/policies/change-picker.md and follow it exactly against the cleaned request. On its stop paths (no active changes, declined confirmation), print its exact stop text and end the run without creating a worker. The resolved name is the effective request from here on.
3. **Create the worker.** `Fetch @sai/orchestration/workers/bindings/archive-worker.md and use it.` The creation dispatch carries only the ready prompt; the worker returns `event: ready`, and the resolved change name goes to the same worker in the next message as `arguments_value`, with `fast_track_active` declared beside it as session state, never as an envelope key. The Direct Build (unattended) composition instead sends an initial `--direct-build-prepare` marker and keeps `direct_build_mode` outside the envelope. A worker that returns no ready is an obstacle (see Obstacles).
4. **Open the guard window.** Take a `snapshot` and hold the returned SHA as the invocation-scoped `guard_base`.

## The run

The worker returns its result as its final message, in the closed shape of its card: `status: completed`, `needs_input`, `failed`, or `cancelled`, with a concrete `summary`, `changed_files`, and `resolved_change_name`, plus the question and ordered options for `needs_input`. Read each result before acting on it, and add its `changed_files` to one ordered, duplicate-free union in first-seen order. A result in another shape is an obstacle.

**Guard.** `verify` the window against `guard_base` before each boundary of `no-commit-guard.md`: before presenting a `needs_input` result, before each coordinator mutation, and before acting on a run-closing result. On a `violation` verdict, remediate exactly as the policy prescribes, then continue. Your own CLI archive, staging, and commit operations run between windows, never inside one; a new worker stretch after them opens a new window with a fresh `snapshot`. The Direct Build (unattended) execute continuation is the one `allow_commit` carrier in the system: it always opens its own window per the policy's `allow_commit` isolation, and that window's verify runs with `--allow-commit`, because its validated order contains the one pre-authorized local commit.

**Needs input.** Present the exact question and ordered options through the native option-picker per "Closed-choice prompts" in `@sai/policies/remember.md`, with the worker's payload content (the delta-sync summary) beside it unaltered. Forward the exact answer to the same worker.

### Ordinary route

Apply the archive boundary of `@sai/policies/scenario-preservation.md` before the CLI archive and after every content correction. Verify any temporary exception metadata independently against approved scope; the header-fix handoff below does not authorize scenario removal or renaming.

Run the route only on the worker's confirming `completed` result: its summary restates the change name, schema, collision verdict, delta-sync summary, every retired capability, and any warnings. A result that carries the CORE stop literal or a retirement refusal (a stop with no mutation plan and no execution order), and every `failed` or `cancelled` result, ends the run: print its summary verbatim and stop with no mutation.

Present the confirming summary, then run in order (`archive_content_fix_attempted` starts false):

- **Retirement declaration** — when the summary names retired capabilities, perform the Write procedure of `retirement-declaration.md`. A refusal or a failed re-parse stops the run before the CLI archive, with no question.
- **CLI archive** — run `openspec archive <name> --yes --json` and parse the JSON. On success the sync and move are complete: add the realized archive path and the spec paths from the pre-flight inventory (the CLI's `specsUpdated` is not a path list) to the union. On failure or invalid JSON, classify:
  - **Content failure with a cited header** — the error carries a delta-content signal (`archive_spec_update_failed`, an already-existing requirement, or a missing or unknown requirement) and cites at least one `### Requirement:` header. Once per run (`archive_content_fix_attempted`): `Fetch @sai/orchestration/workers/bindings/backfill-worker.md and use it.`, create one `sai-backfill-worker`, and send it a `--fix-delta-headers <name>` envelope carrying the verbatim CLI error and the cited headers after its ready. It returns corrected content for those headers only. Validate it against the sai-workflow delta format, write it to an OS-temp directory, and check it with `node <check-delta-headers.js path> <name> --delta-dir <tmp>/specs`, adding `--scenario-exceptions <metadata-file>` only for the independently scope-verified temporary exceptions under the preservation policy, resolving the tool path per `@sai/policies/tool-resolution.md` (first existing candidate per harness; when none exists, name the tried candidates and stop). On a pass, write the corrected specs and retry the CLI archive once. Any second failure — the retry, the validation, or the fix continuation — stops with the literal error: no further retry, no second fix, no replacement worker.
  - **Every other failure** — an archive-directory collision, an empty index, an infrastructure error (missing binary, timeout, invalid JSON), a failure on a `--skip-specs` run, or a content signal with no cited header: report the exact error and stop, with no fallback, staging, retry, or commit.
- **Post-archive commit gate** — fetch @sai/commands/archive/archive-commit-gate.instructions.md and apply it exactly. Under `fast_track_active` it skips its selector as that file says; without the flag every gate still asks.

### Direct Build (unattended) route

Used only by the Explore Direct Build (unattended) composition, which dispatches the worker itself and keeps its own supervision. Apply the same independent archive-boundary check from `@sai/policies/scenario-preservation.md` to current deltas before authorizing the execute order. Use only the retained, verified temporary exception metadata whose individual approvals Explore checked; re-check approval against the approved block rather than trusting the backfill worker. Metadata is not an owned staging path, an archive input, or a commit artifact.

The `--direct-build-prepare` dispatch runs the whole pre-flight and every applicable fast-track gate without mutation and returns either a refusal or a closed plan: the archive destination, the owned staging paths, the pre-authorized one-commit boundary, and, when capabilities are retired, the retirement declaration as a named member of the order.

Validate the plan against the fresh worker findings and the implementer's changed-files union. After the existing gates and the Direct Build authorization resolve, and the order covers the slice per `@sai/policies/slice-path-scope.md` § Commit coverage, continue the same worker with an opaque `--direct-build-execute` payload holding the validated closed execution order. That continuation is the execution authorization; it is never inferred from a completed prepare result, a fast-track notice, or a worker summary, and it carries no additional path or action.

Add every worker-reported path to the union and print its summary verbatim. The classified content fix above is ordinary-route only. A failed or cancelled execute result stays with the Direct Build supervision contract (`sai/commands/explore/steps/pipeline-direct-build.md`), which owns the check that the earlier order had no effect and the re-issue of an order; this card issues no order of its own. A stop reports the exact state. A late continuation after success is rejected without mutation. A stop carries no finality: new retries run only at explicit user request. Never fall back to the ordinary-route mutation surface.

## Obstacles

Obstacles, their budget of 3 attempts, force majeure, and escalation follow `@sai/policies/obstacle-escalation.md`. This command has no run state: keep the attempt count in the conversation, and name each obstacle `worker`. An obstacle here is a worker that returns no ready, returns no readable result, stays silent, or drifts from its instruction. The CORE stop, a retirement refusal, the post-archive gates, every stop of the CLI archive above, and the exact stops of the change-picker are planned stops, not obstacles. When escalating, the options carry no retry of a mutation the user did not choose, and one option leaves the repository exactly as it is.

A replacement worker receives a hand-over written by you: the resolved change name, `fast_track_active`, the Direct Build mode and its validated closed execution order with its execution state when there is one, the questions already answered with their answer values, and the symptom. It starts again from the ready handshake and never replays an executed order.

## Close

The run closes when the goal is met, when a stop printed, or when the user chose to stop or dismissed an escalation. When the archive move executed, print the worker-authored summary verbatim, then exactly `Archive done.`, and stop. Every other closure prints the worker-authored summary verbatim and stops without the completion literal and without any mutation.
