# Incremental Review

The pass rules of the two coordinator review-fix loops: the step review of `/sai-3-implement` and the functional fix loop of Direct Build (Step 2 of `sai/commands/explore/steps/pipeline-direct-build.md`). `/sai-4-review`, the Direct Build suite-gate rounds (Step 2b), and every other review loop keep their own behavior and do not load this file.

Fetch @sai/policies/tool-resolution.md

The goal is that a loop converges: unchanged code is read once, a fixed finding is not reported again, and only a problem the change caused opens a fix round.

## Terms

- **starting point**: the commit a loop compares against: `base_sha` in Direct Build, HEAD before the step in `/sai-3-implement` (HEAD does not move until the step's commit, so it is `HEAD` throughout the step's review).
- **snapshot**: a Git tree object of the working tree at one moment, written through a temporary index.
- **delta**: the difference between the snapshot taken before a fix round and the one taken after it.
- **Pre-existing**: a finding whose problem also exists at the starting point.

## Snapshots

`review-delta.js` (resolved per `tool-resolution.md`) owns both. `node <tool-path> snapshot [path ...]` prints the tree identifier; name each git-ignored path the loop changed as an argument (`git check-ignore -q <path>` succeeds), so it enters the snapshot. `node <tool-path> delta <T1> <T2>` prints the changed paths and their diff. A snapshot never touches the real index, the user's staging, or the working tree, and it includes new untracked files. A `n/a` verdict means no snapshot exists: review the full diff instead.

Take a snapshot immediately before each pass, after the fix's files are staged where the loop stages them. Keep the identifier where the loop keeps its state.

## Passes

- **First pass: full.** Review the loop's full diff: in `/sai-3-implement` the step's staged diff (`git diff --cached`; a path the staging rule left out is read from the working tree), and each step starts again with a full pass over its own diff; in Direct Build `git diff` from `base_sha`.
- **Later passes: the delta only**, plus the direct consumers of the code the delta changed. Read the delta from the previous pass's snapshot to this pass's. Dispatch one `budget-explorer` (with its two-phase startup) with the paths and symbols the delta changed, and the output contract: the direct consumers as `file:line` entries, at most 30, no source text. The explorer's ladder already prefers CodeGraph and detects it, so add no probe and no second search path. When the lookup fails or returns nothing usable, review the delta alone and state in the pass report that consumers were not reviewed; this never blocks the loop.
- **Empty delta.** When a fix round changed nothing, the next pass reviews no code: the open findings stay open and the round counts toward the cap.
- **Missing snapshot.** When the previous snapshot identifier is missing (a Direct Build compaction loses it) or the tool answered `n/a`, the pass reviews the full diff.
- **Cap.** At most 3 fix rounds, then one final pass over the round-3 delta and its consumers. The final pass only reports: it sends nothing to a worker. Its findings go to the loop's pending record.

## Ledger

Each loop keeps a ledger of its findings with one state per finding:

- `open`: found, or sent for fixing, and not yet confirmed fixed. It stays open until a later pass confirms the fix. When the delta does not touch its area, it is carried into the next round as open without re-reading the full diff.
- `fixed`: a later pass confirmed it.
- `scope`: a scope observation (`artifact-review-contract.md` § Scope observations).
- `Pre-existing`.

Identifiers restart every pass, so the ledger matches a finding by its location and issue and keeps the identifier of its first appearance. A `fixed`, `scope`, or `Pre-existing` finding is reported again only when the delta changes its area.

## Pre-existing

A finding is `Pre-existing` only when its problem also exists at the starting point. Decide by cause, not by line: a consumer the change broke sits on an untouched line, but the break is the change's, so it is an ordinary finding and opens a fix round. Read the file at the starting point with `git show <ref>:<path>`, with no worktree (`<ref>` is the starting point; a file that does not exist there cannot be Pre-existing).

A `Pre-existing` finding is never sent to a worker, does not prevent convergence, and is reported once at the end, in the loop's closing report.
