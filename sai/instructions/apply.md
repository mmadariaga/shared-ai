## Input

The argument is the change name (kebab-case). The implementation plan lives at `openspec/changes/{change-name}/implementation.md`.

For situational status context (which tasks are tracked high-level by OpenSpec), you MAY run `openspec status --change {change-name} --json`. This is read-only context; the granular plan in `implementation.md` is the source of truth for what to do.

## Communication Mode

You are the **coordinator** for the implementation plan at `openspec/changes/{change-name}/implementation.md`. You do not execute a Step's implementation body yourself — you dispatch it to a subagent (see "## Step-Execution Subagent Dispatch"), then independently verify, gate on human confirmation, mark checkboxes, and handle the commit.

Only make the changes explicitly specified in the plan.

Follow the workflow below to ensure accurate and focused implementation.

No skills are required by default. Load a skill only if the plan invokes it explicitly.

<workflow>
- Follow the plan exactly as it is written, picking up with the next unchecked Step in the implementation plan document. You MUST NOT skip any Step.
- Dispatch a Step-execution subagent (see "## Step-Execution Subagent Dispatch" below) to execute the next unchecked Step's implementation body. **The coordinator SHALL NOT itself perform the Step's read-before-write reads, RED-test runs, or GREEN iteration** — those happen only inside the subagent, so their raw output (file dumps, tracebacks, iteration logs) never enters the coordinator's context.
- When the subagent returns its report (see "## Subagent Report Contract" below), process it in this fixed order — the coordinator's own re-verification (step 1) MUST pass before either checkbox marking (step 4) or the commit proposal (STOP & COMMIT, below):
    1. **Coordinator verification.** Re-run the Step's Verification Checklist yourself — quiet confirmation only (the automated checks), not the RED→GREEN cycle or the read-before-write reads. If your own re-run disagrees with what the subagent reported, do NOT mark checkboxes and do NOT propose a commit — surface the discrepancy to the user instead.
    2. **Incorporate learnings.** Immediately after a matching verification pass, add the report's technical-learnings entries (if any) to the accumulated learnings memory (see "## Technical Learnings Memory" below).
    3. **Human Verification gate.** If the Step's Human section contains at least one `- [ ]` checkbox, present those checks to the user and wait — do NOT mark any of them `[x]` until the user confirms they have reviewed. The gate keys on checkbox count, not on the presence of a `**Human (...)**` header: if the Human section contains zero `- [ ]` checkboxes (for example it holds only an italic explanatory note), or the Step has no Human section, this gate does not apply — proceed directly to the commit proposal after automated checks pass.
    4. **Mark checkboxes.** Once verification passed and (if applicable) the user confirmed Human Verification, mark all of that Step's checkboxes `[x]` in `openspec/changes/{change-name}/implementation.md` in one batched update — per Step, not per item. This supersedes the general "mark each item immediately, do not batch" default for `sai-4-apply` only.
    5. **Deviations appendix.** Append the report's deviations (if any) per the format below. This must happen before the coordinator commits, so the appendix entry lands in the same commit as the changes it describes.
- If the subagent's report indicates "STOP reached? = yes" (it halted mid-Step at a STOP & COMMIT marker in the Step's own body), treat the work reported so far exactly as reaching that Step's STOP & COMMIT: run the checklist below for what was completed.
- **Loop until every Step is done:** completing a Step — its verification, its checkboxes, its commit — is NOT the end of the run; it is one iteration of this workflow. After a Step's STOP & COMMIT checklist finishes (commit created, or the user declined and was told how to commit themselves), immediately return to the top of this workflow, and the first action of the new iteration is always the same: dispatch a NEW Step-execution subagent for the next unchecked Step (per "## Step-Execution Subagent Dispatch"). The no-self-execution rule holds on every iteration, not just the first: no matter how small or familiar the next Step looks after the ones already done, the coordinator never edits code, runs tests, or performs the Step's body itself — it dispatches. The only reasons to end the turn early are: the user says stop, a discrepancy/failed verification is being surfaced, or you are waiting on a Human Verification or commit-authorization answer. While `implementation.md` still contains an unchecked Step, you MUST NOT declare the implementation done, print the completion message, or suggest `/sai-5-review` — doing so mid-plan is a workflow violation, not a stylistic choice.
- **Final sweep:** When all steps in the plan are complete, scan the entire `implementation.md` and verify that every checkbox that should be checked is marked `[x]`. Report any unchecked items to the user before declaring the implementation done.
- **Plan vs Final Implementation appendix (incremental):** After the coordinator's own verification passes and (if applicable) the user confirms Human Verification for a Step, append the subagent-reported deviation entries for that Step to a `## Appendix: Plan vs Final Implementation` section at the end of `openspec/changes/{change-name}/implementation.md`. Create the section on the first deviation; on subsequent steps, append new entries below the existing ones. This MUST happen before the coordinator commits, so the appendix entry lands in the same commit as the changes it describes. The block format:

    ```markdown
    ## Appendix: Plan vs Final Implementation

    This section documents deviations between the original plan and the code that was actually merged.

    ### Step N — <Short title of the deviation>

    **Plan:** <What the plan originally said or required>
    **Final:** <What was actually implemented>
    **Reason:** <Why the change was necessary>

    ### Step N — <Next deviation in the same step>

    ...
    ```

    Document every deviation you encountered (e.g., methods that needed extra annotations, order-of-operations bugs discovered in the plan, tests removed because they were invalid, launcher changes, missing imports, etc.). Do not omit deviations just because they are small. If a step had zero deviations, do NOT add an empty entry — skip it.
</workflow>

## Step-Execution Subagent Dispatch

Per Step, the coordinator dispatches exactly one subagent:

- **Type**: a **write-capable** subagent — the **`budget-subagent`** skill (per-harness binding; `subagent_type` and full tool access resolved by the installed skill in `skills/{claude,opencode,copilot}/budget-subagent/`). Full read/write/search/run access is required for RED/GREEN execution, unlike the read-only `budget-explorer` tier — do NOT dispatch this Step to `budget-explorer`.
- **Model**: resolved by the `budget-subagent` skill's per-harness binding — the standard cheap tier applies.
- **Prompt contents**: exactly three parts — the full text of the Step, the following rules verbatim, and any technical-learnings entries the coordinator judges relevant to this Step (see "## Technical Learnings Memory" below; never the full memory) — and **nothing else**. The coordinator SHALL NOT add repo summaries, "relevant context" sections, or lists of files to inspect: the Step is self-contained, and any extra hint invites the exploration the *No exploration* rule prohibits.
    - *Scope*: Implement ONLY what is specified in the Step. DO NOT WRITE ANY CODE OUTSIDE OF WHAT IS SPECIFIED IN THE STEP. Exception: minimal stubs required to make a RED test fail by assertion (per the RED → GREEN handling rules below) are permitted; they are part of the test scaffolding, not new feature code.
    - *No exploration*: The Step is self-contained — it already names the exact files, the code to write, and the verification commands to run. Do NOT inspect the project to gain context: no orientation Grep/Glob sweeps, no reading neighboring modules "for patterns", no reading change artifacts (`implementation.md`, `tasks.md`, `proposal.md`, `design.md`), no `openspec` commands, no loading skills. The only files you may read are (a) the files the Step modifies (read-before-write), (b) the test files the Step creates or runs, and (c) existing test files and test infrastructure (fixtures, harness, shared test helpers) — reading the test suite to match its patterns and configuration is allowed. Production code stays off-limits until a failure demands it: if a symbol or API from the plan turns out not to exist — proven by a compile or test failure, not suspected in advance — you may then read the single file that defines the real symbol, apply the minimal correction, and record it as a deviation. Exploration is a reaction to a concrete failure, never preparation.
    - *Read-before-write*: Before modifying any file, read its current content. Never assume the current state of a file — verify its contents before applying changes from the plan.
    - *RED → GREEN handling*: If the step includes a RED block (test that should fail before implementation):
        1. Write the test code FIRST.
        2. Run the RED verification command and inspect the failure type:
            - **Valid RED**: exit code ≠ 0 AND the failure is an assertion failure attributable to the behaviour under test (assertion mismatch, expected vs actual, raised wrong exception). Proceed to step 3. Report RED result = `valid`.
            - **Invalid RED — passes**: if the test passes, STOP and record RED result = `passes` in the report: "RED check failed — the test already passes before implementation. The test may be tautological or the feature already exists."
            - **Invalid RED — wrong failure**: if the failure is a setup/import/compilation error, missing dependency, syntax error in the test file, or any error unrelated to the assertion, STOP and record RED result = `wrong-failure` (with the error type) in the report: "RED check produced an invalid failure ({error type}). The test must fail by assertion, not by setup. Add a minimal stub for the missing symbol so the test reaches the assertion and fails on the expected value." The subagent MUST NOT silently proceed to GREEN on an invalid RED — it surfaces `passes`/`wrong-failure` via the report so the coordinator can act.
        3. Write the GREEN implementation.
        4. Run the GREEN verification command. If it does NOT pass, fix the implementation until it does.
- **Prohibitions** (the subagent SHALL NOT):
    - Run any git operation or create any commit.
    - Mark any checkbox or otherwise edit `openspec/changes/{change-name}/implementation.md`.
    - Act on a STOP & COMMIT marker if the Step's body reaches one — it halts and reports the STOP (with the exact marker message) instead of staging or committing.
    - Run any `openspec` command, load any skill, or read change artifacts (`implementation.md`, `tasks.md`, `proposal.md`, `design.md`) — the Step text in the dispatch prompt is the complete work order.
    - Read any file outside the *No exploration* rule's permitted set (files the Step modifies, test files and test infrastructure, and — only after a concrete compile/test failure — the file defining the real symbol).
    - **Report completeness** (the subagent SHALL): populate field 8 (`Files modified`) in its return report. An empty list is valid if no files were modified; omitting the field produces a malformed report.

## Subagent Report Contract

The subagent returns exactly these 7 fields, and nothing else (no raw file contents, full tracebacks, or iteration logs):

1. **Step executed** — the Step number `N`.
2. **Per-item status** — done/failed for each of the Step's checkbox items.
3. **RED result** — one of `valid` / `passes` / `wrong-failure` (with error type when applicable).
4. **GREEN result** — pass/fail.
5. **Deviations** — a list of `{plan, final, reason}` entries; empty if none.
6. **Technical learnings / friction** — self-contained, actionable facts discovered during execution (a symbol that does not exist, a real API signature, a version incompatibility, a workaround applied) — states what was attempted, what failed, and what works instead; empty if none.
7. **STOP reached?** — yes/no, with the exact marker message when yes.
8. **Files modified** — paths modified or created by the subagent during this Step, relative to the repo root, one path per entry; empty list if the subagent modified nothing.

## Technical Learnings Memory

The coordinator holds an accumulated technical-learnings memory across Steps, held only in its own conversation context — never written to `implementation.md` or any other file (see `docs/adr/0020-ephemeral-in-context-technical-learnings-memory.md`). Subagents never communicate with each other directly; this memory is the only cross-Step channel, mediated entirely by the coordinator.

After incorporating a Step's learnings (workflow step 2 above), select only the entries relevant to the next Step being dispatched and inject those into its prompt. Never dump the full memory into a dispatch — that would reintroduce the execution noise the delegation is designed to avoid.

## Pre-commit File Visibility Report

At every STOP & COMMIT marker, the coordinator SHALL print a structured pre-commit file visibility report **before** proposing the commit message. The report is mandatory — there is no opt-out flag, and skipping it is a spec violation.

The report is sourced from three inputs read in order:

1. `git status` (full, with untracked files) — to know which paths exist in the working tree.
2. `git diff --cached --stat` — to know which paths are staged, with `+N -M` line counts per file and total stats.
3. The subagent's report field 8 (`Files modified`) — to know what the subagent claims to have changed in its own context.

The report SHALL contain, in this fixed order:

1. A header line with the change name, the Step number `N`, and the overall status letter (one of `OK`, `WARN`, `MISMATCH`, `DEVIATION`).
2. A human-readable status line summarising what the letter means (e.g. "All changes staged match the plan", "1 unstaged file present", "Subagent reported 3 files; git shows 5 — see mismatch section").
3. A `Staged` block listing each staged path with its `+N -M` count, one per line, paths relative to repo root. For renames (git status shows `R  old -> new`), format as a single line `R  <new-path>  (renamed from <old-path>, +N -M)` rather than two separate entries.
4. A `Totals` line in the format `Totals: <N> files, +<ins> -<del>` summing insertions and deletions across staged files.
5. An `Unstaged (will NOT be committed)` block listing any unstaged, untracked, or otherwise-not-staged paths from `git status`, one per line. If there are none, the block is omitted entirely.
6. A `Plan cross-check` block: a `Missing` sub-list of paths declared in the matching tasks.md step's `**Files Affected**` line that have no matching entry in `git status` (neither staged nor unstaged), and an `Extra` sub-list of paths present in `git status` (staged or unstaged) that are not declared in the matching tasks.md step's `**Files Affected**`. The lookup matches the integer `N` from the current implementation.md `## Step N — <title>` heading to the integer `N` of the tasks.md `## Step N: <title>` heading. The implementation.md template's `**Task ref:**` value is NOT the lookup key. If both sub-lists are empty, the block prints `No deviations`. If no tasks.md step with that integer exists, the block prints `Plan scope not declared — cross-check skipped`. If the matching tasks.md step's `**Files Affected**` value is empty (or only a placeholder), the block prints `Plan scope empty — cross-check skipped`. In both skip cases, the status letter is not downgraded to `DEVIATION` solely on that basis.
7. A `Subagent ↔ git` block: when the subagent's `Files modified` set differs from the union of staged + unstaged paths in `git status`, the block lists paths present in one set and not the other, prefixed with `only-in-subagent:` or `only-in-git:`. When the sets are equal, the block prints `In sync`.

The report SHALL NOT include a diff preview, full file contents, or tracebacks.

### Malformed subagent report

If the subagent's report omits field 8 (`Files modified`) or returns it as empty, the coordinator SHALL treat the report as malformed and surface that to the user explicitly. The coordinator SHALL NOT guess or fabricate the file list from `git status` alone when the subagent failed to provide it. In this case, print:

```
Subagent report missing field 8 (Files modified). Cannot produce a reliable pre-commit report. Review the staged state manually before committing.
```

and pause for the user before proposing the commit message.

## STOP & COMMIT Checklist

Every `STOP & COMMIT` marker in `implementation.md` requires the same 6-step sequence — no exception, no shortcut:

1. **Print the pre-commit file visibility report** per the `## Pre-commit File Visibility Report` section above. This step is mandatory and runs unconditionally so the user has the file list before being asked to authorize.
2. **Propose the commit message.** Follow the format rules in `@sai/instructions/commit-rules.md` (loaded in the next section). The message must describe only what is staged.
3. **Ask explicitly.** Ask: `Ready to commit Step N. May I create commit with message: '<subject>'?` — as a closed-choice prompt with options `yes` / `no` (per the "Closed-choice prompts" rule in `remember.md`, which gives the per-harness option-picker mapping). Do NOT run `git commit` before the user answers `yes`; anything other than an explicit `yes` selection or reply is a decline.
4. **Wait.** Stop here. Do not advance to the next step, do not run other git operations, do not start a subagent.
5. **On `yes` only** → run `git commit -m "..."` (or the HEREDOC form for multi-line) and report the resulting SHA + subject. **On anything else (no, silence, redirect)** → do NOT commit. Print: "Commit not authorized. The staged changes are: <summary>. Run `git commit` yourself when ready."
6. **Continue the loop.** In both outcomes, the next action after reporting is dispatching a NEW Step-execution subagent for the next unchecked Step — not implementing it yourself, and not ending the turn. Only if no unchecked Step remains: run the Final sweep and declare the implementation done.

This checklist overrides any directive in the plan that says "stage and commit". The plan describes the work; this checklist describes the commit gate.

## Git Operations

Fetch @sai/instructions/commit-rules.md

**CRITICAL:** Do not manage git branches or create commits without explicit user authorization - ask for it.
The plan's `STOP & COMMIT` markers signal that the step is ready to commit, but they are NOT
blanket authorization. You still propose the commit message and wait for user approval before
running `git commit`. Branch creation/switching always requires explicit approval regardless
of plan markers.

- **Ask before any git operation**: Before creating branches, commits, pushing, or any other git action, ask the user for explicit permission.
- **No implicit authorization**: Do not assume permission from previous sessions or tasks. Ask every time.
- **Delegate to user if not authorized**: If user does not grant permission, describe what needs to be done and let the user execute the git operations.
- **Operations requiring permission**: Branch creation/switching, commits, push, rebase, merge, tag operations, or any destructive git action.

Example workflow:
1. Dispatch a Step-execution subagent for the current Step (per "## Step-Execution Subagent Dispatch" — write-capable per-harness binding)
2. Receive the subagent's report (7 fields — see "## Subagent Report Contract")
3. Re-run the Step's Verification Checklist yourself (Automated checks); on a mismatch with the report, stop and surface the discrepancy instead of continuing
4. Incorporate the report's technical learnings into the coordinator's memory
5. If the step's Human section has ≥1 `- [ ]` checkbox: present the checklist to the user and wait — do NOT mark them yet. If it has zero `- [ ]` checkboxes (italic note only) or there is no Human section: skip this gate and proceed to the commit proposal
6. If the user confirms they have reviewed and asks to continue (or the step had no Human Verification checks), mark all of that Step's checkboxes `[x]` in the plan in one batched update, and append any reported deviations to the plan's appendix
7. Print the pre-commit file visibility report (per `## Pre-commit File Visibility Report`)
8. "Ready to commit Step N. May I create commit with message: '...'?" → Wait for approval
9. If yes → Create commit
10. If no → "Describe the changes above; execute commit yourself"
11. Either way → back to 1: dispatch a NEW subagent for the next unchecked Step (never execute it yourself). Only when no unchecked Step remains: run the Final sweep, then declare the implementation done