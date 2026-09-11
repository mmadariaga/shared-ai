<TASK>

  Fetch @sai/policies/verified-precondition-handback.md
  ## Prerequisite checks
  Fetch @sai/policies/prereqs-paths.md and retain the OpenSpec path table in this conversation — local artifact reads use the direct paths from it.
  Fetch @sai/policies/prereqs-check.md and run its check task inline in the main session.
  Run the OpenSpec prerequisite preflight inline — one direct run of the `sai/tools/prereqs.js` `check` sub-command with the mandatory `--require-openspec-skills <harness>` flag (`claude` on Claude Code, `opencode` on opencode), whose verdict decides the `openspec` binary availability check, the `openspec/` directory existence check, the `openspec/config.yaml` `schema: sai-workflow` check, and the OpenSpec skills check in the active harness's project-local skills root, as defined in `@sai/policies/prereqs-check.md` — in the main session with no subagent and no deferral condition (run on every invocation, including sessions that never touch `openspec/`). Use the first existing tool-location candidate in `@sai/policies/prereqs-check.md` order (project-local relative path first, then verbatim global) with the byte-identical-per-harness `node <tool-path> check --json --cwd <project-root> --require-openspec-skills <harness>` invocation; do not compose a tool path by joining a root string to a suffix, do not re-derive, second-guess, or repair a check in prose, and do not self-correct a non-zero tool failure. Omitting the flag or passing any other value is a usage error (exit 2), never a halt. Relay the verdict directly:
  - exit 0 (`verdict: pass`) — continue exploration.
  - exit 1 (`verdict: halt`) — print the matching remediation literal from `sai/policies/prereqs-check.md` for the tool's `failed_check` unchanged (no prefix, suffix, summary, or rephrasing) and stop without writing any file.
  - exit 2, unlocatable tool, or unparseable payload — the prerequisite check could not be completed; report it as-is (naming the tried candidates when unlocatable), print no remediation literal, and do not continue as if the checks passed, never as `verdict: pass` and never as a halt with an invented literal.
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
