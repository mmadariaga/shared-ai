# envelope-only-change-name-resolution

## Goal

Retire transcript-based wrapper-echo change-name resolution: make `arguments_value` authoritative for shared pickers and the four fetched cards, remove labelled lines from all 16 opencode wrappers, invert structural tests, sync active specs, and record ADR 0166 superseding 0033/0034/0035/0049.

## Prerequisites

- Detect the current git branch with `git rev-parse --abbrev-ref HEAD` (or equivalent). If the command returns empty (detached HEAD), use the literal text `detached HEAD` for option 2.
- Resolve the repository **default branch** dynamically — do NOT assume `main`. Apply this chain in order:
  1. Remote head — `git symbolic-ref --quiet refs/remotes/origin/HEAD`; on success take the trailing path segment (`refs/remotes/origin/main` → `main`).
  2. Else whichever of `main` / `master` exists locally (`git show-ref --verify --quiet refs/heads/<name>`).
  3. If both `main` and `master` exist locally and no remote head resolved, prefer `main`.
  4. If neither exists or there is no `origin`, treat the current branch as the resolved default branch (no distinct default exists, so the base prompt below is skipped).
- Present exactly three options in the user's input language (English fallback), in this fixed order. Canonical English labels — translate to match the user's input language, preserving meaning and order:
  1. `Suggest branch "envelope-only-change-name-resolution"` — the change-name-derived branch (default).
  2. `Stay on current branch "{current-branch}"` — the detected current branch, or `detached HEAD`.
  3. `Enter branch name manually` — free text for a custom branch name.
- No option is prohibited. The user bears full responsibility for the choice.
- **Branch-base prompt (new branches only).** When the selected branch does NOT already exist — option 1, or an option-3 name not present in the repository — present a 2-option closed choice for its base branch, before creating it, through the harness option-picker (`AskUserQuestion` on Claude Code per the closed-choice-prompt rule in `remember.md`; plain-text fallback where no picker exists). Present them in this order; labels localize to the user's input language (English fallback), surrounding text stays English:
  1. `Base on default branch "{default-branch}"` — the dynamically resolved default; this is the pre-selected default option.
  2. `Base on current branch "{current-branch}"` — the current branch, or the literal `detached HEAD` when in detached HEAD.
  Record the chosen base. **Skip this prompt entirely** (surface no base choice) when any of these holds: option 2 (stay on current branch) was chosen; the selected target branch already exists; or the current branch already equals the resolved default branch — in that last case create the new branch from the default branch without prompting.
- If the selected branch does not exist, create it from the chosen base branch — the resolved default branch or the current branch as determined by the base prompt (or the default branch directly when the prompt was skipped because the current branch already equals the default) — before implementing. Never hardcode `main` as the base.

### Step-by-Step Instructions

#### Step 1: Envelope-only pickers and four cards (single commit boundary)

*(Non-testable step — instruction contracts only; structural coverage lands in Step 3. Single commit boundary: land all six files together.)*

- [x] Replace the entire contents of `sai/policies/change-picker.md` with:

```markdown
# Change Picker

Shared instruction that resolves a missing OpenSpec change name for change-consuming `sai-*` commands (`sai-2-design`, `sai-3-implement`, `sai-4-apply`, `sai-5-review`, `sai-6-security`, `sai-7-performance`, `sai-8-accessibility`, `sai-archive`, `sai-pr`). Fetched identically by every consumer — do not duplicate this logic inline in any command body. `sai-status` is deliberately NOT a consumer — it resolves change names via `sai/policies/status-picker.md` instead.

## Invocation trigger

Run this instruction only when the boot-provided `arguments_value` is empty or whitespace-only after trim. A non-empty `wrapper_echo_value` alone SHALL NOT bypass the picker or supply a name. If `arguments_value` provides a non-empty change name after trim, this instruction is a no-op: do not query OpenSpec, do not prompt the user, and proceed using the trimmed `arguments_value` exactly. Never scan parent conversation history and never parse a labelled wrapper-echo line.

## Envelope-only resolution source

Treat a trimmed non-empty `arguments_value` as the sole authoritative supplied change-name source. Retain and forward `wrapper_echo_value` as an opaque envelope field but ignore it for shared change-name resolution, so a stale or flag-bearing wrapper value cannot override the cleaned arguments value. When `arguments_value` is empty, run the existing `openspec list --json` 0/1/N resolution machinery below — even if `wrapper_echo_value` is non-empty.

## Resolution (when `arguments_value` is empty)

1. Run `openspec list --json` and parse the `changes` array. Use only `changes[].name` — no filesystem globbing of `openspec/changes/`, no additional CLI flags or dependencies.

2. **Zero changes** — if `changes` is empty: STOP and print exactly: "No active changes found. Run `/sai-1-spec` to create one." Do not proceed to any further processing in the consuming command.

Both prompts below are closed-choice: present the choices through the harness's native option-picker tool when one exists, otherwise fall back to the plain-text prompts as written (per the "Closed-choice prompts" rule in `remember.md`, which gives the per-harness mapping). The selection semantics are identical either way.

3. **Exactly one change** — ask: "Use change '{name}'?" with options "yes" / "no" (plain-text fallback: "Use change '{name}'? (yes/no)").
   - "yes" (clicked or typed, case-insensitive) → confirm. That change's name becomes the resolved change name; go to "Resolved name substitution" below.
   - Anything else (including "no", silence, or an off-topic reply) → decline. STOP. Do not resolve a name and do not proceed further in the consuming command. No retry loop for this path.

4. **Two or more changes** — ask: "Which change?" with one option per change name (in the order returned by `openspec list --json`; plain-text fallback: a 1-indexed numbered list with the prompt "Which change? Enter a number (1-{N}).").
   - A clicked option, or a number within `1-{N}` → valid. That change becomes the resolved change name; go to "Resolved name substitution" below.
   - Anything else (non-numeric, out of range, or a free-text reply that matches no listed name) → reject the input and re-prompt with the same options. Re-prompt unboundedly — no retry cap.

## Resolved name substitution

Once a change name is resolved (via a non-empty trimmed `arguments_value`, or via step 3 or step 4 above), it becomes the effective change name for the remainder of the consuming command: every subsequent step (remaining prerequisite checks, instruction fetches, completion messages) uses the resolved name exactly as if the user had typed it into `arguments_value`.
```

- [x] Replace the entire contents of `sai/policies/status-picker.md` with:

```markdown
# Status Picker

Dedicated instruction that resolves a missing OpenSpec change name for `sai-status` ONLY. It reuses the shared change-picker's envelope-only source selection, invocation trigger, `openspec list --json` as the sole source of change names, and resolved-name substitution, adding a **"See all"** bulk-view option on the two-or-more-changes branch. No other `sai-*` command fetches this file — the 9 change-consuming commands (`sai-2-design`, `sai-3-implement`, `sai-4-apply`, `sai-5-review`, `sai-6-security`, `sai-7-performance`, `sai-8-accessibility`, `sai-archive`, `sai-pr`) use `change-picker.md`.

## Invocation trigger

Run this instruction only when the boot-provided `arguments_value` is empty or whitespace-only after trim. A non-empty `wrapper_echo_value` alone SHALL NOT bypass the picker or supply a name. If `arguments_value` provides a non-empty change name after trim, this instruction is a no-op: do not query OpenSpec, do not prompt the user, and proceed using the trimmed `arguments_value` exactly. Never scan parent conversation history and never parse a labelled wrapper-echo line.

## Envelope-only resolution source

Treat a trimmed non-empty `arguments_value` as the sole authoritative supplied change-name source. Retain and forward `wrapper_echo_value` as an opaque envelope field but ignore it for name selection. When `arguments_value` is empty, run the existing `openspec list --json` 0/1/N resolution machinery below — even if `wrapper_echo_value` is non-empty.

## Resolution (when `arguments_value` is empty)

1. Run `openspec list --json` and parse the `changes` array. Use only `changes[].name` — no filesystem globbing of `openspec/changes/`, no additional CLI flags or dependencies.

2. **Zero changes** — if `changes` is empty: STOP and print exactly: "No active changes found. Run `/sai-1-spec` to create one." Do not proceed to any further processing in `sai-status`. No "See all" option is offered.

Both prompts below are closed-choice: on Claude Code and opencode, present the choices through the native option-picker; on a surface without a native picker, fall back to the plain-text prompts as written (per the "Closed-choice prompts" rule in `remember.md`). The selection semantics are identical either way.

3. **Exactly one change** — ask: "Use change '{name}'?" with options "yes" / "no" (plain-text fallback: "Use change '{name}'? (yes/no)"). No "See all" option is offered on this branch.
   - "yes" (clicked or typed, case-insensitive) → confirm. That change's name becomes the resolved change name; go to "Resolved name substitution" below.
   - Anything else (including "no", silence, or an off-topic reply) → decline. STOP. Do not resolve a name and do not proceed further in `sai-status`. No retry loop for this path.

4. **Two or more changes** — present a closed-choice prompt whose FIRST option is "See all", followed by one option per change name in the order returned by `openspec list --json` (plain-text fallback: a 1-indexed numbered list where option 1 is "See all" and options 2..N+1 are the change names, with the prompt "See all, or which change? Enter a number (1-{N+1})."). Present it through the native option-picker on Claude Code and opencode; on a surface without a native picker, use the plain-text fallback without changing the order or semantics.
   - **"See all"** (clicked, or the number `1` in the fallback) → print the literal line `> BULK-MODE ACTIVE` as ordinary conversation text (do NOT write it to any file) and return WITHOUT resolving a change name. `sai-status.md` detects this signal and renders the bulk status table. This mirrors the existing `> FAST-TRACK MODE ACTIVE` convention.
   - A **change option** (clicked, or a number that maps to a change name) → that change becomes the resolved change name; go to "Resolved name substitution" below. This falls through to the standard single-change `sai-status` panel, identical to the change-picker N branch.
   - Anything else (non-numeric, out of range, or a free-text reply that matches no listed option) → reject the input and re-prompt with the same options. Re-prompt unboundedly — no retry cap.

## Resolved name substitution

Once a change name is resolved (via a non-empty trimmed `arguments_value`, or via step 3 or step 4 above), it becomes the effective change name for the remainder of `sai-status`: every subsequent step uses the resolved name exactly as if the user had typed it into `arguments_value`. (Selecting "See all" resolves no name — it hands control to the bulk table instead.)

## Read-only invariant

`status-picker.md` SHALL NOT create, modify, or delete any file under `openspec/` (nor `.openspec.yaml`) or elsewhere. Its only side effects are read-only `openspec` CLI calls (`openspec list --json`), presenting the picker prompt, and — on "See all" — printing the `> BULK-MODE ACTIVE` signal line as conversation text.
```

- [x] Rewrite `sai/commands/apply/invocation.md` so physical source order is: Isolation Mode → `<TASK>` → prereqs → fast-track parse of `arguments_value` → change-picker Fetch/follow → remaining loads → Run/Completion. Replace every request-input reference that meant "user args for this card" with boot-provided `arguments_value` (not fetched-card `$ARGUMENTS` substitution). Keep session commit authorization, fast-track branch auto-stay, chained activation, Completion, and scratch cleanup semantics unchanged. Concrete full file:

```markdown
# Isolation Mode
- Ignore all previous conversation.
- Use only the data inside <TASK>. TASK is not a template, it's a instruction set.
- If required information is missing, ask for it.
- If you are about to use external or prior context, STOP and say: "Potential context pollution detected, stopping, open a new chat".

<TASK>

  ## Prerequisite checks
  Fetch @sai/policies/prereqs.md

  Also verify before proceeding:
  - `openspec/changes/{change-name}/implementation.md` exists. If not, STOP and print: "implementation.md not found for '{change-name}'. Run /sai-3-implement first."

  Do not create or modify any files if this check fails.

  ## Fast-track parse
  Before picker resolution, inspect the boot-provided `arguments_value` for the positional token `--fast-track`:
  - If the token is present anywhere in `arguments_value`:
    1. Set the normalized boolean session signal (fast-track signal) to active.
    2. Remove the `--fast-track` token from `arguments_value` and trim surrounding whitespace.
    3. Print the exact line `> FAST-TRACK MODE ACTIVE` exactly once per run as ordinary conversation text (do not write it to any file); the banner never repeats within the run.
    4. Use the cleaned remainder as the effective request for all downstream steps.
  - If the token is absent:
    1. Leave the normalized boolean session signal (fast-track signal) inactive.
    2. Use `arguments_value` verbatim.

  This section is the sole authority that detects `--fast-track`, removes the token
  from the argument stream before picker/dispatch, and sets the normalized boolean
  session signal on the standalone path. Do not move detect/remove/set into the
  coordinator or runner. Do not run a second post-picker strip.

  Fetch @sai/policies/change-picker.md and follow it exactly.

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
  **User's request:** use the cleaned boot-provided `arguments_value` (after fast-track parse and picker resolution).

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
```

- [x] Rewrite `sai/commands/archive/body.md` to parse `--fast-track` from `arguments_value` before the change-picker Fetch, delete the post-picker residual strip block entirely, and use `arguments_value` (not fetched-card `$ARGUMENTS`) for the request. Concrete full file:

```markdown
# Isolation Mode
- Ignore all previous conversation.
- Use only the data inside <TASK>. TASK is not a template, it's a instruction set.
- If required information is missing, ask for it.
- If you are about to use external or prior context, STOP and say: "Potential context pollution detected, stopping, open a new chat".

<TASK>

  Fetch @sai/policies/verified-precondition-handback.md
  ## Prerequisite checks
  Fetch @sai/policies/prereqs.md

  ## Fast-track parse
  Before picker resolution, inspect the boot-provided `arguments_value` for the positional token `--fast-track`:
  - If the token is present anywhere in `arguments_value`:
    1. Set the in-conversation fast-track signal to active.
    2. Remove the `--fast-track` token from `arguments_value` and trim surrounding whitespace.
    3. Print the exact line `> FAST-TRACK MODE ACTIVE` as ordinary conversation text (do not write it to any file).
    4. Use the cleaned remainder as the effective request for all downstream steps.
  - If the token is absent:
    1. Leave the fast-track signal inactive.
    2. Use `arguments_value` verbatim.

  Do not run a second post-picker `--fast-track` strip. The cleaned `arguments_value` is the sole input to archive resolution after this pre-picker parse.

  ## Load behaviors (in order)
  Fetch @skills/budget/SKILL.md and use it
  Fetch @skills/safe-operations/SKILL.md and use it

  ## Load instructions (in order)
  Fetch @sai/policies/change-picker.md and follow it exactly.

  Fetch @sai/commands/archive/instructions.md
  Fetch @sai/policies/remember.md

  Fetch @skills/openspec-archive-change/SKILL.md and follow those instructions exactly.
  Fetch @sai/commands/archive/archive-commit-gate.instructions.md and follow those instructions exactly.

  ## Run
  **User's request:** use the cleaned boot-provided `arguments_value` (after fast-track parse and picker resolution).
</TASK>

Follow instruction on <TASK> step by step
```

- [x] Rewrite `sai/commands/pr/body.md` Run section to consume boot-provided `arguments_value` (keep picker fetch and PR parent-branch behavior). Concrete full file:

```markdown
# Isolation Mode
- Ignore all previous conversation.
- Use only the data inside <TASK>. TASK is not a template, it's a instruction set.
- If required information is missing, ask for it.
- If you are about to use external or prior context, STOP and say: "Potential context pollution detected, stopping, open a new chat".

<TASK>

  Fetch @sai/policies/verified-precondition-handback.md
  ## Prerequisite checks
  Fetch @sai/policies/prereqs.md

  ## Load behaviors (in order)
  Fetch @skills/budget/SKILL.md and use it
  Fetch @skills/safe-operations/SKILL.md and use it

  ## Load instructions (in order)
  Fetch @sai/policies/change-picker.md and follow it exactly.
  Fetch @sai/commands/pr/instructions.md and follow those instructions exactly.
  Fetch @sai/policies/remember.md

  ## Run
  **User's request:** use the boot-provided `arguments_value` (after picker resolution when empty).
</TASK>

Follow instruction on <TASK> step by step
```

- [x] Rewrite `sai/commands/status/body.md` so resolution and panel rendering use boot-provided `arguments_value` instead of `$ARGUMENTS` substitution. Keep status-picker fetch, bulk mode, and Steps A–E. Change only the input-reference wording:
  - In `## Run`, replace `**User's request:** $ARGUMENTS` with `**User's request:** use the boot-provided `arguments_value`.
  - Replace the sentence `After the change name is resolved (from `$ARGUMENTS`, or by `status-picker.md` when no name was given)` with `After the change name is resolved (from a non-empty trimmed boot-provided `arguments_value`, or by `status-picker.md` when `arguments_value` is empty)`.
  - Leave bulk-mode algorithm and single-change Steps A–E body otherwise unchanged.

##### Step 1 Verification Checklist

**Automated (agent runs before stopping):**
- [x] `rg -n "Wrapper-Echo Resolution|wrapper-echo line check|conversation history" sai/policies/change-picker.md sai/policies/status-picker.md` — expected: no matches
- [x] `rg -n "arguments_value" sai/policies/change-picker.md sai/policies/status-picker.md sai/commands/apply/invocation.md sai/commands/archive/body.md sai/commands/pr/body.md sai/commands/status/body.md` — expected: each file matches
- [x] `rg -n "post-picker|After the change-picker resolves" sai/commands/archive/body.md` — expected: no matches
- [x] Confirm apply file order: `## Fast-track parse` appears before `Fetch @sai/policies/change-picker.md` in `sai/commands/apply/invocation.md`
- [x] Confirm archive file order: `## Fast-track parse` appears before `Fetch @sai/policies/change-picker.md` in `sai/commands/archive/body.md`
- [x] Confirm consumer list in `change-picker.md` still enumerates exactly the 9 commands and excludes `sai-status`
- [x] Confirm status-picker still has first option "See all" and literal `> BULK-MODE ACTIVE`

*(No Human checks — service-side instruction contracts with no observable browser behavior.)*

#### Step 1 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. No browser verification required at this step. Commit message suggestion: `feat(picker): envelope-only arguments_value resolution for pickers and four cards`.

#### Step 2: Remove labelled lines from 13 opencode wrappers (3 verified clean)

*(Non-testable step — wrapper body edits only; Claude wrappers untouched.)*

For each of the 13 files below, delete the trailing labelled argument line only. Leave YAML frontmatter byte-identical. Leave `InvocationEnvelope` with `command_name`, `wrapper_echo_value`, and `arguments_value` intact. After the envelope block, the file ends (no blank labelled line).

- [x] `commands/opencode/sai-1-spec.md` — delete line `**Spec request argument:** $ARGUMENTS`
- [x] `commands/opencode/sai-2-design.md` — delete line `**Change-name argument and and optional flags:** $ARGUMENTS`
- [x] `commands/opencode/sai-3-implement.md` — delete line `**Change-name argument:** $ARGUMENTS`
- [x] `commands/opencode/sai-4-apply.md` — delete line `**Change-name argument and and optional flags:** $ARGUMENTS`
- [x] `commands/opencode/sai-5-review.md` — delete line `**Change-name and optional parent-branch argument:** $ARGUMENTS`
- [x] `commands/opencode/sai-6-security.md` — delete line `**Security arguments:** $ARGUMENTS`
- [x] `commands/opencode/sai-7-performance.md` — delete line `**Performance arguments:** $ARGUMENTS`
- [x] `commands/opencode/sai-8-accessibility.md` — delete line `**Change-name argument:** $ARGUMENTS`
- [x] `commands/opencode/sai-archive.md` — delete line `**Change-name argument and and optional flags:** $ARGUMENTS`
- [x] `commands/opencode/sai-build.md` — delete line `**Change-name argument:** $ARGUMENTS`
- [x] `commands/opencode/sai-pr.md` — delete line `**Change-name argument:** $ARGUMENTS`
- [x] `commands/opencode/sai-status.md` — delete line `**Change-name argument and and optional flags:** $ARGUMENTS`
- [x] `commands/opencode/sai-worktree.md` — delete line `**Worktree arguments:** $ARGUMENTS`

Canonical post-edit shape for a labelled wrapper (example `sai-3-implement.md` body after frontmatter):

```markdown
Fetch @~/.config/opencode/skills/fetch/SKILL.md before you continue.
Fetch @sai/adapters/opencode/boot.md and follow it.
Fetch @sai/commands/implement/launcher.md and follow those instructions exactly, forwarding the InvocationEnvelope block below.

InvocationEnvelope:
  command_name: implement
  wrapper_echo_value: $ARGUMENTS
  arguments_value: $ARGUMENTS
```

- [x] Verify-only (no edit): `commands/opencode/sai-backfill.md`, `commands/opencode/sai-commit.md`, and `commands/opencode/sai-explore.md` contain no trailing labelled `**…:** $ARGUMENTS` line. If any of the three unexpectedly contains one, STOP and surface the finding — do not silently expand Files Affected.
- [x] Do not modify any file under `commands/claude/`.

##### Step 2 Verification Checklist

**Automated (agent runs before stopping):**
- [x] `rg -n "^\*\*.*:\*\* \$ARGUMENTS" commands/opencode` — expected: no matches
- [x] Explicit absence of each known prefix across `commands/opencode/sai-*.md`:
  - `**Change-name argument:**`
  - `**Change-name argument and and optional flags:**`
  - `**Spec request argument:**`
  - `**Change-name and optional parent-branch argument:**`
  - `**Security arguments:**`
  - `**Performance arguments:**`
  - `**Worktree arguments:**`
- [x] Every envelope-bearing opencode wrapper still matches `command_name:`, `wrapper_echo_value:`, and `arguments_value:`
- [x] `git diff -- commands/claude` — expected: empty (no Claude wrapper edits)

*(No Human checks — service-side wrapper edits with no observable browser behavior.)*

#### Step 2 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. Commit message suggestion: `refactor(opencode): drop trailing labelled argument lines from sai wrappers`.

#### Step 3: Invert structural tests to envelope forwarding

*(Non-testable RED/GREEN production path — this step updates structural tests that pin instruction sources. Existing tests broken by Steps 1–2 are repaired here.)*

- [ ] In `test/command-launcher-card.test.js`:
  1. Remove or stop requiring the `OPENCODE_LABELS` map as positive assertions.
  2. Replace the test `final wrappers: opencode label lines remain after envelope; Claude wrappers have no label line` so that **both** harnesses assert absence of any trailing labelled argument line matching `/\*\*[^*].*:\*\*.*\$ARGUMENTS/` (or equivalent), and so each of the seven known prefixes is explicitly asserted absent on every `commands/opencode/sai-*.md` file (including the three already-clean wrappers).
  3. Keep envelope three-field assertions and Claude empty `wrapper_echo_value` / opencode `$ARGUMENTS` envelope field assertions unchanged.

Example replacement test body (adapt to existing helpers):

```javascript
const OPENCODE_LABEL_PREFIXES = [
  '**Change-name argument:**',
  '**Change-name argument and and optional flags:**',
  '**Spec request argument:**',
  '**Change-name and optional parent-branch argument:**',
  '**Security arguments:**',
  '**Performance arguments:**',
  '**Worktree arguments:**',
];

test('final wrappers: no trailing labelled argument lines on either harness', () => {
  for (const [file] of wrapperCommands) {
    const opencodeSource = read(`commands/opencode/${file}`);
    const claudeSource = read(`commands/claude/${file}`);
    assert.doesNotMatch(
      opencodeSource,
      /\*\*[^*\n]+:\*\*[^\n]*\$ARGUMENTS/,
      `opencode/${file} should have no trailing labelled argument line`
    );
    assert.doesNotMatch(
      claudeSource,
      /\*\*[^*\n]+:\*\*[^\n]*\$ARGUMENTS/,
      `claude/${file} should have no trailing labelled argument line`
    );
    for (const prefix of OPENCODE_LABEL_PREFIXES) {
      assert.ok(
        !opencodeSource.includes(prefix),
        `opencode/${file} must not contain label prefix ${prefix}`
      );
    }
  }
});
```

- [ ] In `test/install-opencode.test.js`, replace the positive label assertion on the installed `sai-2-design.md` (currently `assert.ok(design.includes('**Change-name argument and and optional flags:** $ARGUMENTS'))`) with an absence assertion, e.g. `assert.doesNotMatch(design, /\*\*[^*\n]+:\*\*[^\n]*\$ARGUMENTS/)`, while keeping model/variant/subtask frontmatter checks.

- [ ] In `test/design-coordinator-worker.test.js`, replace `assert.ok(opencode.includes('**Change-name argument and and optional flags:** $ARGUMENTS'))` with absence of that label and presence of envelope forwarding (`wrapper_echo_value` / `arguments_value`). Add or keep structural checks that design input with name + `--fast-track` in either token order is described as envelope-carried (no transcript-label extraction helper required).

- [ ] In `test/implement-coordinator-worker.test.js`, replace `assert.match(opencode, /\*\*Change-name argument:\*\* \$ARGUMENTS/)` with an absence assertion for that label while keeping launcher/coordinator/envelope assertions.

- [ ] In `test/apply-routed-architecture.test.js`, pin apply invocation consumption of `arguments_value` and parse-before-picker ordering (fast-track section before change-picker Fetch). Assert archive has no post-picker strip language if this file covers archive; otherwise rely on picker/card greps above. Do not reintroduce label requirements.

- [ ] In `test/build-coordinator.test.js` and `test/explore-pipeline-selector.test.js`, ensure composition-minted envelope assertions still pass and no new labelled-line requirement is introduced. Only edit if a test currently requires an opencode label line (grep first).

- [ ] Run scoped then full suite:
  - `node --test test/command-launcher-card.test.js`
  - `node --test test/install-opencode.test.js`
  - `node --test test/design-coordinator-worker.test.js`
  - `node --test test/implement-coordinator-worker.test.js`
  - `node --test test/apply-routed-architecture.test.js`
  - `node --test test/build-coordinator.test.js`
  - `node --test test/explore-pipeline-selector.test.js`
  - `npm test`

##### Step 3 Verification Checklist

**Automated (agent runs before stopping):**
- [ ] Each scoped `node --test test/<file>.test.js` above exits 0
- [ ] `npm test` exits 0
- [ ] Grep of tests no longer positively requires any of the seven known label prefixes on opencode wrappers

*(No Human checks — service-side structural tests with no observable browser behavior.)*

#### Step 3 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. Commit message suggestion: `test: require envelope-only resolution and label-free opencode wrappers`.

#### Step 4: Sync active openspec capability specs

*(Non-testable step — docs-only delta sync into active baselines.)*

For each capability below, fold the change-delta under `openspec/changes/envelope-only-change-name-resolution/specs/{capability}/spec.md` into `openspec/specs/{capability}/spec.md` so the active baseline matches the landed instruction contracts. Do not invent requirements beyond the change specs. Remove every requirement title listed under `## REMOVED Requirements` in the delta from the active baseline.

- [ ] Sync `openspec/specs/change-picker/spec.md` from the change delta (envelope-only resolution; remove Wrapper-Echo Resolution and legacy Invocation Trigger requirements).
- [ ] Sync `openspec/specs/status-picker/spec.md` from the change delta (envelope-only source; preserve See all + bulk signal).
- [ ] Sync `openspec/specs/opencode-change-arg-passthrough/spec.md` from the change delta (no labels; three envelope keys; remove label-emission requirements).
- [ ] Sync `openspec/specs/command-wrapper-body/spec.md` from the change delta (no label line; envelope placement unchanged).
- [ ] Sync `openspec/specs/thin-wrappers/spec.md` from the change delta (examples without labels).
- [ ] Sync `openspec/specs/sai-fast-track-flag/spec.md` from the change delta (archive has no post-picker strip; parse from `arguments_value` before picker).
- [ ] Sync `openspec/specs/design-harness-bindings/spec.md` from the change delta (envelope forwarding probes for name + `--fast-track` either order; no label extraction).

Note: `envelope-only-card-resolution` is a **new** capability in the change. Do **not** invent a new active baseline directory in this step unless archive/sync tooling already requires it; keep the delta under the change until archive. Only the seven modified active baselines listed above are Files Affected.

##### Step 4 Verification Checklist

**Automated (agent runs before stopping):**
- [ ] For each delta under `openspec/changes/envelope-only-change-name-resolution/specs/` that contains `## REMOVED Requirements`, every removed requirement title is absent from the matching `openspec/specs/{capability}/spec.md` (when that baseline exists).
- [ ] Active `change-picker` and `status-picker` specs mention authoritative `arguments_value` and do not mandate transcript/label channels.
- [ ] Active `sai-fast-track-flag` states archive has no post-picker strip.
- [ ] Active `design-harness-bindings` describes envelope forwarding, not legacy label extraction.
- [ ] `npm test` still exits 0 (structural greps that read active specs).

*(No Human checks — service-side spec sync with no observable browser behavior.)*

#### Step 4 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. Commit message suggestion: `docs(specs): sync active baselines to envelope-only change-name resolution`.

#### Step 5: ADR 0166 and index

*(Non-testable step — decision record. Planning may have already created these files; apply MUST verify and create/repair to match the content below. Do not edit historical ADR bodies. Do not modify `AGENTS.md`.)*

- [ ] Ensure `docs/adr/0166-envelope-only-change-name-resolution.md` exists with content equivalent to:

```markdown
# ADR 0166: Envelope-only change-name resolution for shared pickers and four cards

<!-- adr-index: supersedes 0033; supersedes 0034; supersedes 0035; supersedes 0049; refs 0075; refs 0136 -->

## Status

Accepted

## Context

Both harness boot adapters already forward `wrapper_echo_value` and `arguments_value` byte-for-byte in the invocation envelope. Four fetched cards (`apply`, `archive`, `pr`, `status`) and the shared pickers still recovered the change name by scanning conversation history for a trailing labelled wrapper-echo line. On opencode, `$ARGUMENTS` is not substituted inside fetched card content, so the label was a transport workaround that now conflicts with the envelope-first architecture.

## Decision

1. Shared `change-picker.md` and `status-picker.md` treat trimmed non-empty `arguments_value` as the sole supplied change-name source; retain and forward `wrapper_echo_value` as opaque transport but ignore it for resolution.
2. The four cards read `arguments_value` from the boot envelope; apply/archive parse `--fast-track` before picker invocation; archive has no post-picker strip.
3. All 16 opencode wrappers keep the three-field InvocationEnvelope and drop every trailing labelled argument line; Claude wrappers are untouched; `wrapper_echo_value` remains on the envelope.
4. Six migrated workers and boot adapters stay reference-only for this change.

## Alternatives Considered

- Keep wrapper-echo-first shared pickers — rejected (transport mismatch / flag contamination).
- Drop `wrapper_echo_value` from the envelope — rejected (workers/boot still carry the field).
- Arguments-authoritative shared pickers + label retirement — chosen.

## Consequences

- Installed wrappers may emit inert labels until reinstall.
- Pickers and four cards must land together.
- Structural tests require label absence and envelope forwarding.
- ADRs 0033, 0034, 0035, and 0049 remain immutable and are superseded via this record and the index.

## Related

- `openspec/changes/envelope-only-change-name-resolution/design.md`
- `docs/adr/0033-echo-line-format-and-placement.md` — superseded
- `docs/adr/0034-resolution-precedence-wrapper-echo-first.md` — superseded
- `docs/adr/0035-harness-specific-adapter-carve-out.md` — superseded
- `docs/adr/0049-fast-track-flag-strip-before-change-picker.md` — superseded
- `docs/adr/0075-normalized-invocation-envelope-and-lifecycle-payload.md`
- `docs/adr/0136-opaque-boot-request-and-card-selection-contract.md`
```

- [ ] Ensure `docs/adr/0000-INDEX.md` warm-splice is complete:
  - Entry for 0166 under `## By command` / cross-cutting placements used for harness wrappers, argument passing, and fast-track (as applicable).
  - Correction-table rows: 0166 supersedes 0033, 0034, 0035, 0049.
  - Historical section moves 0033, 0034, 0035, 0049 with `*Superseded by [0166]*`.
  - Do not edit bodies of `docs/adr/0033-*.md`, `0034-*.md`, `0035-*.md`, `0049-*.md`.
- [ ] Do not modify `AGENTS.md` in this step (design D8 MAY is out-of-band only).

##### Step 5 Verification Checklist

**Automated (agent runs before stopping):**
- [ ] `Test-Path docs/adr/0166-envelope-only-change-name-resolution.md` is true
- [ ] `rg -n "0166" docs/adr/0000-INDEX.md` matches index entry and correction-table rows
- [ ] `rg -n "Superseded by \[0166\]" docs/adr/0000-INDEX.md` matches the four historical entries
- [ ] `git diff -- docs/adr/0033-echo-line-format-and-placement.md docs/adr/0034-resolution-precedence-wrapper-echo-first.md docs/adr/0035-harness-specific-adapter-carve-out.md docs/adr/0049-fast-track-flag-strip-before-change-picker.md` — expected: empty
- [ ] `git diff -- AGENTS.md` — expected: empty for this step's work

*(No Human checks — service-side documentation with no observable browser behavior.)*

#### Step 5 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. Commit message suggestion: `docs(adr): add 0166 envelope-only change-name resolution superseding 0033-0035 and 0049`.

## Appendix: Execution Telemetry

| Step | dispatch | phase | attempts | first_failure | note |
|---|---|---|---|---|---|
| 1 | green-direct | implementation | 1 | n/a | |
| 1 | green-direct | green | 1 | n/a | |
| 2 | green-direct | implementation | 1 | n/a | |
| 2 | green-direct | green | 1 | n/a | |
