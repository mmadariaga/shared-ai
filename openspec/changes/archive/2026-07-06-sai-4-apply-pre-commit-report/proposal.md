## Why

`sai-4-apply` dispatches Step-execution subagents that modify files inside their own context, and the user is asked to authorize `git commit` without seeing which paths were touched. Deviations from the plan, untracked files, or in-progress work are invisible until after the commit. A structured pre-commit file visibility report at every STOP & COMMIT closes that gap, and aligning `sai-commit` to the same format makes the gate consistent regardless of which command the user came from.

## What Changes

- Append an 8th field — **Files modified** (paths relative to repo root) — to the subagent report contract. The existing 7 fields keep their shape and order.
- `sai-4-apply` prints a structured pre-commit file report at every STOP & COMMIT, sourced from `git status` + `git diff --cached --stat` + the subagent's field 8. The report is mandatory, not opt-in.
- The report surfaces **unstaged files** under a `will NOT be committed` label so the user can spot in-progress work before authorization.
- The report cross-checks the subagent's reported files against the file scope declared in the current Step of `implementation.md`; deviations are flagged.
- The report detects **subagent/git mismatch** (e.g. subagent reports fewer files than `git status` shows) and flags it so the user decides.
- The STOP & COMMIT checklist is reordered: the report step runs **before** the commit message proposal, so the user can veto the whole commit (not just the message) on a bad file list.
- `sai/instructions/commit.md` emits the same report structure, replacing the current `Files staged: {N} ({first 5 paths, ...if more})` line.
- The gate stays a single user authorization — the report moves the existing one earlier in the checklist; no second approval is introduced.
- No new application files, no schema changes, no changes to the OpenSpec artifact graph (the new spec files under the change directory — `proposal.md` and `specs/**/*.md` — are standard OpenSpec proposal output). The change is confined to `sai/instructions/apply.md` and `sai/instructions/commit.md` (plus the subagent prompt template embedded in `apply.md`).

## Capabilities

### New Capabilities
- `apply-pre-commit-file-report`: At every STOP & COMMIT, `sai-4-apply` prints a structured pre-commit file visibility report (status letter, human-readable status, `+N -M` per file, total stats) sourced from `git status` + `git diff --cached --stat` + the subagent's field 8. The report surfaces unstaged files, cross-checks against the file scope declared for the current Step in `tasks.md` (the change's sibling artifact, not `implementation.md`), detects subagent/git mismatches, and is mandatory.
- `commit-report-alignment`: `sai/instructions/commit.md` emits the same pre-commit file report structure as `sai-4-apply`, replacing the current `Files staged: {N} ({first 5 paths, ...if more})` line in Step 6, so users see one consistent shape whether they came through `sai-4-apply` or `sai-commit`.

### Modified Capabilities
- `apply-subagent-report-contract`: Append an 8th field — **Files modified** (paths relative to repo root) — to the 7-field subagent report contract. Fields 1–7 stay unchanged in shape and order; field 8 is appended after field 7 (`STOP reached?`).
- `stop-commit-checklist`: The 5-step checklist is reordered so the file visibility report step (now mandatory) runs **before** the commit message proposal (current step 1). The remaining 4 steps (propose, ask, wait, commit) and the gate semantics — single user authorization, on `y` run `git commit`, on anything else do not commit — stay intact.

## Impact

- `sai/instructions/apply.md` — the `## Subagent Report Contract` section grows from 7 to 8 fields; the `## STOP & COMMIT Checklist` section is reordered and gains the file report step; the `## Step-Execution Subagent Dispatch` section's prompt template gains the field 8 requirement.
- `sai/instructions/commit.md` — Step 6 (Present and Authorize) replaces the one-line `Files staged: {N} (...)` summary with the same structured report used by `sai-4-apply`.
- `commands/opencode/sai-4-apply.md` and `commands/claude/sai-4-apply.md` — no changes; they `Fetch @sai/instructions/apply.md`.
- `commands/opencode/sai-commit.md` and `commands/claude/sai-commit.md` — no changes; they `Fetch @sai/instructions/commit.md`.
- `AGENTS.md` — **NOT modified by this change** (out of scope per the constraint "confined to `sai/instructions/apply.md` and `sai/instructions/commit.md`"). AGENTS.md has no `Git Operations` subsection under `## Critical conventions`; the stale 4-step STOP & COMMIT narrative and the subagent-dispatch model live in `sai/instructions/apply.md` (lines 89-98 and 49-69), not in AGENTS.md. Both become stale after this change. Tracked as a follow-up: a separate change will reconcile the `apply.md`-located narrative (and update AGENTS.md if it later grows a STOP & COMMIT description) to reflect the 5-step flow and the pre-commit file report concept.
- No schema changes, no new files, no changes to the OpenSpec artifact graph.

## Proposal Research Documentation

**Local files**:
- `sai/instructions/apply.md` — current subagent contract (lines 71–81), STOP & COMMIT checklist (lines 89–98), Step-Execution Subagent Dispatch (lines 49–69).
- `sai/instructions/commit.md` — current Step 6 (lines 92–113), specifically the `Files staged: {N} ({first 5 paths, ...if more})` line to be replaced.
- `openspec/specs/apply-subagent-report-contract/spec.md` — the 7-field contract being extended with field 8.
- `openspec/specs/stop-commit-checklist/spec.md` — the 5-step checklist being reordered.
- `openspec/specs/apply/spec.md` — commit message format and explicit permission gate at STOP & COMMIT.
- `openspec/specs/commit/spec.md` — `sai-commit` capability; Step 6 (Present and Authorize) is the affected area.
- `openspec/schemas/sai-workflow/schema.yaml` — confirmed no schema changes required; the 9-artifact graph is unchanged.
- `AGENTS.md` — STOP & COMMIT, subagent delegation, scope of `sai/instructions/apply.md` and `sai/instructions/commit.md`.

**External URLs**: None consulted.

## Additional Notes

- The report deliberately does **not** include a diff preview (per the user's decision 3). Users who want the diff inspect via `git diff --cached` or read the files directly.
- The `Files modified` field is **required** in the subagent report. A subagent that does not populate it produces a report that the coordinator must treat as malformed and surface to the user — there is no "unknown" path.
- "File scope" for the plan cross-check means: for the current Step in `implementation.md`, the **matching** Step in the change's `tasks.md` (sibling artifact at `openspec/changes/{change-name}/tasks.md`), specifically the set of paths listed on that tasks.md step's `**Files Affected**` line. The implementation.md template's `**Task ref:**` value (e.g. `1.1`) is **not** the lookup key — the scaffold's tasks.md steps use integer `## Step N:` headings. The lookup matches by the integer `N` from the implementation.md `## Step N — <title>` heading to the integer `N` of the tasks.md `## Step N: <title>` heading. If a tasks.md step with that integer is missing, or its `**Files Affected**` line is empty, the cross-check skips with a printed reason rather than spuriously flagging files. The cross-check is informational, not blocking — the user still decides.
- The subagent/git mismatch detection compares the subagent's `Files modified` set against `git status` paths (untracked, modified, added, deleted, renamed). The mismatch is reported when the sets are not equal. The user decides whether to proceed; the report does not block.
- "Reordered STOP & COMMIT checklist" is a structural change: the file report becomes the **new step 1**, and the commit message proposal (current step 1) becomes step 2. The 5-step structure is preserved (report, propose, ask, wait, commit), and the gate semantics are unchanged.
- `sai-commit`'s Step 6 adopts the same report format verbatim. Where `sai-4-apply` cross-checks against the plan and detects subagent/git mismatch, `sai-commit` does not (no subagent, no plan) — it only emits the staged-file portion. Both commands must produce the same shape so a user moving between them does not have to learn two layouts.
