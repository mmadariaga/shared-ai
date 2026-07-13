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
- Dispatch Step-execution subagent(s) (see "## Step-Execution Subagent Dispatch" below) to execute the next unchecked Step's implementation body. **The coordinator SHALL NOT itself perform the Step's read-before-write reads, RED-test runs, or GREEN iteration** — those happen only inside the subagent(s), so their raw output (file dumps, tracebacks, iteration logs) never enters the coordinator's context.
- When the subagent(s) return their report(s) (see "## Subagent Report Contract" below), process them in this fixed order — the coordinator's own re-verification (step 1) MUST pass before either checkbox marking (step 4) or the commit proposal (STOP & COMMIT, below):
    1. **Coordinator verification.** Re-run the Step's Verification Checklist yourself — quiet confirmation only (the automated checks), not the RED→GREEN cycle or the read-before-write reads. If your own re-run disagrees with what the subagent reported, do NOT mark checkboxes and do NOT propose a commit — surface the discrepancy to the user instead.
    2. **Incorporate learnings.** Immediately after a matching verification pass, add the report's technical-learnings entries (if any) to the accumulated learnings memory (see "## Technical Learnings Memory" below).
    3. **Human Verification gate.** If the Step's Human section contains at least one `- [ ]` checkbox, present those checks to the user and wait — do NOT mark any of them `[x]` until the user confirms they have reviewed. The gate keys on checkbox count, not on the presence of a `**Human (...)**` header: if the Human section contains zero `- [ ]` checkboxes (for example it holds only an italic explanatory note), or the Step has no Human section, this gate does not apply — proceed directly to the commit proposal after automated checks pass.
    4. **Mark checkboxes.** Once verification passed and (if applicable) the user confirmed Human Verification, mark all of that Step's checkboxes `[x]` in `openspec/changes/{change-name}/implementation.md` in one batched update — per Step, not per item. This supersedes the general "mark each item immediately, do not batch" default for `sai-4-apply` only.
    5. **Deviations appendix.** Append the report's deviations (if any) per the format below. This must happen before the coordinator commits, so the appendix entry lands in the same commit as the changes it describes.
- If a subagent's report indicates "STOP reached? = yes" (it halted mid-Step at a STOP & COMMIT marker in the Step's own body, or at a GREEN-conflict STOP), treat the work reported so far according to the halt type: for a STOP & COMMIT marker, run the checklist below for what was completed; for a GREEN-conflict STOP, follow the GREEN-conflict halt path above.
- **GREEN-conflict halt (testable Steps only):** If the implementation dispatch for a testable Step reports GREEN = fail and STOP reached = yes (unpassable GREEN — the implementation cannot satisfy the test-writer's tests within bounded, test-file-untouching iteration), the coordinator SHALL surface the conflict to the user and SHALL NOT mark the Step's checkboxes, propose a commit, or advance to the next Step. The coordinator waits for the human to decide whether the fault is the implementation, the test, or the interface. This path is distinct from a STOP & COMMIT marker: it is a failure, not a checkpoint.
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

Per Step, the coordinator dispatches subagents according to the Step's testability:

- **Testability signal**: a Step is **testable** when its body contains a `##### RED phase` block; it is **non-testable** when no RED block is present.
- **Non-testable Step**: the coordinator dispatches exactly **one** subagent, as in the pre-split flow.
- **Testable Step**: the coordinator dispatches **two** ordered subagents:
  1. A **blind test-writer** dispatch.
  2. An **implementation** dispatch (only after the test-writer reports a valid RED).

### Non-testable Step dispatch

- **Type**: a **write-capable** subagent — the **`budget-subagent`** skill. Full read/write/search/run access is required.
- **Model**: resolved by the `budget-subagent` skill's per-harness binding — the standard cheap tier applies.
- **Prompt contents**: exactly three parts — the full text of the Step, the following rules verbatim, and any technical-learnings entries the coordinator judges relevant to this Step (see "## Technical Learnings Memory" below; never the full memory) — and **nothing else**.
    - *Scope*: Implement ONLY what is specified in the Step. DO NOT WRITE ANY CODE OUTSIDE OF WHAT IS SPECIFIED IN THE STEP. Exception: minimal stubs required to make a RED test fail by assertion are permitted; they are part of the test scaffolding, not new feature code.
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
- **Prohibitions**:
    - Run any git operation or create any commit.
    - Mark any checkbox or otherwise edit `openspec/changes/{change-name}/implementation.md`.
    - Act on a STOP & COMMIT marker — halt and report the STOP instead.
    - Run any `openspec` command, load any skill, or read change artifacts (`implementation.md`, `tasks.md`, `proposal.md`, `design.md`) — the Step text in the dispatch prompt is the complete work order.
    - Read any file outside the *No exploration* rule's permitted set (files the Step modifies, test files and test infrastructure, and — only after a concrete compile/test failure — the file defining the real symbol).
    - **Report completeness**: populate field 8 (`Files modified`). An empty list is valid if no files were modified; omitting the field produces a malformed report.

### Testable Step — blind test-writer dispatch

- **Type**: a **write-capable** subagent — the **`budget-subagent`** skill.
- **Model**: resolved by the `budget-subagent` skill's per-harness binding.
- **Prompt contents**: exactly four parts:
  1. That Step's `## Step N` section from `interfaces.md` (signatures + exact assertions).
  2. The testing-relevant slice of `tasks.md`'s `## Implementation Context` (framework, assertion/mock libraries, test file location/naming, run command) injected by the coordinator.
  3. The following rules verbatim.
  4. Any relevant technical-learnings entries the coordinator judges applicable (subject to the blindness constraint below; never the full memory).
  The coordinator SHALL NOT include the Step's GREEN implementation body, `implementation.md`, `design.md`, `proposal.md`, or any other artifact that reveals the intended implementation.
- **Step-N key-integrity guard**: Before dispatching, the coordinator SHALL match the integer `N` of the current `implementation.md` `## Step N` heading to a single `## Step N` in `interfaces.md`. On missing or ambiguous match, STOP and surface the desync to the user — do NOT inject an empty or mismatched contract into the blind writer.
- **Rules**:
    - *Scope*: Write ONLY the interface stubs and the tests for this Step. Do NOT write the implementation.
    - *Blindness*: Do NOT read the Step's GREEN implementation body or any production source file to derive assertions. When the injected testing context is insufficient to author a valid RED, you MAY read existing test files and test infrastructure (fixtures, harness, shared helpers) to match their patterns. Reading existing test files does not leak the implementation body.
    - *RED phase contract*: The interface stubs you write SHALL expose the required symbol but return a null/empty/wrong value and contain no logic that would satisfy the assertion. Do NOT write real implementation logic into a stub — doing so would either make the RED pass (an invalid RED) or leak implementation authorship into the blind test-writer.
    - *Read-before-write*: Before modifying any file, read its current content.
    - *RED verification*: Run the test command and inspect the failure type:
        - **Valid RED**: exit code ≠ 0 AND the failure is an assertion failure attributable to the behaviour under test. Report RED result = `valid`.
        - **Invalid RED — passes**: if the test passes, STOP and record RED result = `passes`.
        - **Invalid RED — wrong failure**: if the failure is a setup/import/compilation error, STOP and record RED result = `wrong-failure` (with the error type).
    - The test-writer does NOT verify GREEN. It reports GREEN result = `n/a`.
- **Prohibitions**:
    - Run any git operation or create any commit.
    - Mark any checkbox or otherwise edit `implementation.md`.
    - Act on a STOP & COMMIT marker — halt and report the STOP instead.
    - Run any `openspec` command, load any skill, or read change artifacts.
    - Read any production source file outside the *Blindness* fallback.
    - **Report completeness**: populate field 8 (`Files modified`) with the test/stub files written. An empty list is valid; omitting the field produces a malformed report.

### Testable Step — implementation dispatch

- **Type**: a **write-capable** subagent — the **`budget-subagent`** skill.
- **Model**: resolved by the `budget-subagent` skill's per-harness binding.
- **Prompt contents**: exactly three parts — the full text of the Step (including its GREEN body), the following rules verbatim, and any technical-learnings entries the coordinator judges relevant to this Step (including the test-writer's learnings re-injected per `## Technical Learnings Memory`) — and **nothing else**. The coordinator SHALL NOT add repo summaries or "relevant context" sections.
- **Rules**:
    - *Scope*: Implement ONLY what is specified in the Step's GREEN body. Do NOT write tests.
    - *No test-file edits*: The implementation dispatch is FORBIDDEN from creating or modifying any test file. This prohibition is absolute — even when the subagent believes the test is wrong, it SHALL NOT edit the test or the interface.
    - *Read-before-write*: Before modifying any file, read its current content.
    - *GREEN iteration*: Run the GREEN verification command. If it does NOT pass, iterate on the implementation confined to non-test files. This iteration is bounded: STOP and report the Step as unpassable when either (a) passing would require editing a test file or the declared interface, or (b) repeated attempts make no progress. Do NOT iterate indefinitely.
    - *GREEN-conflict STOP*: If the implementation cannot make the test-writer's tests pass within bounded iteration, STOP and report the failure to the coordinator, leaving all test files unmodified. A failing GREEN is either an implementation bug or a wrong test/interface — which one it is SHALL be decided by a human, never by the subagent.
    - The implementation dispatch does NOT author or verify RED. It reports RED result = `n/a`.
- **Prohibitions**:
    - Run any git operation or create any commit.
    - Mark any checkbox or otherwise edit `implementation.md`.
    - Act on a STOP & COMMIT marker — halt and report the STOP instead.
    - Run any `openspec` command, load any skill, or read change artifacts.
    - Create or modify any test file.
    - **Report completeness**: populate field 8 (`Files modified`) with the production files modified. An empty list is valid; omitting the field produces a malformed report.

## Subagent Report Contract

The subagent returns a compact report containing exactly these 8 fields, and nothing else (no raw file contents, full tracebacks, or iteration logs):

1. **Step executed** — the Step number `N`.
2. **Per-item status** — done/failed for each of the Step's checkbox items.
3. **RED result** — one of `valid` / `passes` / `wrong-failure` / `n/a` (with error type when applicable).
4. **GREEN result** — one of `pass` / `fail` / `n/a`.
5. **Deviations** — a list of `{plan, final, reason}` entries; empty if none.
6. **Technical learnings / friction** — self-contained, actionable facts discovered during execution (a symbol that does not exist, a real API signature, a version incompatibility, a workaround applied) — states what was attempted, what failed, and what works instead; empty if none.
7. **STOP reached?** — yes/no, with the exact marker message when yes.
8. **Files modified** — paths modified or created by the subagent during this Step, relative to the repo root, one path per entry; empty list if the subagent modified nothing.

The report shape (8 fields, order, semantics) is stable across all dispatch kinds. Which fields carry a real value depends on the dispatch:

- **Non-testable Step (single dispatch):** fields 3 and 4 both carry real values (RED result and GREEN result) exactly as before.
- **Testable Step — test-writer dispatch:** field 3 (RED result) carries a real value; field 4 (GREEN result) is `n/a` because the test-writer does not write or verify GREEN.
- **Testable Step — implementation dispatch:** field 4 (GREEN result) carries a real value; field 3 (RED result) is `n/a` because the implementation dispatch does not author or verify the RED test.

Field 8 is required in every report kind (an empty list is a valid value but an absent field is a malformed report).

## Technical Learnings Memory

The coordinator holds an accumulated technical-learnings memory across Steps, held only in its own conversation context — never written to `implementation.md` or any other file (see `docs/adr/0020-ephemeral-in-context-technical-learnings-memory.md`). Subagents never communicate with each other directly; this memory is the only cross-Step channel, mediated entirely by the coordinator.

The coordinator SHALL incorporate a dispatch's learnings as soon as that dispatch returns — not only after the whole Step is verified — so a learning is available to the next dispatch even within the same Step.

For a testable Step split into a test-writer dispatch then an implementation dispatch, the coordinator SHALL incorporate the test-writer's technical-learnings when that dispatch returns and, before issuing the implementation dispatch, re-inject the relevant subset into it. The test-writer frequently discovers exactly what the implementation dispatch needs (a real API signature, a missing symbol); the handoff SHALL happen within the same Step — not deferred until after Step verification.

When dispatching a subagent, the coordinator SHALL select and inject only the accumulated learnings it deems relevant to that dispatch. It SHALL NOT dump the entire learnings memory into a dispatch — that would reintroduce the execution noise the delegation is designed to avoid. Learnings MAY be injected into a blind test-writer dispatch, subject to the blindness constraint: the coordinator SHALL NOT inject any learning that reveals the current Step's GREEN implementation body. Prior-Step environmental facts (missing symbols, real API signatures) do not violate blindness and MAY be injected.

## Pre-commit File Visibility Report

At every STOP & COMMIT marker, the coordinator SHALL print a structured pre-commit file visibility report **before** proposing the commit message. The report is mandatory — there is no opt-out flag, and skipping it is a spec violation.

The report is sourced from three inputs read in order:

1. `git status` (full, with untracked files) — to know which paths exist in the working tree.
2. `git diff --cached --stat` — to know which paths are staged, with `+N -M` line counts per file and total stats.
3. The subagent report field 8 (`Files modified`) — to know what the subagent(s) claim to have changed in their own context. For a **non-testable** Step this is the single dispatch's field 8. For a **testable** Step (split into a test-writer dispatch and an implementation dispatch) the coordinator SHALL use the **union** of field 8 from BOTH reports as the subagent-claimed set, because the commit is per-Step and includes the files written by both dispatches.

The report SHALL contain, in this fixed order:

1. A header line with the change name, the Step number `N`, and the overall status letter (one of `OK`, `WARN`, `MISMATCH`, `DEVIATION`).
2. A human-readable status line summarising what the letter means (e.g. "All changes staged match the plan", "1 unstaged file present", "Subagent reported 3 files; git shows 5 — see mismatch section").
3. A `Staged` block listing each staged path with its `+N -M` count, one per line, paths relative to repo root. For renames (git status shows `R  old -> new`), format as a single line `R  <new-path>  (renamed from <old-path>, +N -M)` rather than two separate entries.
4. A `Totals` line in the format `Totals: <N> files, +<ins> -<del>` summing insertions and deletions across staged files.
5. An `Unstaged (will NOT be committed)` block listing any unstaged, untracked, or otherwise-not-staged paths from `git status`, one per line. If there are none, the block is omitted entirely.
6. A `Plan cross-check` block: a `Missing` sub-list of paths declared in the matching tasks.md step's `**Files Affected**` line that have no matching entry in `git status` (neither staged nor unstaged), and an `Extra` sub-list of paths present in `git status` (staged or unstaged) that are not declared in the matching tasks.md step's `**Files Affected**`. The lookup matches the integer `N` from the current implementation.md `## Step N — <title>` heading to the integer `N` of the tasks.md `## Step N: <title>` heading. The implementation.md template's `**Task ref:**` value is NOT the lookup key. If both sub-lists are empty, the block prints `No deviations`. If no tasks.md step with that integer exists, the block prints `Plan scope not declared — cross-check skipped`. If the matching tasks.md step's `**Files Affected**` value is empty (or only a placeholder), the block prints `Plan scope empty — cross-check skipped`. In both skip cases, the status letter is not downgraded to `DEVIATION` solely on that basis.
7. A `Subagent ↔ git` block: when the subagent-claimed set (the single dispatch's field 8, or the union of both dispatches' field 8 for a testable Step) differs from the union of staged + unstaged paths in `git status`, the block lists paths present in one set and not the other, prefixed with `only-in-subagent:` or `only-in-git:`. When the sets are equal, the block prints `In sync`.

The report SHALL NOT include a diff preview, full file contents, or tracebacks.

### Malformed subagent report

If a subagent report omits field 8 (`Files modified`) or returns it as empty, the coordinator SHALL treat that report as malformed and surface it to the user explicitly. The coordinator SHALL NOT guess or fabricate the file list from `git status` alone when a subagent failed to provide it. For a **testable** Step this check applies independently to BOTH the test-writer report and the implementation report — either one omitting field 8 makes the pre-commit report unreliable for that Step. A subagent's failure to populate field 8 is itself a deviation worth flagging. In this case, print:

```
Subagent report missing field 8 (Files modified). Cannot produce a reliable pre-commit report. Review the staged state manually before committing.
```

and pause for the user before proposing the commit message.

## STOP & COMMIT Checklist

Every `STOP & COMMIT` marker in `implementation.md` requires the same 6-step sequence — no exception, no shortcut:

1. **Print the pre-commit file visibility report** per the `## Pre-commit File Visibility Report` section above. This step is mandatory and runs unconditionally so the user has the file list before being asked to authorize.
2. **Propose the commit message.** Follow the format rules in `@sai/instructions/commit-rules.md` (loaded in the next section). The message must describe only what is staged.
3. **Session flag check.** If a session-scoped commit-authorization flag is active for the current in-conversation session (set by a prior `Allow on this session` selection), skip the prompt and proceed directly to `git add` + `git commit`. The pre-commit file visibility report and proposed commit message still print unconditionally before committing; only the authorization ask and wait are removed.
4. **Ask explicitly (when flag is inactive).** Ask: `Ready to commit Step N. May I create commit with message: '<subject>'?` — as a closed-choice prompt with options `yes (Recommended)` / `no` / `Allow on this session` (per the "Closed-choice prompts" rule in `remember.md`, which gives the per-harness option-picker mapping). Do NOT run `git commit` before the user answers.
5. **Wait.** Stop here. Do not advance to the next step, do not run other git operations, do not start a subagent.
6. **On `yes` only** → run `git commit -m "..."` (or the HEREDOC form for multi-line) and report the resulting SHA + subject. **On `Allow on this session`** → run `git commit` as on `yes`, AND set the session-scoped commit-authorization flag to active for the remainder of the in-conversation session. **On anything else (no, silence, redirect)** → do NOT commit. Print: "Commit not authorized. The staged changes are: <summary>. Run `git commit` yourself when ready."
7. **Continue the loop.** In all outcomes, the next action after reporting is dispatching a NEW Step-execution subagent for the next unchecked Step — not implementing it yourself, and not ending the turn. Only if no unchecked Step remains: run the Final sweep and declare the implementation done.

This checklist overrides any directive in the plan that says "stage and commit". The plan describes the work; this checklist describes the commit gate.

### Session-scoped commit authorization flag

The agent MAY maintain a single boolean flag in its in-conversation working memory: `session_commit_authorized`.

- **Set active:** when the user selects `Allow on this session` at the commit-authorization gate. The flag remains active for the remainder of the in-conversation session.
- **Read:** at every subsequent entry to the commit-authorization gate (step 3 above). If active, the agent skips the ask and proceeds to `git add` + `git commit` after printing the file-visibility report and proposed message.
- **Reset:** the flag is inactive at the start of every new chat or new `/sai-*` invocation (Isolation Mode clears inherited context). It is NEVER written to `.openspec.yaml`, config, or any file on disk.
- **Scope boundary:** the grant covers `git add` + `git commit` at the commit gate ONLY. It does NOT authorize `push`, `--force`, branch create/switch, rebase, merge, tag, or `gh pr`; those operations still require their own per-operation approval regardless of the flag. The grant does NOT bypass the GREEN-conflict STOP or the apply Human Verification gate; those still halt the workflow regardless of the flag.

## Git Operations

Fetch @sai/instructions/commit-rules.md

**CRITICAL:** Do not manage git branches or create commits without explicit user authorization - ask for it.
The plan's `STOP & COMMIT` markers signal that the step is ready to commit, but they are NOT
blanket authorization. You still propose the commit message and wait for user approval before
running `git commit`. Branch creation/switching always requires explicit approval regardless
of plan markers.

- **Ask before any git operation**: Before creating branches, commits, pushing, or any other git action, ask the user for explicit permission.
- **No implicit authorization** (default): Do not assume permission from previous sessions or tasks. Ask every time.
- **Session opt-in carve-out**: The user MAY select `Allow on this session` at the commit-authorization gate. When selected, `git add` + `git commit` for the remainder of the in-conversation session proceed without re-asking. This carve-out applies ONLY to `git add` + `git commit` at the commit gate; it does NOT relax the per-operation approval requirement for push, `--force`, branch create/switch, rebase, merge, tag, or `gh pr`.
- **Delegate to user if not authorized**: If user does not grant permission, describe what needs to be done and let the user execute the git operations.
- **Operations requiring permission**: Branch creation/switching, commits, push, rebase, merge, tag operations, or any destructive git action.

Example workflow:
1. Dispatch Step-execution subagent(s) for the current Step (per "## Step-Execution Subagent Dispatch" — write-capable per-harness binding)
2. Receive the subagent report(s) (8 fields — see "## Subagent Report Contract")
3. Re-run the Step's Verification Checklist yourself (Automated checks); on a mismatch with the report, stop and surface the discrepancy instead of continuing
4. Incorporate the report's technical learnings into the coordinator's memory
5. If the step's Human section has ≥1 `- [ ]` checkbox: present the checklist to the user and wait — do NOT mark them yet. If it has zero `- [ ]` checkboxes (italic note only) or there is no Human section: skip this gate and proceed to the commit proposal
6. If the user confirms they have reviewed and asks to continue (or the step had no Human Verification checks), mark all of that Step's checkboxes `[x]` in the plan in one batched update, and append any reported deviations to the plan's appendix
7. Print the pre-commit file visibility report (per `## Pre-commit File Visibility Report`)
8. "Ready to commit Step N. May I create commit with message: '...'?" → Wait for approval
9. If yes → Create commit
10. If no → "Describe the changes above; execute commit yourself"
11. Either way → back to 1: dispatch a NEW subagent for the next unchecked Step (never execute it yourself). Only when no unchecked Step remains: run the Final sweep, then declare the implementation done