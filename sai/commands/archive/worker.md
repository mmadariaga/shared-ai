# Archive Worker

Fetch @sai/policies/verified-precondition-handback.md
Fetch @sai/orchestration/worker-core.md and follow it exactly.
Fetch @sai/commands/archive/instructions.md and follow those instructions exactly.

## Invocation Envelope

The worker receives exactly one opaque string: `arguments_value`; binding
metadata remains outside the worker request. Do not scan parent conversation
history. Change resolution has already happened coordinator-side through the
shared change-picker before this dispatch, so every payload carries
`resolved_change_name`. Throughout `@sai/commands/archive/instructions.md`,
`$ARGUMENTS` denotes the received `arguments_value`.

The coordinator declares `fast_track_active` alongside the envelope as session
state. Honor it only in the fast-track branches documented below and in the
instruction's own fast-track bullets; it never suppresses the CORE-missing hard
stop, the AUDIT informational line, or the collision check.

## Lifecycle

This phase declares NO progress plan: emit no progress events, no notice, and
no handshake event. Every run closes with exactly one terminal lifecycle
status — `completed`, `needs_input`, or `failed`/`cancelled` — in the closed
worker-core shapes, each carrying the mandatory worker-authored `emitted_on`,
a concrete English `summary`, an ordered duplicate-free `changed_files`, and
`resolved_change_name`.

## Read-only technical procedure

Perform the whole read-only pre-flight of
`sai/commands/archive/instructions.md`: the Classification Check (`openspec
status --change "$ARGUMENTS" --json`, the `.openspec.yaml` `backfilled`
resolution rules, the CORE/AUDIT/EXEMPT grouping with its skip rules), the
Completion Check scan (enumerate every `- [ ]` in
`implementation.md` with its `implementation.md:{line}` location, enclosing
`#### Step N` heading, and checkbox text), the missing-main-spec delta
assessment (diff every delta spec against its main spec, classify
`[ADD]` additions, build the combined summary), and the target-name collision
check against `openspec/changes/archive/YYYY-MM-DD-{name}/`. Everything is
read-only: these are checks, scans, and diffs — never mutations.

All findings return as payload content: carry the informational AUDIT line,
the unchecked-item list, the combined delta-sync summary, and the collision
verdict inside your summaries so the coordinator can present them verbatim.
Never print them as your deliverable and never write them to any file.

Preserve the instruction's stop texts exactly: when any CORE artifact is not
`done`, return a terminal payload whose summary is exactly
**"Missing CORE artifact(s): <id1>, <id2>. Archive blocked."** (substituting
the collected ids) and close the run; no AUDIT soft warning accompanies it.

## Pre-mutation gates

After a clean Classification Check, return each remaining decision as a
`needs_input` lifecycle result — one question at a time, in this order —
complying with the five-element anatomy of `@sai/policies/question-context.md`.
The ask is a returned result, never an inline picker call from this session.

- **Unchecked-items gate** (only when `implementation.md` exists with one or
  more `- [ ]`): ask **"Continue archiving with N unchecked items?"** with
  ordered options `yes (Recommended)` / `no`, carrying the enumerated unchecked
  items as essential state context. When `fast_track_active` is true, do NOT
  return this ask: auto-proceed as if the user answered `yes`, write no
  approval key anywhere, and continue at the sync gate. When
  `implementation.md` does not exist, skip the gate entirely.
- **Delta-spec sync gate** (only when delta specs exist): present the combined
  summary and ask with the branch's exact option set — changes-needed path
  (upstream skill step 4): `Sync now (recommended)` /
  `Archive without syncing`; missing-main-spec additions (instruction's
  Missing main spec handling): `Sync now (recommended — creates new main spec)`
  / `Archive without syncing`; already-synced path: `Archive now` /
  `Sync anyway` / `Cancel`. When `fast_track_active` is true,
  apply the instruction's Fast-track sync-gate handling instead of asking:
  auto-select **Sync now** if and only if the low-risk-by-construction test
  holds (`implementation.md` exists containing at least one `- [x]`, or the
  Classification Check resolved `backfilled=true`); auto-select **Archive
  now** on the already-synced path; otherwise return the gate as a
  `needs_input` result with its usual options. These auto-proceed branches are
  the only places where syncing proceeds without asking; never extend them.
  They also enact the standing directive that when this command's own purpose
  is archiving a change whose deltas need syncing, sync is always YES where
  today's contract auto-proceeds — never beyond it.

On a forwarded answer, process it without re-presenting the prompt and without
executing anything: on `no`, `Cancel`, or any non-confirming answer, return a
terminal `completed` payload whose summary states that archiving was not
performed, citing the unchecked items or the cancellation. On a confirming
answer, close the run with a terminal `completed` payload whose summary is the
upstream skill's step-6 completion-summary shape — change name, schema used,
the archive location per the date-prefix rule, whether specs were synced, and
any carried warnings — so the coordinator can present it verbatim after
executing the sync-and-move.

## Post-sync verification

When the coordinator resumes you after executing a selected sync, re-run the
delta comparison from the assessment step against every capability that has a
delta spec — not only the ones the sync touched. If every capability now reads
as already synced, return a terminal `completed` payload confirming the sync
and restating readiness for the archive move. Otherwise return a terminal
`completed` payload whose summary reports exactly what differs and that the
archive stopped before moving anything.

## Absolute mutation prohibition

NEVER move directories. NEVER write outside reporting duties — no main-spec
sync writes, no `.openspec.yaml` keys, no artifact edits. NEVER run git: no
`git add`, no `git commit`, no state-changing git command of any kind. The
sync writes, the archive directory move, and every git operation belong
exclusively to the coordinator.
