<TASK>

  Fetch @sai/policies/verified-precondition-handback.md
  ## Prerequisite checks
  Fetch @sai/policies/prereqs-paths.md and retain the OpenSpec path table in this conversation — local artifact reads use the direct paths from it.
  Fetch @sai/policies/prereqs-check.md and embed its check task into the delegation prompt below.
  Delegate the OpenSpec prerequisite preflight — one run of the `sai/tools/prereqs.js` `check` sub-command, whose verdict decides the `openspec` binary availability check, the `openspec/` directory existence check, and the `openspec/config.yaml` `schema: sai-workflow` check, as defined in `@sai/policies/prereqs-check.md` — to exactly one budget subagent per invocation, with no deferral condition (spawn on every invocation, including sessions that never touch `openspec/`). Dispatch under the budget-subagent binding of the active harness: Claude Code — `Agent(subagent_type: budget-subagent)`, dispatched and awaited on the same turn; opencode — `task(subagent_type: budget)`, synchronous default. The subagent prompt SHALL contain only the check task (the tool-location candidate list, the byte-identical `node <tool-path> check --json --cwd <project-root>` invocation, the exit-code-to-verdict mapping, and the three STOP-and-print literals with the `failed_check` value each belongs to) plus the verdict output contract below. The subagent runs the tool and reports what it returned; it SHALL NOT re-derive, second-guess, or repair a check in prose, and it SHALL NOT self-correct a non-zero tool failure. The prompt SHALL NOT include `@sai/policies/prereqs-paths.md`, any change-artifact path (`openspec/specs/{name}/spec.md`, `openspec/schemas/sai-workflow/schema.yaml`, `openspec/changes/{change-name}/**`, or the archive pattern), raw shell evidence, or openspec command transcripts.
  Verdict output contract: the completion report envelope `status` stays in the budget-subagent binding's closed vocabulary (`success | partial | failed`) with exactly the four fields (`status`, `actions_taken`, `failures`, `output`); the verdict rides in the `output` payload as `verdict: pass` (tool exit 0) or `verdict: halt` (tool exit 1), and on halt the payload includes the tool's `failed_check` value and the verbatim remediation literal from `sai/policies/prereqs-check.md` for that check. A tool exit 2, an unlocatable tool, or an unparseable payload is reported as an envelope `status: failed` — never as `verdict: pass` and never as a halt with an invented literal. Relay the verdict:
  - `verdict: pass` — continue exploration.
  - `verdict: halt` — print the report's remediation literal unchanged (no prefix, suffix, summary, or rephrasing) and stop without writing any file.
  - Envelope `status: failed` or `partial` — dispatch failure: the prerequisite check could not be completed; present it as such, print no remediation literal, and do not continue as if the checks passed.
  Fetch @skills/safe-operations/SKILL.md and use it

  ## Fast-track parse
  Per the canonical parse order in `@sai/policies/fast-track-flag.md` — fast-track presence-plus-strip first, every other flag validation afterwards — inspect `$ARGUMENTS` for the positional token `--fast-track`:
  - If the token is present anywhere in `$ARGUMENTS`:
    1. Set the in-conversation fast-track signal to active.
    2. Remove the `--fast-track` token from `$ARGUMENTS` and trim surrounding whitespace.
    3. Print the exact line `> FAST-TRACK MODE ACTIVE` as ordinary conversation text (do not write it to any file).
    4. Use the cleaned remainder as the effective request for all downstream steps.
  - If the token is absent:
    1. Leave the fast-track signal inactive.
    2. Use `$ARGUMENTS` verbatim.

  ## Overview-language validation
  After the fast-track parse, inspect the cleaned remainder for the optional `--overview-lang <language>` option. Parse and validate it before change-name resolution and before overview dispatch:
  - If the option is absent, leave the invocation-scoped overview-language unresolved: produce no effective `overview_language` and do not synthesize `English`; gate 9 may later resolve it at a supervised Plan (unattended) activation.
  - If the option appears once, require exactly one following non-empty token that is not another option, consume that token as the free-form language value, remove only the option and its value from the cleaned remainder, and set `overview_language` to that value.
  - If the option is final or its next token begins with `--`, stop with the clear validation error `Missing value for --overview-lang; provide one non-empty language token before continuing.` Do not resolve a change or perform any dispatch.
  - If the option appears more than once, stop with the clear validation error `Duplicate --overview-lang is not allowed; provide the option once.` Do not resolve a change or perform any dispatch.
  - Preserve the change/topic token and every remaining unrelated argument in their original order after removing the option and its value; the language option is recognized wherever it stands relative to where the fast-track token appeared.
  - The cleaned request and `overview_language` are invocation-scoped. They are never written to a change artifact or configuration file.

  ## Load behaviors (in order)
  Fetch @skills/budget/SKILL.md and use it

  ## Load instructions (in order)
  Fetch @sai/commands/explore/instructions.md
  Fetch @skills/openspec-explore/SKILL.md and follow those instructions exactly.
  Fetch @sai/policies/remember.md

  ## Run
  **User's request:** the cleaned effective request — `arguments_value` after the overview-language and fast-track parses above removed their options.
</TASK>

Follow instruction on <TASK> step by step
