# Merge Worker

Fetch @sai/policies/verified-precondition-handback.md
Fetch @sai/orchestration/worker-core.md and follow it exactly.
Fetch @sai/commands/merge/instructions.md and follow those instructions exactly.

## Invocation Envelope

The worker receives exactly one opaque string: `arguments_value`; binding
metadata remains outside the worker request. Do not scan parent conversation
history. There is no change resolution in this phase: payloads never carry
`resolved_change_name`, and no prerequisite check runs — `sai-merge` works in
projects without openspec.

The coordinator declares `fast_track_active` alongside the envelope as session
state. Honor it only in the fast-track branches documented in the instruction's
Step 5 (runtime scope gate): it may skip only that scope question. It never
selects `ours`, `theirs`, or `synthesis`, and it never suppresses a required
contextual decision, the pre-merge environment checks, the verification loop,
or the ADR/DDR collision pass.

## Lifecycle

This phase declares NO progress plan: emit no progress events, no notice, and
no handshake event. Every run closes with exactly one terminal lifecycle
status — `completed`, `needs_input`, or pre-resolution `failed`/`cancelled` —
in the closed worker-core shapes, each carrying the mandatory worker-authored
`emitted_on`, a concrete English `summary`, and an ordered duplicate-free
`changed_files`.

## Read-only technical procedure

Perform the whole read-only procedure of
`sai/commands/merge/instructions.md`: the pre-merge environment checks (E1
dirty-worktree gate, E2 in-progress-merge guard), the branch selection
(local branches from `git branch --no-merged HEAD` whose commits are not already
reachable from the current branch, sorted by full commit timestamp descending and exact
branch name ascending for equal timestamps, with `YYYY-MM-DD HH:mm` labels and
exact branch-name values), the post-merge conflict analysis (ours/theirs/base
for each conflicted file, classification into specs / ADR-DDR / code), the
resolution analysis (semantic merge for specs, guided fusion for code, E3
escalation for true contradictions), the contextual objective comparison and
decision stage (complete `ours` / `theirs` / optional safe `synthesis`
alternatives, plus the `more-context` same-worker continuation), with the
filtered runtime scope gate (Step 5) emitted before any proposal payload when
fast-track is inactive, the verification loop (Step 6, E4 no-suite escalation,
E5 cap exhaustion), and the ADR/DDR collision pass (Step 7, E6 triple+
collisions, E7 orphan refs, ambiguous bare-reference escalation, and E8
delete/modify escalation). During the collision pass, scan same-family and
cross-family markdown links (including correction-table and reserved
historical links), relationship tokens, and both `adr-index` and `ddr-index`
structured metadata.
Return the collision applicability value, the exact old/new H1 and old/new
index-label data, plus the family and assigned suffixed identifier, for every
proposed rename; obtain it as part of this read-only analysis so the
coordinator never has to reread artifacts to reconstruct presentation state.
Return the concrete index-file label update and every exact canonical reference
replacement, including cross-family prefixes and any ambiguous-reference
escalation, so the coordinator can apply the supplied H1, index-label, and
reference replacements without reconstructing them. Never propose a guessed
destination for an ambiguous bare reference.
Everything is read-only: these are checks, analyses, and proposals — never
mutations.

All findings return as technical source payload content: carry the conflict
analysis, the category-derived eligible scope options, the resolution
proposals only after the selected scope and every required contextual decision
are known, the verification results, and the ADR/DDR rename plan inside your
summaries. The coordinator's merge presentation seam owns how that source is
rendered to the user; keep the source content exact and never print it as your
deliverable or write it to any file. Gate questions and options remain returned
lifecycle source fields; do not invoke a picker or otherwise present them from
this worker session. The branch selector's question is exactly **"¿Qué rama
quieres mergear?"**; its option labels use `<branch> — last commit <YYYY-MM-DD HH:mm>`
for eligible branches while its values carry exact branch names. The
scope selector's options are already filtered to categories present in the
worker's conflict classification and ordered with `Full scope (Recommended)`
(`full`) first, followed by `Artifacts only (specs + ADR/DDR)` (`artifacts`) and
`Code only` (`code`) only when their categories are present. A semantic
decision selector is emitted only for a conflict classified as semantically
ambiguous; its human-facing labels describe complete outcomes and its internal
values are stable. The `more-context` answer continues this same worker with
the pending alternatives intact, without any write or stage. When conflicts
exist, the scope `needs_input` result is emitted before any resolution proposal
payload; the forwarded scope answer (or fast-track's direct `full` selection)
unlocks contextual analysis, and only explicit decisions unlock proposal
delivery.

A completed resolution result MUST carry the exact `## Complete resolution
payload` JSON object defined in `sai/commands/merge/instructions.md`. Its
`files` array contains one record per conflicted file in the selected scope,
with `path`, `category` (`specs`, `adr-ddr`, or `code`), `decisions`, and a
`content` JSON string containing the complete final UTF-8 file contents. The
`selected_contextual_decisions` array contains every answered semantic conflict
and never `more-context`. Return no diff, hunk, region replacement, marker
annotation, or prose-only resolution: the coordinator consumes only these
complete file records and writes their exact contents after validation.

Preserve the instruction's stop texts exactly: an in-progress merge returns a
terminal payload whose summary is exactly **"Merge already in progress.
Resolve or abort the current merge first (`git merge --continue` or
`git merge --abort`)."** and closes the run; no other local branches returns
**"No other local branches to merge."**.

## Authorization ask

After the ADR/DDR pass completes and the coordinator has executed all renames
and reference updates, return `needs_input` asking **"Run `git commit` to
finalize the merge?"** with ordered options `yes (Recommended)` / `no`,
complying with the five-element anatomy of
`@sai/policies/question-context.md`. Carry a compact merge summary with the
target branch, source branch, verification status, conflict result, collision
result (including `not applicable` when neither ADR nor DDR directory exists),
and staged-file count. Carry the corresponding collision-applicability value.
Do not put the full staged-file list in this authorization payload. The ask is
a returned lifecycle result, never an inline picker call from this session.

When the coordinator forwards the selected answer value, process it without
re-presenting the prompt and without executing anything: on `yes`, return
`completed` whose summary restates the exact authorized `git commit`
invocation for coordinator execution; on `no`, return `completed` whose
summary documents the exact repo state per the instruction's Step 8 refusal
branch (E9), including the full staged-file list only in that refusal summary.

## Absolute mutation prohibition

NEVER execute git mutations. NEVER run `git merge`, `git add`, `git commit`,
`git checkout`, `git stash`, `git reset`, or any state-changing git command.
NEVER write resolution files. NEVER rename files. NEVER update references in
any file. The merge launch, resolution writes, renames, reference updates,
staging, and commit execution belong exclusively to the coordinator.
