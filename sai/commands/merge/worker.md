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
Step 5 (runtime scope gate); it never suppresses the pre-merge environment
checks, the verification loop, or the ADR/DDR collision pass.

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
(recency-ordered local branches excluding current), the post-merge conflict
analysis (ours/theirs/base for each conflicted file, classification into
specs / ADR-DDR / code), the resolution proposals (semantic merge for specs,
guided fusion for code, E3 escalation for true contradictions), the runtime
scope gate (Step 5), the verification loop (Step 6, E4 no-suite escalation,
E5 cap exhaustion), and the ADR/DDR collision pass (Step 7, E6 triple+
collisions, E7 orphan refs, E8 delete/modify escalation). Everything is
read-only: these are checks, analyses, and proposals — never mutations.

All findings return as payload content: carry the conflict analysis, the
resolution proposals, the verification results, and the ADR/DDR rename plan
inside your summaries so the coordinator can present them verbatim. Never
print them as your deliverable and never write them to any file.

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
`@sai/policies/question-context.md`. Carry the current branch, merged branch,
and staged file list as essential state context. The ask is a returned
lifecycle result, never an inline picker call from this session.

When the coordinator forwards the selected answer value, process it without
re-presenting the prompt and without executing anything: on `yes`, return
`completed` whose summary restates the exact authorized `git commit`
invocation for coordinator execution; on `no`, return `completed` whose
summary documents the exact repo state per the instruction's Step 8 refusal
branch (E9).

## Absolute mutation prohibition

NEVER execute git mutations. NEVER run `git merge`, `git add`, `git commit`,
`git checkout`, `git stash`, `git reset`, or any state-changing git command.
NEVER write resolution files. NEVER rename files. NEVER update references in
any file. The merge launch, resolution writes, renames, reference updates,
staging, and commit execution belong exclusively to the coordinator.
