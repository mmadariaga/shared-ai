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
    3. **Human Verification gate.** If the Step has Human Verification checks, present them to the user and wait — do NOT mark any of them `[x]` until the user confirms they have reviewed.
    4. **Mark checkboxes.** Once verification passed and (if applicable) the user confirmed Human Verification, mark all of that Step's checkboxes `[x]` in `openspec/changes/{change-name}/implementation.md` in one batched update — per Step, not per item. This supersedes the general "mark each item immediately, do not batch" default for `sai-4-apply` only.
    5. **Deviations appendix.** Append the report's deviations (if any) per the format below. This must happen before the coordinator commits, so the appendix entry lands in the same commit as the changes it describes.
- If the subagent's report indicates "STOP reached? = yes" (it halted mid-Step at a STOP & COMMIT marker in the Step's own body), treat the work reported so far exactly as reaching that Step's STOP & COMMIT: run the checklist below for what was completed.
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

- **Type**: `subagent_type: general-purpose` (full tool access — Bash, Read, Write, Edit; required for RED/GREEN execution, unlike the read-only `Explore` type).
- **Model**: do NOT pass a `model:` parameter. Omitting it makes the subagent inherit the coordinator's own running model — a deliberate, scoped exception to the usual "always pass an explicit `model:`" default, made because RED→GREEN judgment quality must not degrade for this dispatch (see `docs/adr/0017-same-model-dispatch-via-omitted-model-param.md`).
- **Prompt contents**: the full text of the Step, plus the following rules verbatim, plus any technical-learnings entries the coordinator judges relevant to this Step (see "## Technical Learnings Memory" below) — never the full memory:
    - *Scope*: Implement ONLY what is specified in the Step. DO NOT WRITE ANY CODE OUTSIDE OF WHAT IS SPECIFIED IN THE STEP. Exception: minimal stubs required to make a RED test fail by assertion (per the RED → GREEN handling rules below) are permitted; they are part of the test scaffolding, not new feature code.
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

## Subagent Report Contract

The subagent returns exactly these 7 fields, and nothing else (no raw file contents, full tracebacks, or iteration logs):

1. **Step executed** — the Step number `N`.
2. **Per-item status** — done/failed for each of the Step's checkbox items.
3. **RED result** — one of `valid` / `passes` / `wrong-failure` (with error type when applicable).
4. **GREEN result** — pass/fail.
5. **Deviations** — a list of `{plan, final, reason}` entries; empty if none.
6. **Technical learnings / friction** — self-contained, actionable facts discovered during execution (a symbol that does not exist, a real API signature, a version incompatibility, a workaround applied) — states what was attempted, what failed, and what works instead; empty if none.
7. **STOP reached?** — yes/no, with the exact marker message when yes.

## Technical Learnings Memory

The coordinator holds an accumulated technical-learnings memory across Steps, held only in its own conversation context — never written to `implementation.md` or any other file (see `docs/adr/0020-ephemeral-in-context-technical-learnings-memory.md`). Subagents never communicate with each other directly; this memory is the only cross-Step channel, mediated entirely by the coordinator.

After incorporating a Step's learnings (workflow step 2 above), select only the entries relevant to the next Step being dispatched and inject those into its prompt. Never dump the full memory into a dispatch — that would reintroduce the execution noise the delegation is designed to avoid.

## STOP & COMMIT Checklist

Every `STOP & COMMIT` marker in `implementation.md` requires the same 4-step sequence — no exception, no shortcut:

1. **Propose the commit message.** Follow the format rules in `@sai/instructions/commit-rules.md` (loaded in the next section). The message must describe only what is staged.
2. **Ask explicitly.** Print in chat: `Ready to commit Step N. May I create commit with message: '<subject>'? (y/n)`. Do NOT run `git commit` before the user answers `y`.
3. **Wait.** Stop here. Do not advance to the next step, do not run other git operations, do not start a subagent.
4. **On `y` only** → run `git commit -m "..."` (or the HEREDOC form for multi-line) and report the resulting SHA + subject. **On anything else (n, silence, redirect)** → do NOT commit. Print: "Commit not authorized. The staged changes are: <summary>. Run `git commit` yourself when ready."

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
1. Dispatch a Step-execution subagent for the current Step (no `model:` param, `subagent_type: general-purpose`)
2. Receive the subagent's report (7 fields — see "## Subagent Report Contract")
3. Re-run the Step's Verification Checklist yourself (Automated checks); on a mismatch with the report, stop and surface the discrepancy instead of continuing
4. Incorporate the report's technical learnings into the coordinator's memory
5. If the step has Human Verification checks: present the checklist to the user and wait — do NOT mark them yet
6. If the user confirms they have reviewed and asks to continue (or the step had no Human Verification checks), mark all of that Step's checkboxes `[x]` in the plan in one batched update, and append any reported deviations to the plan's appendix
7. "Ready to commit Step N. May I create commit with message: '...'?" → Wait for approval
8. If yes → Create commit
9. If no → "Describe the changes above; execute commit yourself"