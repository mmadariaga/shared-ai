<TASK>

  Fetch @sai/policies/verified-precondition-handback.md

  ## Load receipt
  The load is the sequence of reads and calls of this command, from the wrapper through `sai-state spawn`. It ends with the load receipt: the `verdict: pass` of the `prereqs.js` check plus the id returned by `sai-state spawn`, both produced after the most recent `/sai-explore` invocation in the chat. The receipt is made of those two tool outputs; only they count, and a receipt from before the latest invocation does not.
  - **Turn check.** Every explore turn (any turn after a `/sai-explore` invocation) starts by looking for the receipt. With the receipt present, handle the turn's message. With it missing — an interrupted load, a compaction that removed it, or a stale cached wrapper — complete the load first (the prerequisite check, the instruction loads, and `sai-state spawn`, with the invocation's arguments), then handle the turn's message. A recovery load keeps the current stage and the agreed lists, because `sai-state spawn` with the same key returns the existing session.
  - **Deferred messages.** Acknowledge a message that arrives while the load is in progress in one line, and evaluate it once the receipt exists, in arrival order. This holds for every load, a recovery load included. A deferred message that invokes a skill or command (for example `/from-backlog <url>`) runs once the receipt exists, under the explore contract: read-only, with staged progression; when it finishes, exploration continues at its current stage.
  - **Cancellation.** A cancellation during the load takes effect at once: stop the load and discard the remaining deferred messages.
  - **Prerequisite halt.** On `verdict: halt`, print the policy's literal for the reported `failed_check` and close the command; handle the deferred messages as ordinary chat outside explore.
  - **Spawn failure.** When `sai-state spawn` fails, stop the load with the store error visible; the next explore turn retries the load through the turn check.
  - **Harnesses.** Claude Code (a message delivered mid-turn) and opencode (a queued user message) follow these same rules.

  ## Prerequisite checks
  Fetch @sai/policies/prereqs-paths.md and retain the OpenSpec path table in this conversation — local artifact reads use the direct paths from it.
  Fetch @sai/policies/prereqs-check.md and run its `sai/tools/prereqs.js` check inline in the main session, before any other step, on every invocation — including sessions that never touch `openspec/`; never delegate or defer it. Pass `--require-openspec-skills claude` on Claude Code and `--require-openspec-skills opencode` on opencode. Continue only on exit 0 (`verdict: pass`); on a halt print the policy's literal for the reported `failed_check`, and treat an incomplete check exactly as the policy says — never as `verdict: pass`.

  ## Behaviors
  Fetch @skills/safe-operations/SKILL.md and use it
  Fetch @skills/budget/SKILL.md and use it
  Delegate all discovery research to the budget-explorer subagent with a goal and an output contract. The main session reasons and synthesizes, reading directly only `openspec/` artifacts, its fetched instruction and policy files, and stage-machine state. `WebFetch`, `WebSearch`, and punctual `Glob`/`Grep`/`Read` are exceptions for a one-off verification or while the explorer is unavailable; re-delegate as soon as it is back. The explorer detects CodeGraph availability itself: its `ladder_discards` field is the only availability signal, so the main session runs no probe and prints no availability literal.
  Before the first executor dispatch of pre-crystallization Explore, Fetch @sai/policies/investigation-batch.md and follow it exactly.
  **Explorer two-phase startup.** Every pre-crystallization budget-explorer dispatch runs in two phases. The initial dispatch is ready-only: base instructions only, with no goal, output contract, change or topic, or provenance, and a ready prompt that names no tool; the explorer returns exactly `event: ready` with empty `changed_files` before any work. The goal and output contract then travel only in a continuation on the same handle: `SendMessage` to the captured agent handle on Claude Code, `task(task_id: "<captured task ID>", prompt: "<goal + output contract>")` on opencode. Each parallel explorer does its own ready. Keep the handle for that continuation only; ready opens no guard window. Ready and task retry separately with identical prompts under the shared bounded retry budget (at most two retries each), and a missing ready relaunches fresh with the original minimal envelope. Every explorer dispatch pays both phases, a single-file read included. Routed spec and design dispatches keep their own two-phase startup, unwrapped.

  ## Fast-track parse
  Parse `arguments_value` for the `--fast-track` token first, per `@sai/policies/fast-track-flag.md`:
  - Present: set the in-conversation fast-track signal active, remove the token, trim surrounding whitespace, and print the exact line `> FAST-TRACK MODE ACTIVE` as conversation text.
  - Absent: leave the signal inactive.
  What remains is the cleaned request.

  ## Overview-language validation
  After the fast-track parse, inspect the cleaned request for the optional `--overview-lang <language>` option. Parse and validate it before change-name resolution and before overview dispatch:
  - If the option is absent, leave the invocation-scoped overview-language unresolved: produce no effective `overview_language` and do not synthesize `English`; gate 9 may later resolve it in round 3 of the route round when the route answer is Plan (unattended).
  - If the option appears once, require exactly one following non-empty token that is not another option, consume that token as the free-form language value, remove only the option and its value from the cleaned request, and set `overview_language` to that value.
  - If the option is final or its next token begins with `--`, stop with the clear validation error `Missing value for --overview-lang; provide one non-empty language token before continuing.` Do not resolve a change or perform any dispatch.
  - If the option appears more than once, stop with the clear validation error `Duplicate --overview-lang is not allowed; provide the option once.` Do not resolve a change or perform any dispatch.
  - Preserve the change/topic token and every remaining unrelated argument in their original order after removing the option and its value; the language option is recognized wherever it stands relative to where the fast-track token appeared.
  - The cleaned request and `overview_language` are invocation-scoped. They are never written to a change artifact or configuration file.

  ## Load instructions (in order)
  Fetch @sai/commands/explore/instructions.md
  Fetch @skills/openspec-explore/SKILL.md and follow those instructions exactly.
  Fetch @sai/policies/remember.md
  Fetch @sai/policies/question-context.md
  Run `sai-state spawn --key <stable-key>` per `@sai/policies/stage-machine.md` as the final step of the load, and retain the returned `id` as the load receipt's session id: every stage event of this invocation emits against it.
  On an invocation turn (a user message that runs `/sai-explore`), run `sai-state reset <id> explore-idea@1` and `sai-state reset <id> explore-slice@1` right after `sai-state spawn`, so the invocation starts from the initial stage, empty lists, and no slice inventory even when the chat holds the receipt of an earlier invocation; a parked Direct Build resumes only inside the invocation that parked it, and a new invocation discards its cursors with the rest of the state. A recovery load (a turn that is not an invocation, lacks the receipt, and completes the load before answering) runs `spawn` only and keeps the current stage, the agreed lists, and the slice inventory.
  Chat language: after `sai-state spawn` and its resets, Fetch @sai/policies/tool-resolution.md and run `node <tool-path> get explore.chatPublicLanguage --json --cwd <project-root>`, resolving `<tool-path>` for `project-settings.js`. When it returns a `value`, adopt it as if the user had written "let's talk in <value>" before discussing any idea or change: all explanatory chat text of this invocation uses that language from the first message after the load, writing in another language does not change it, and only the user's explicit request for another language replaces it for the rest of the invocation. Reasoning stays English; fixed literals (STOP notices, halt messages, picker labels) and every artifact, the `Ready to Propose` block and the change overview included, are unaffected. A non-zero exit, unparseable output, or `value: null` is an absent setting: print the tool's `warnings`, or one line naming the failure, and continue without a language instruction.

  ## Run
  **User's request:** the cleaned request after the fast-track and overview-language parses.
</TASK>

Follow instruction on <TASK> step by step
