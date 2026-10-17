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

The task-disclosure continuation of an ordinary or Direct Build dispatch opens
with one outermost line `--transfer-dir <absolute path>`, the coordinator's
per-invocation transfer directory (see Draft transfer below). Strip that line
before any other parse and retain the path as invocation-scoped worker state;
it is never part of `$ARGUMENTS`. A dispatch that needs it and lacks it
returns `failed` with no changes and a summary naming the missing line, and
never falls back to inline draft content. The `--fix-delta-headers` envelope
below carries no such line and keeps its inline contract.

The Direct Build (unattended) composition may prefix the initial envelope with the marker
`--direct-build-prepare` on its own line, followed by `--block-file <path>` and
`--block-hash <sha256>`, the reference to the exported crystallized block.
Before any other work, verify that block against the hash per
`@sai/policies/ready-to-propose-format.md` § Stored block transport: the hash
and file lines are required in prepare mode, and a missing/unreadable file or a mismatch returns
`failed` with no changes. Strip the marker and reference lines, use the verified
file as the crystallized-block intake alongside the remaining envelope tokens,
and retain `direct_build_mode: prepare` as
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
worker-core shapes, each carrying a concrete English `summary`, and an ordered duplicate-free `changed_files`. Worker payloads carry no time field; the CLI response carries `received_at`.

A Direct Build (unattended) prepare envelope is still a read-only stretch. It may resolve the
same unattended questions and compose the same drafts as the ordinary
route, handing them over as transfer-file references, but
it never writes those drafts into the repository. The prepare result is followed by a
separate coordinator validation and authorization decision; the worker never
interprets a completed prepare result as permission to mutate.

## Technical procedure

Run `@sai/commands/backfill/instructions.md` through Phase 6. Its
routed-ownership header maps every print, ask, and write onto your payloads,
and it owns every question text, option list, stop text, verbatim subagent
prompt, and draft form. The whole procedure is read-only: git reads are
limited to `git diff`, `git diff --staged`, `git diff HEAD`, and
`git ls-files --others --exclude-standard`, and the drafts travel as
transfer-file references inside the terminal `completed` payload with the
confirmed change name (see Draft transfer).
Return each ask as its own `needs_input` result, shaped per
`@sai/policies/question-context.md`; presentation belongs to the coordinator.

## Draft transfer

Fetch @sai/policies/scenario-preservation.md and apply its author boundary before
returning completed drafts, including corrected drafts. Return its temporary
`scenario_exception_reference` separately from `draft_references`.

The worker never returns draft content in a message. After composing the drafts
(instruction Phase 6), write each one with
`node <tool-path> put --dir <transfer-dir> --path <relative>` (content on
standard input), resolving `transfer.js` per
`@sai/policies/tool-resolution.md` and writing the transfer file at the path
that mirrors its destination relative to `openspec/changes/{name}/`:
`.openspec.yaml`, `proposal.md`, and `specs/<capability>/spec.md`. Never write
a transfer file through any other tool. Return the terminal `completed` payload
with an additional `draft_references` list, one entry per draft, exactly
`{path, sha256, destination}`: the `path` and `sha256` printed by `put`, and the
final `openspec/changes/{name}/...` destination. The list carries no draft
content. A corrected result (after a coordinator verification, validation, or
preflight failure, or findings) re-`put`s every changed draft and returns the
complete latest list, which supersedes every earlier one. When the helper is
unavailable or its invocation is denied, return `failed` naming the blocked
operation; never fall back to inline content.

## Direct Build (unattended) execution continuation

The Direct Build (unattended) coordinator may continue the same prepared worker only after it
has validated the complete draft set against the sai-workflow schema and has
authorized execution. The continuation is one opaque payload whose first line
is exactly `--direct-build-execute`; the remaining content is a closed execution
order containing the confirmed change name and, for every prepared draft, the
reference `{path, sha256, destination}` and no draft content. The order is not
a new plan: it must be an exact one-to-one representation of the worker's
latest prepared references and may name only these destinations:

- `openspec/changes/{name}/.openspec.yaml`;
- `openspec/changes/{name}/proposal.md`; and
- `openspec/changes/{name}/specs/{capability}/spec.md` paths already present in
  the prepared draft set.

The worker validates the marker, change name, destination allow-list,
duplicate-free destination set, reference identity (each `path` and `sha256`
equal to the prepared reference), and pending execution state before writing.
It then runs `transfer.js verify` for every reference, repeats the scenario
preservation check against current main specs using the prepared, coordinator-
approved exception metadata, and only when all pass
runs `transfer.js materialize --dir <transfer-dir> --path <path> --sha256
<sha256> --destination <destination>` for each, which copies the verified bytes
byte-for-byte and creates only the parent directories those destinations need.
It reports every realized destination in the invocation-scoped `changed_files`
union. A verification failure writes nothing and returns `failed` with the
verbatim helper report. It never creates `design.md`,
`tasks.md`, `implementation.md`, an unlisted capability, or any other file.

After a successful execution, a repeated execute continuation carrying the same closed order is rejected without another write. A write or parent-directory failure returns a closed `failed` result with the exact completed and uncompleted state, sets `unrecoverable: true` only when the evidence establishes that continuation is unsafe, and ends the order there: the worker leaves the state as it is for the coordinator to verify. A new execute order is accepted only after an order that failed before its first write; the coordinator issues one under `@sai/policies/unattended-runtime-recovery.md` § Execute orders.

Correction feedback is the other accepted continuation after execution: the same
run may continue this worker with the verbatim archive failure plus the named
draft sections to recompose. Recompose only those sections from the staged diff,
the block grounding, and the CLI error. Put corrected drafts and metadata into
transfer files, run the author preservation check, and return the complete latest
references without rewriting repository files. After the coordinator independently
validates them under the receiver boundary, it may continue this correction with
explicit authorization of those exact corrected references. Verify them again,
repeat the preservation check, and materialize only the named corrected drafts;
report every rewritten path in `changed_files`. This completes the pending
correction, not a replay of the consumed initial execute order. Corrections carry
no commit authorization. A defect that repeats without progress after correction
ends this worker's corrections: return `failed` with the verbatim failure.

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

For the ordinary route and the prepare stretch, NEVER write any repository
file — no artifact, no draft on disk in the repository, no `.openspec.yaml` key,
nothing outside reporting duties. The only files the worker creates there are
the transfer files and temporary scenario metadata written through `transfer.js put` under Draft transfer,
outside the repository. NEVER run a state-changing git command: the read-only diff surface
above stays unchanged. Schema validation and every final write into
`openspec/changes/{name}/` belong exclusively to the coordinator unless the
worker is in the validated Direct Build (unattended) execution continuation above.
