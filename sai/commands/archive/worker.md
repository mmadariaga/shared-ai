# Archive Worker

Fetch @sai/policies/verified-precondition-handback.md
Fetch @sai/orchestration/worker-core.md and follow it exactly.
Fetch @sai/commands/archive/instructions.md and follow those instructions exactly.
Fetch @sai/commands/archive/retirement-declaration.md
Fetch @skills/safe-operations/SKILL.md and use it for every Direct Build (unattended) mutation.
Fetch @sai/policies/commit-rules.md and follow it for the Direct Build (unattended) commit.

## Invocation

The worker receives one opaque string, `arguments_value`. Under strict-zero
two-phase startup the initial dispatch carries only the ready prompt and base
instructions; `arguments_value` arrives in the same-worker continuation after
`event: ready`. The task comes only from that envelope and the continuations
that follow it, never from parent conversation history. The coordinator has
already resolved the change through the shared change-picker, so every payload
carries `resolved_change_name`, and `$ARGUMENTS` in the instructions is that
name.

The coordinator declares `fast_track_active` beside the envelope as session
state. It changes only the unchecked-items question; the CORE stop, the AUDIT
line, the collision check, and every retirement refusal behave identically.

The Direct Build (unattended) composition prefixes the initial envelope with a
`--direct-build-prepare` line followed by the resolved change name. Strip the
marker and keep `direct_build_mode: prepare` as worker state. A
`--direct-build-execute` marker is valid only on the same-worker continuation
described below, never on an initial dispatch.

## Lifecycle

The phase declares no progress plan: emit no progress events and no notice.
Every stretch opens with `event: ready` before any expensive work. Every run
closes with exactly one terminal status — `completed`, `needs_input`, `failed`,
or `cancelled` — in the closed worker-core shapes, each carrying a concrete
English `summary`, an ordered duplicate-free `changed_files`, and
`resolved_change_name`. Payloads carry no time field.

## Pre-flight

Run the whole pre-flight of `instructions.md`: Classification Check,
Completion Check, delta-sync summary, capability retirement detection and
preconditions, and collision check. Everything reads; findings travel as
payload content (the AUDIT line, the unchecked-item list, the delta-sync
summary, the retired capabilities, the collision verdict) for the coordinator
to present verbatim.

Close the run early on the CORE stop, a retirement refusal (a stop with no
mutation plan and no execution order), or a declined unchecked-items answer.
Otherwise close with a `completed` summary restating the change name, schema,
collision verdict, delta-sync summary, every retired capability, and any
warnings. The coordinator presents it before running the CLI archive on the
ordinary route; in prepare mode it is also the prepared plan: the archive
destination, the owned staging paths, the one pre-authorized local commit, and,
when capabilities are retired, the retirement declaration.

Outside the execute continuation, the worker only reads: no directory move, no
file write (including `.openspec.yaml`), no git command beyond reads. The CLI
archive, the declaration, and every git operation belong to the coordinator on
the ordinary route.

## Direct Build (unattended) execute continuation

The coordinator validates the prepared plan and continues this worker once
with an opaque payload whose first line is exactly `--direct-build-execute`.
The rest is a **closed execution order**, the only authority for mutation. It
may contain only the resolved change name, the retirement declaration with the
capabilities it retires, the exact date-prefixed archive destination, the exact
owned staging paths, and the one pre-authorized local commit. An order carrying
the retirement declaration is therefore not an altered order.

Validate the order before acting: complete, duplicate-free, consistent with the
prepared plan, inside the allowed `openspec/` and implementer-owned path sets,
and still pending. An implementer-owned path may be absent when the prepared
diff records its deletion. Reject a missing non-deletion path, a reordered,
foreign, already-executed, or otherwise altered order with a closed `failed`
result, executing nothing.

Every mutation runs through the Bash tool; this worker has no Write or Edit
tool, and without Bash it returns `failed` rather than simulating a write.
Execute exactly this order:

0. **Retirement declaration** — only when the plan recorded
   `retired_capabilities`: perform the Write procedure of
   `retirement-declaration.md`. A precondition that blocks now, or a failed
   re-parse, returns `failed` with the condition and its way forward, and
   step 1 does not run.
1. **CLI archive** — `openspec archive <name> --yes --json`, the sole sync and
   move primitive. On failure or invalid JSON, return `failed` with the exact
   error; there is no manual fallback and no retry here. A backfill-artifact
   error is returned verbatim for the Direct Build supervision contract to
   correct and relaunch.
2. **Staging** — classify every approved path before staging any. A path is
   tracked (including a tracked deletion) when
   `git ls-files --error-unmatch -- <path>` succeeds, untracked on its exit 1,
   and any other error is terminal. For an untracked path, run
   `git check-ignore --quiet -- <path>`: exit 0 means ignored, so omit it and
   append `[sai-archive] warning: omitted ignored untracked path: <path>` to
   the summary; exit 1 means eligible; anything else is terminal. Then stage
   every eligible path with the exact allowlist, deletion-aware, never with
   `-A`, `.`, or `-f`, and never an unrelated path. A classification or staging
   error stops the order with the exact completed state.
3. **Commit** — when the index holds staged changes (`git diff --cached --quiet`
   exits 1), author the message from the staged state under the commit rules,
   add the retired-capability body lines of `retirement-declaration.md`
   § Disclosure, and create one local commit in HEREDOC form under the
   already-consumed Direct Build authorization. When the index is empty (every
   approved path was ignored), report
   `[sai-archive] no commit: staging left the index empty` and create nothing.
   Never amend, push, or ask for a second commit.

The summary names every retired capability, as the prepare summary does.
Record each realized path in `changed_files`, taking spec paths from the
pre-flight inventory (the CLI's `specsUpdated` is not a path list). A
successful execution consumes the order: any later execute continuation or
replacement is rejected without mutation. A failure after a partial mutation
returns `failed` with the exact completed state and failure class, setting
`unrecoverable: true` only when the evidence shows continuing is unsafe; it
never retries, continues to another action, or commits a partial plan.
