# Isolation Mode
- Ignore all previous conversation.
- Use only the data inside <TASK>. TASK is not a template, it's a instruction set.
- If required information is missing, ask for it.
- If you are about to use external or prior context, STOP and say: "Potential context pollution detected, stopping, open a new chat".

<TASK>

  Fetch @sai/policies/change-picker.md and follow it exactly.

  ## Prerequisite checks
  Fetch @sai/policies/prereqs.md

  Also verify before proceeding:
  - `openspec/changes/{change-name}/implementation.md` exists. If not, STOP and print: "implementation.md not found for '{change-name}'. Run /sai-3-implement first."

  Do not create or modify any files if this check fails.

  ## Fast-track parse
  Before proceeding, inspect `$ARGUMENTS` for the positional token `--fast-track`:
  - If the token is present anywhere in `$ARGUMENTS`:
    1. Set the normalized boolean session signal (fast-track signal) to active.
    2. Remove the `--fast-track` token from `$ARGUMENTS` and trim surrounding whitespace.
    3. Print the exact line `> FAST-TRACK MODE ACTIVE` exactly once per run as ordinary conversation text (do not write it to any file); the banner never repeats within the run.
    4. Use the cleaned remainder as the effective request for all downstream steps.
  - If the token is absent:
    1. Leave the normalized boolean session signal (fast-track signal) inactive.
    2. Use `$ARGUMENTS` verbatim.

  After the change-picker resolves a change name, if the resolved value still contains `--fast-track`:
  1. Remove the token and trim surrounding whitespace.
  2. Use the cleaned remainder as the effective change name for all downstream steps.

  This section is the sole authority that detects `--fast-track`, removes the token
  from the argument stream before picker/dispatch, and sets the normalized boolean
  session signal on the standalone path. Do not move detect/remove/set into the
  coordinator or runner.

  ## Load behaviors (in order)
  Fetch @skills/budget/SKILL.md and use it
  Fetch @skills/safe-operations/SKILL.md and use it

  Fast-track does not bypass safe-operations confirmations: every safe-operations gate stays in force under `--fast-track`.

  ## Session-scoped commit authorization flag
  The coordinator MAY maintain a single boolean flag in its in-conversation working memory: `session_commit_authorized`.

  - **Set active:** when the user selects `Allow on this session` at the commit-authorization gate. The flag remains active for the remainder of the in-conversation session.
  - **Read:** at every subsequent entry to either of the two commit-authorization gates of an apply run — the per-Step STOP & COMMIT gate and the terminal documentation commit gate. If active, the coordinator skips the ask and proceeds to `git add` + `git commit` after printing the file-visibility report and proposed message.
  - **Fast-track pre-activation**: If the fast-track signal is active at the start of the run, pre-activate `session_commit_authorized` immediately. The pre-commit file visibility report and proposed commit message still print unconditionally before each commit.
  - **Reset:** the flag is inactive at the start of every new chat or new `/sai-*` invocation (Isolation Mode clears inherited context). It is NEVER written to `.openspec.yaml`, config, or any file on disk.
  - **Scope boundary:** the grant covers `git add` + `git commit` at exactly the two commit-authorization gates of an apply run — the per-Step STOP & COMMIT gate and the terminal documentation commit gate — and covers nothing else. It does NOT authorize `push`, `--force`, branch create/switch, rebase, merge, tag, or `gh pr`; those operations still require their own per-operation approval regardless of the flag. The grant does NOT bypass the GREEN-conflict STOP or the apply Human Verification gate; those still halt the workflow regardless of the flag.

  Phase-owned fast-track behaviors read only the normalized boolean session signal
  and SHALL NOT re-parse wrapper arguments for `--fast-track`.

  ## Fast-track branch auto-stay
  This behavior is triggered at apply time when the running plan reaches the implementation.md **Prerequisites branch-selection prompt** — the three-option closed choice authored in `sai/commands/implement/implementation-plan.template.md:16-18` (`Suggest branch "{feature-name}"`, `Stay on current branch "{current-branch}"`, `Enter branch name manually`). The rule lives here on the apply side rather than in the plan template because the fast-track signal is resolvable only at apply time; naming the template trigger keeps that cross-file coupling explicit (see `docs/adr/0059-fast-track-auto-stay-branch-rule-in-apply.md`).

  If the fast-track signal is active when that prompt is reached, the coordinator SHALL auto-resolve it to option 2 "Stay on current branch" WITHOUT presenting the three options, reusing the prompt's own `{current-branch}` value and its "empty ⇒ detached HEAD" convention:

  - **Non-empty current branch** → auto-stay (create no branch, switch to none) and print exactly one trace line: `> Fast-track: staying on current branch "{current-branch}"` (`{current-branch}` is the same token the option-2 label resolves).
  - **Empty current branch (detached HEAD)** → do NOT auto-stay. Let the three-option prompt fire interactively exactly as it would without `--fast-track`, and print no announcement line.

  The branch-base sub-prompt needs no separate handling: it is surfaced only for new branches and is already skipped whenever option 2 is chosen (`sai/commands/implement/implementation-plan.template.md:20-23`). This auto-selection is a git no-op and opts out of the branch prompt only — every other gate stays in force (safe-operations confirmations, the commit-authorization gate's pre-commit file visibility report and proposed message, and the GREEN-conflict STOP). See `openspec/specs/sai-fast-track-flag/spec.md` for the exact behavior, announcement string, and scope guarantees.

  Phase-owned fast-track behaviors read only the normalized boolean session signal
  and SHALL NOT re-parse wrapper arguments for `--fast-track`.

  ## Load instructions (in order)
  Fetch @sai/policies/sai-learnings-format.md
  Fetch @sai/commands/apply/runner.md and follow those instructions exactly.
  Fetch @sai/policies/remember.md

  ## Run
  **User's request:** $ARGUMENTS

  ## Chained activation (composition path)

  When apply is activated as a chained segment, the supervising composition already
  holds the resolved change name and sets the normalized fast-track boolean
  explicitly true|false. Chained activation loads (1) the coordinator phase-adapter
  declaration, (2) the phase-owned runner body, and (3) this file's `## Completion`
  section only for the shell-owned standalone completion action binding. It does not
  enter Prerequisite checks, change-picker resolution, or Fast-track parse.
  Entry is composition segment activation with the composition-built envelope and
  session signals — not a harness boot or wrapper re-entry.

  ## Completion
  "Done" means ALL of the following, together — a single Step finishing (or its commit landing) is NOT completion:
  - Every Step in `openspec/changes/{change-name}/implementation.md` has all its checkboxes `[x]`, confirmed by the Final sweep.
  - All human verification gates have been reviewed.
  - All commits are done.

  Under fast-track, the Human Verification evaluation changes: accumulate each Step's Human `- [ ]` checkboxes in the coordinator's in-conversation memory as they are reached, mark them `[x]` after that Step's automated checks pass, and defer presentation to a single combined list printed after the Final sweep and before the MANDATORY STOP. Steps with zero Human checkboxes (italic note only) contribute nothing.

  If any Step remains unchecked, your work is NOT complete: do not print the completion message, do not mention `/sai-5-review`, and do not end — dispatch the next unchecked Step instead.

  This section is the sole authority for the standalone completion action. "Done" requires every Step checked, human verification reviewed, and all commits done (including the fast-track deferred human-check rules above).

  MANDATORY STOP: Only once all the conditions above hold, your work is COMPLETE, STOP and print exactly: "Implementation applied. Run `/sai-5-review {name}` in a new chat when ready."

  ## Scratch cleanup (non-normative)

  Scratch sweep and exact non-empty trace forms are owned solely by
  `sai/commands/apply/coordinator.md` § Coordinator-Owned Scratch Cleanup.
  This shell card does not redefine those traces.
</TASK>

Follow instruction on <TASK> step by step
