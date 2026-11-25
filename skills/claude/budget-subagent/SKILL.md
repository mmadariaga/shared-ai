---
name: budget-subagent
description: >
  Binds "task subagent" to Claude Code subagent dispatch routed through the budget-subagent agent file. Cost-controlled general-purpose task delegation with a structured completion report and single-task scope. Claude Code only — NOT compatible with opencode.
  TRIGGER when: "budget subagent", "cheap subagent", "budget task", "cheap task", "budget mode", "cheap mode", "low-cost mode", "economy mode"
license: MIT
compatibility: claude
metadata:
  author: Mikel Madariaga
  version: "1.0"
---

## Subagent binding

"task subagent" → `Agent(subagent_type: budget-subagent, run_in_background: true, prompt: <prompt>)`.

## Opencode routing

Fetch `@sai/policies/opencode-dispatch.md`

Before every creation of this agent, run the route query of that policy (§ Route). The query reads the agent file, so never decide the route yourself. It answers `claude`, and the `Agent` call above creates the agent, or `opencode`, and the policy creates, continues, and disposes the agent instead of that call.

## Model resolution

The subagent model is controlled by the `model` frontmatter of the resolved `budget-subagent.md` agent file: `.claude/agents/budget-subagent.md` takes precedence over `~/.claude/agents/budget-subagent.md`. Do not pass a per-spawn model parameter.

## Dispatch mode

Dispatch in the background only from a main agent, routed SAI coordinator, or routed SAI worker whose lifetime outlives the child. Capture the returned agent ID and await the handback on the dispatcher's own turn, matching each reply to its subagent by task ID when several run at once; never sleep or poll. A continuation (`SendMessage` to the captured agent ID) goes as `@sai/policies/worker-lifecycle.md` § Continuation timing says.

## Spawn prompt

Give one task per spawn: what to do, the files or area it covers, and, when you need a specific result, the exact shape to return. Without a shape the subagent returns its structured completion report. Split independent tasks into separate spawns.

## Report delivery

Every spawn prompt opens with the line `--report-dir <dir>`, the helper report directory the dispatcher opened with `transfer.js open`; the agent saves its report there and replies with its `{path, sha256}` reference only, and there is no text reply. A Claude Code dispatcher that dispatches this agent routed to opencode (`harness: opencode`, `@sai/policies/opencode-dispatch.md`) adds `--harness claude` as the second line. Creating the directory, accepting the reference before reading the report, recovering an undelivered report, and closing the directory follow `@sai/policies/worker-report-transport.md` § Budget agents, dispatcher side.

Fetch `@sai/policies/worker-report-transport.md`

## Warming and dispose

Fetch `@sai/policies/cache-warming.md`
Fetch `@sai/policies/worker-lifecycle.md`

A one-shot task message carries no warming switch, because the coordinator disposes the helper after its result, as `@sai/policies/worker-lifecycle.md` says, whatever its `warming` diagnostic. When the card you follow continues the subagent with further messages, end each message with the warming switch of `@sai/policies/cache-warming.md`.

## Task contract

The agent fetches `@sai/policies/budget-agent.md`, which owns single-task scope, the result shape (the task's own when it defines one, else the structured completion report), bounded output, permission-block aborts, the completion criterion (result achieved or call cap reached, reporting what was tried), and the approximately 30-call soft limit.

Fetch `@sai/policies/budget-agent.md`
