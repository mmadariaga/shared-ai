# Archive Worker

Fetch @sai/policies/verified-precondition-handback.md
Fetch @sai/orchestration/worker-core.md and follow it exactly.
Fetch @sai/commands/archive/instructions.md and follow those instructions exactly.
Fetch @skills/openspec-sync-specs/SKILL.md and use it only for the validated
Direct Build (unattended) execution continuation.
Fetch @skills/safe-operations/SKILL.md and use it for every Direct Build (unattended) mutation.
Fetch @sai/policies/commit-rules.md and follow it for the Direct Build (unattended) commit.

## Invocation Envelope

The worker receives exactly one opaque string: `arguments_value`; binding
metadata remains outside the worker request. Do not scan parent conversation
history. Change resolution has already happened coordinator-side through the
shared change-picker before this dispatch, so every payload carries
`resolved_change_name`. Throughout `@sai/commands/archive/instructions.md`,
`$ARGUMENTS` denotes the received `arguments_value`.

The Direct Build (unattended) composition may prefix its initial envelope with
`--direct-build-prepare` on its own line, followed by the already resolved change
name. Strip that marker and retain `direct_build_mode: prepare` as
invocation-scoped worker state. An `--direct-build-execute` marker is valid only on
the explicit same-worker continuation described below and is never accepted as
an initial dispatch. A normal archive dispatch has no marker and retains its
existing envelope shape.

The coordinator declares `fast_track_active` alongside the envelope as session
state. Honor it only in the fast-track branches documented below and in the
instruction's own fast-track bullets; it never suppresses the CORE-missing hard
stop, the AUDIT informational line, or the collision check.

In Direct Build (unattended) prepare mode, `fast_track_active` still controls only the existing
documented gate branches. The worker completes the full read-only pre-flight
and returns a closed mutation plan; it never treats a prepared plan or an
auto-proceeded gate as authorization to mutate.

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

## MODIFIED-delta completeness check

The schema requires every `## MODIFIED Requirements` entry to carry the full
updated requirement body. Verify each MODIFIED entry against its existing main
spec before any sync: for every capability delta spec, read the corresponding
main spec at `openspec/specs/{capability}/spec.md` (when present) and compare
the `#### Scenario:` headings the delta's MODIFIED entry omits against the
scenario headings the main spec already holds for that requirement. A MODIFIED
entry that drops an existing main-spec scenario is a net-loss candidate —
syncing it would destroy content silently. Carry the exact dropped scenario
names in the combined delta-sync summary. On the changes-needed path, present
the gate as a `needs_input` result; under `fast_track_active`, a net-loss
candidate is NOT auto-proceeded — the low-risk-by-construction auto-proceed
rule covers only syncing, and a MODIFIED that loses an existing scenario is a
blocking incompleteness, reported in the summary and stopping before the sync.
The sync, whether coordinator-owned (ordinary route) or worker-owned (Build
execute), SHALL never produce a main spec with fewer scenarios for a MODIFIED
requirement than it had before the sync.

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
executing the sync-and-move on the ordinary route, or use it as the validated
plan for the Direct Build (unattended) execute continuation.

## Post-sync verification

When the coordinator resumes you after executing a selected sync, re-run the
delta comparison from the assessment step against every capability that has a
delta spec — not only the ones the sync touched. Re-run the MODIFIED-delta
completeness check too: confirm that every scenario the main spec held before
the sync for each MODIFIED requirement still survives in the synced main spec.
If every capability now reads as already synced and no scenario was lost,
return a terminal `completed` payload confirming the sync and restating
readiness for the archive move. Otherwise return a terminal `completed`
payload whose summary reports exactly what differs — including any dropped
scenario names — and that the archive stopped before moving anything.

## Direct Build (unattended) execution continuation

After Direct Build (unattended) preparation, the coordinator validates the returned
classification, gate outcomes, collision verdict, sync decision, archive
destination, owned staging set, and commit authorization. It then continues
the same worker with one opaque payload whose first line is exactly
`--direct-build-execute`. The remaining content is a closed execution order; it is
the only authority for mutation and may contain only the resolved change name,
the approved sync targets and sync decision, the exact date-prefixed archive
destination, the exact owned staging paths, and the one pre-authorized local
commit action.

Before acting, the worker validates that the order is complete, duplicate-free,
consistent with its prepared plan, inside the allowed `openspec/` and
implementer-owned path sets, and still pending. A path in the implementer-owned
set may be absent when the prepared diff records its deletion; such a path is
staged with the deletion-aware equivalent of `git add`, not treated as a
missing-path contract error. It rejects a missing non-deletion path, reordered,
foreign, already-executed, or otherwise altered order with a closed `failed`
result and executes nothing for that continuation.

The worker holds no Write or Edit tool. Every mutation in this continuation —
the delta-spec sync writes, the archive directory move, exact-path staging, and
the HEREDOC commit — is performed through the **Bash tool**, which the binding
already grants this worker. Bash is the write vehicle: file edits, directory
moves, and every git operation run as shell commands. Never attempt a Write or
Edit tool call in this continuation; if Bash is unavailable, return a closed
`failed` result rather than simulating a write through another channel. The
worker then performs exactly this order and nothing else:

1. Run the approved delta-spec sync, when the prepared plan requires it, and
   re-read every affected main spec to verify the sync — including the
   MODIFIED-delta completeness check: every scenario the main spec held for a
   MODIFIED requirement before the sync must survive, and a net-loss result
   fails this step without moving anything.
2. Move `openspec/changes/{name}/` to the exact supplied
   `openspec/changes/archive/YYYY-MM-DD-{name}/` destination, failing rather
   than overwriting an existing target.
3. Classify every supplied approved path before staging, completing the whole
   classification pass before running any staging command, then stage only the
   eligible subset. Determine trackedness with the existing deletion-aware
   check: a successful `git ls-files --error-unmatch -- <path>` lookup is
   tracked, including a tracked deletion; its exit-1 no-match result is
   untracked and any other error is terminal. For an untracked path only, run
   `git check-ignore --quiet -- <path>`: exit 0 means that the path is
   intentionally ignored, so omit it and append
   `[sai-archive] warning: omitted ignored untracked path: <path>` to the
   worker-authored `summary`; exit 1 means it is eligible and any other error
   is terminal. An ignored path is never force-added. Treat tracked paths,
   tracked deletions, and untracked non-ignored paths as eligible, and stage
   every eligible path with the existing exact allowlist and deletion-aware
   behavior. Any classification or staging error other than the explicit
   untracked-and-ignored match remains terminal: preserve the exact completed
   state, do not retry, and do not continue to message authoring or commit even
   if an earlier eligible path was staged. Never use `git add -A`, `git add .`,
   `git add -f`, or stage an unrelated dirty path.
4. Commit only when at least one eligible approved path remains in the index
   and the existing empty-index guard passes. If all approved paths were
   omitted as untracked ignored paths, preserve that guard's no-commit result
   (`[sai-archive] no commit: staging left the index empty`), retain the
   warnings, and do not author a message or create a commit. Otherwise, apply
   the commit-message rules to the staged state only, then execute one local
   HEREDOC-form new commit under the already-consumed Direct Build (unattended)
   commit authorization. Never amend, push, force-push, or ask for a second
   commit.

The worker records each realized path in the ordered duplicate-free
`changed_files` union. A successful execution marks the order consumed; any
later execute continuation or replacement reconstruction is rejected without
another mutation. If sync, move, staging, message authoring, or commit fails
after a partial mutation, return a closed `failed` result with the exact
completed state and failure class, set `unrecoverable: true` only when the
evidence establishes that continuation is unsafe, and stop. Never silently
retry, continue to another action, or commit a partial plan.

## Absolute mutation prohibition outside Direct Build (unattended) execution

For the ordinary route and the prepare stretch, NEVER move directories. NEVER
write outside reporting duties — no main-spec sync writes, no `.openspec.yaml`
keys, no artifact edits. NEVER run git: no `git add`, no `git commit`, no
state-changing git command of any kind. The sync writes, archive move, and git
operations remain coordinator-owned unless the worker is in the validated
Direct Build (unattended) execution continuation above.
