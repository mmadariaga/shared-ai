# Backfill Worker

Fetch @sai/policies/verified-precondition-handback.md
Fetch @sai/orchestration/worker-core.md and follow it exactly.
Fetch @sai/policies/bounded-dispatch-retry.md and follow it for every delegated subagent dispatch.
Fetch @skills/budget/SKILL.md and use it
Fetch @sai/commands/backfill/instructions.md and follow those instructions exactly.
Fetch @sai/policies/remember.md

## Invocation Envelope

The worker receives exactly one opaque string: `arguments_value`; binding
metadata remains outside the worker request. Under strict-zero two-phase
startup the initial dispatch carries only the ready prompt plus base
instructions with no task content; `arguments_value` arrives only in the
post-ready same-worker continuation after `event: ready`. Do not scan parent conversation
history. Throughout `@sai/commands/backfill/instructions.md`, `$ARGUMENTS`
denotes the received `arguments_value`.

The Direct Build (unattended) composition may prefix the initial envelope with the marker
`--direct-build-prepare` on its own line. Strip that marker before applying the
ordinary envelope-token parse and retain `direct_build_mode: prepare` as
invocation-scoped worker state. The marker is composition-only; an ordinary
`/sai-backfill` invocation without it follows the normal route byte-for-byte.
An `--direct-build-execute` marker is valid only on the explicit same-worker
continuation described below and is never accepted as an initial dispatch.

The archive coordinator's classified content-failure reroute may dispatch this
worker with a `--fix-delta-headers <change-name>` marker on its own first
line. That envelope enters only the Delta header fix continuation below; it is
never accepted as an ordinary backfill dispatch and never starts Phases 1–5.

There is no coordinator-side change resolution in this phase: the change name
is derived and confirmed inside the technical flow itself (instruction
Phase 5). Payloads are therefore pre-resolution shapes — they omit
`resolved_change_name` — until the user confirms the derived name, after which
every subsequent result carries it.

The envelope-token parse is phase-owned and runs HERE, per the instruction's
Envelope Tokens section; `fast_track_active` is worker-derived session state.

## Lifecycle

This phase declares NO progress plan: emit no progress events and no notice.
Every stretch opens with `event: ready` as its first nonterminal return before
any expensive work; the task arrives only in the post-ready same-worker
continuation. Every run closes with exactly one terminal lifecycle
status — `completed`, `needs_input`, or `failed`/`cancelled` — in the closed
worker-core shapes, each carrying a concrete English `summary`, and an ordered duplicate-free `changed_files`. Worker payloads carry no time field; the validator emits the `validated_at` sidecar.

A Direct Build (unattended) prepare envelope is still a read-only stretch. It may resolve the
same unattended questions and compose the same draft payload as the ordinary
route, but it never writes those drafts. The prepare result is followed by a
separate coordinator validation and authorization decision; the worker never
interprets a completed prepare result as permission to mutate.

## Technical procedure

Run `@sai/commands/backfill/instructions.md` through Phase 6. Its
routed-ownership header maps every print, ask, and write onto your payloads,
and it owns every question text, option list, stop text, verbatim subagent
prompt, and draft form. The whole procedure is read-only: git reads are
limited to `git diff`, `git diff --staged`, `git diff HEAD`, and
`git ls-files --others --exclude-standard`, and the drafts travel as payload
text inside the terminal `completed` payload with the confirmed change name.
Return each ask as its own `needs_input` result, shaped per
`@sai/policies/question-context.md`; presentation belongs to the coordinator.

## Direct Build (unattended) execution continuation

The Direct Build (unattended) coordinator may continue the same prepared worker only after it
has validated the complete draft set against the sai-workflow schema and has
authorized execution. The continuation is one opaque payload whose first line
is exactly `--direct-build-execute`; the remaining content is a closed execution
order containing the confirmed change name and the exact destination path and
byte-for-byte content for every prepared draft. The order is not a new plan:
it must be an exact one-to-one representation of the worker's prepared draft
set and may name only:

- `openspec/changes/{name}/.openspec.yaml`;
- `openspec/changes/{name}/proposal.md`; and
- `openspec/changes/{name}/specs/{capability}/spec.md` paths already present in
  the prepared draft set.

The worker validates the marker, change name, path allow-list, duplicate-free
path set, content identity, and pending execution state before writing. It
creates only parent directories required by those named paths, writes the
supplied contents byte-for-byte, and reports every realized path in the
invocation-scoped `changed_files` union. It never creates `design.md`,
`tasks.md`, `implementation.md`, an unlisted capability, or any other file.

After a successful execution, a repeated execute continuation carrying the same closed order is rejected without another write. A write or parent-directory failure that leaves a partial mutation returns a closed `failed` result with the exact completed and uncompleted state, sets `unrecoverable: true` only when the evidence establishes that continuation is unsafe, and never retries, rolls back, or continues to a later mutation; no order is refired onto that partially mutated state.

Correction feedback is the only other accepted continuation after execution: the same run may continue this worker with the verbatim archive failure plus the named draft sections to recompose. The worker recomposes only those named sections from the staged diff, the block grounding, and the CLI error, rewrites only those draft files, and reports every rewritten path in the invocation-scoped `changed_files` union. Corrections rewrite drafts only and carry no commit authorization. A repeated defect reported without progress after correction closes as failed-retryable with the verbatim failure in view and no further automatic continuation.

This execution route does not change the ordinary route: without
`direct_build_mode: prepare` and the explicit `--direct-build-execute` continuation,
schema validation and every final write remain coordinator-owned.

## Delta header fix continuation

The archive coordinator may dispatch this worker once with a narrow
header-fix envelope whose first line is exactly
`--fix-delta-headers <change-name>`; the remaining content is the verbatim
archive CLI failure plus the cited `### Requirement:` headers. Strip the
marker line and treat the remainder as the sole fix input: this is not a new
backfill run and Phases 1–5 do not execute.

Scope is headers only — never a full regeneration:

- Read the on-disk deltas `openspec/changes/<name>/specs/*/spec.md` and the
  matching mains `openspec/specs/<capability>/spec.md`.
- Reclassify ONLY the cited requirements per the Phase 6c existence rule
  (move each complete requirement block, scenarios included, between the
  `## ADDED` / `## MODIFIED` / `## REMOVED Requirements` sections of the same
  capability file; remove a delta section header left empty by the move;
  never invent, delete, or reword a requirement).
- Return the corrected spec CONTENT as payload text with the confirmed change
  name, exactly like draft composition; never write any file — the archive
  coordinator validates and writes. Requirements outside the cited set stay
  byte-identical.

This continuation keeps the ordinary read-only posture: no file writes and no
state-changing git commands.

## Absolute mutation prohibition outside Direct Build (unattended) execution

For the ordinary route and the prepare stretch, NEVER write any file — no
artifact, no draft on disk, no `.openspec.yaml` key, nothing outside reporting
duties. NEVER run a state-changing git command: the read-only diff surface
above stays unchanged. Schema validation and every final write into
`openspec/changes/{name}/` belong exclusively to the coordinator unless the
worker is in the validated Direct Build (unattended) execution continuation above.
