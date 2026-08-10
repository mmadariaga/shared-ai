# Isolation Mode
- Ignore all previous conversation.
- Use only the data inside <TASK>. TASK is not a template, it's a instruction set.
- If required information is missing, ask for it.
- If you are about to use external or prior context, STOP and say: "Potential context pollution detected, stopping, open a new chat".

<TASK>

  ## Prerequisite checks
  Fetch @sai/policies/prereqs-paths.md and retain the OpenSpec path table in this conversation — local artifact reads use the direct paths from it.
  Fetch @sai/policies/prereqs-check.md and embed its check task into the delegation prompt below.
  Delegate the three OpenSpec prerequisite checks — the `openspec` binary availability check, the `openspec/` directory existence check, and the `openspec/config.yaml` `schema: sai-workflow` check, as defined in `@sai/policies/prereqs-check.md` — to exactly one budget subagent per invocation, with no deferral condition (spawn on every invocation, including sessions that never touch `openspec/`). Dispatch under the budget-subagent binding of the active harness: Claude Code — `Agent(subagent_type: budget-subagent, run_in_background: true)`, awaited on your own turn; opencode — `task(subagent_type: budget)`, synchronous default. The subagent prompt SHALL contain only the check task (the three checks, their exact STOP-and-print literals, the verification command, and the operating paths `openspec/` and `openspec/config.yaml`) plus the verdict output contract below. The prompt SHALL NOT include `@sai/policies/prereqs-paths.md`, any change-artifact path (`openspec/specs/{name}/spec.md`, `openspec/schemas/sai-workflow/schema.yaml`, `openspec/changes/{change-name}/**`, or the archive pattern), raw shell evidence, or openspec command transcripts.
  Verdict output contract: the completion report envelope `status` stays in the budget-subagent binding's closed vocabulary (`success | partial | failed`) with exactly the four fields (`status`, `actions_taken`, `failures`, `output`); the verdict rides in the `output` payload as `verdict: pass` or `verdict: halt`, and on halt the payload includes the verbatim remediation literal from `sai/policies/prereqs-check.md` for the failed check. Relay the verdict:
  - `verdict: pass` — continue exploration.
  - `verdict: halt` — print the report's remediation literal unchanged (no prefix, suffix, summary, or rephrasing) and stop without writing any file.
  - Envelope `status: failed` or `partial` — dispatch failure: the prerequisite check could not be completed; present it as such, print no remediation literal, and do not continue as if the checks passed.
  Fetch @skills/safe-operations/SKILL.md and use it

  ## Overview-language parse
  Before the fast-track parse, inspect `$ARGUMENTS` for the optional `--overview-lang <language>` option. Parse and validate it before change-name resolution and before overview dispatch:
  - If the option is absent, set the invocation-scoped effective `overview_language` to `English`.
  - If the option appears once, require exactly one following non-empty token that is not another option, consume that token as the free-form language value, remove only the option and its value from `$ARGUMENTS`, and set `overview_language` to that value.
  - If the option is final or its next token begins with `--`, stop with the clear validation error `Missing value for --overview-lang; provide one non-empty language token before continuing.` Do not resolve a change, perform any dispatch, or continue to the fast-track parse.
  - If the option appears more than once, stop with the clear validation error `Duplicate --overview-lang is not allowed; provide the option once.` Do not resolve a change or perform any dispatch.
  - Preserve the change/topic token and every unrelated argument, including `--fast-track`, in their original order after removing the option and its value; recognize fast-track whether it precedes or follows the language option.
  - The cleaned request and `overview_language` are invocation-scoped. They are never written to a change artifact or configuration file.

  ## Fast-track parse
  Before proceeding, inspect `$ARGUMENTS` for the positional token `--fast-track`:
  - If the token is present anywhere in `$ARGUMENTS`:
    1. Set the in-conversation fast-track signal to active.
    2. Remove the `--fast-track` token from `$ARGUMENTS` and trim surrounding whitespace.
    3. Print the exact line `> FAST-TRACK MODE ACTIVE` as ordinary conversation text (do not write it to any file).
    4. Use the cleaned remainder as the effective request for all downstream steps.
  - If the token is absent:
    1. Leave the fast-track signal inactive.
    2. Use `$ARGUMENTS` verbatim.

  ## Load behaviors (in order)
  Fetch @skills/budget/SKILL.md and use it

  ## Load instructions (in order)
  Fetch @sai/instructions/explore.md
  Fetch @skills/openspec-explore/SKILL.md and follow those instructions exactly.
  Fetch @sai/policies/remember.md

  ## Run
  **User's request:** $ARGUMENTS
</TASK>

Follow instruction on <TASK> step by step
