<TASK>

  Fetch @sai/policies/verified-precondition-handback.md

  ## Prerequisite checks
  Fetch @sai/policies/prereqs-paths.md and retain the OpenSpec path table in this conversation — local artifact reads use the direct paths from it.
  Fetch @sai/policies/prereqs-check.md and run its `sai/tools/prereqs.js` check inline in the main session, before any other step, on every invocation — including sessions that never touch `openspec/`; never delegate or defer it. Pass `--require-openspec-skills claude` on Claude Code and `--require-openspec-skills opencode` on opencode. Continue only on exit 0 (`verdict: pass`); on a halt print the policy's literal for the reported `failed_check`, and treat an incomplete check exactly as the policy says — never as `verdict: pass`.

  ## Behaviors
  Fetch @skills/safe-operations/SKILL.md and use it
  Fetch @skills/budget/SKILL.md and use it
  Delegate all discovery research to the explore subagent with a goal and an output contract. The main session reasons and synthesizes, reading directly only `openspec/` artifacts, its fetched instruction and policy files, and stage-machine state. `WebFetch`, `WebSearch`, and punctual `Glob`/`Grep`/`Read` are exceptions for a one-off verification or while the explorer is unavailable; re-delegate as soon as it is back. The explorer detects CodeGraph availability itself: its `ladder_discards` field is the only availability signal, so the main session runs no probe and prints no availability literal.
  **Explorer two-phase startup.** Every pre-crystallization budget-explorer dispatch runs in two phases. The initial dispatch is ready-only: base instructions only, with no goal, output contract, change or topic, or provenance, and a ready prompt that names no tool; the explorer returns exactly `event: ready` with empty `changed_files` before any work. The goal and output contract then travel only in a continuation on the same handle: `SendMessage` to the captured agent handle on Claude Code, `task(task_id: "<captured task ID>", prompt: "<goal + output contract>")` on opencode. Each parallel explorer does its own ready. Keep the handle for that continuation only; ready opens no guard window. Ready and task retry separately with identical prompts under the shared bounded retry budget (at most two retries each), and a missing ready relaunches fresh with the original minimal envelope. Every explorer dispatch pays both phases, a single-file read included. Routed spec and design dispatches keep their own two-phase startup, unwrapped.

  ## Fast-track parse
  Parse `arguments_value` for the `--fast-track` token first, per `@sai/policies/fast-track-flag.md`:
  - Present: set the in-conversation fast-track signal active, remove the token, trim surrounding whitespace, and print the exact line `> FAST-TRACK MODE ACTIVE` as conversation text.
  - Absent: leave the signal inactive.
  What remains is the cleaned request.

  ## Overview-language validation
  After the fast-track parse, inspect the cleaned request for the optional `--overview-lang <language>` option. Parse and validate it before change-name resolution and before overview dispatch:
  - If the option is absent, leave the invocation-scoped overview-language unresolved: produce no effective `overview_language` and do not synthesize `English`; gate 9 may later resolve it at a supervised Plan (unattended) activation.
  - If the option appears once, require exactly one following non-empty token that is not another option, consume that token as the free-form language value, remove only the option and its value from the cleaned request, and set `overview_language` to that value.
  - If the option is final or its next token begins with `--`, stop with the clear validation error `Missing value for --overview-lang; provide one non-empty language token before continuing.` Do not resolve a change or perform any dispatch.
  - If the option appears more than once, stop with the clear validation error `Duplicate --overview-lang is not allowed; provide the option once.` Do not resolve a change or perform any dispatch.
  - Preserve the change/topic token and every remaining unrelated argument in their original order after removing the option and its value; the language option is recognized wherever it stands relative to where the fast-track token appeared.
  - The cleaned request and `overview_language` are invocation-scoped. They are never written to a change artifact or configuration file.

  ## Load instructions (in order)
  Fetch @sai/commands/explore/instructions.md
  Fetch @skills/openspec-explore/SKILL.md and follow those instructions exactly.
  Fetch @sai/policies/remember.md

  ## Run
  **User's request:** the cleaned request after the fast-track and overview-language parses.
</TASK>

Follow instruction on <TASK> step by step
