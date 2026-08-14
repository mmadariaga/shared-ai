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

## Model resolution

The subagent model is controlled by the `model` frontmatter of the resolved `budget-subagent.md` agent file: `.claude/agents/budget-subagent.md` takes precedence over `~/.claude/agents/budget-subagent.md`. Do not pass a per-spawn model parameter.

## Dispatch mode

Dispatch in the background only from a main agent, routed SAI coordinator, or routed SAI worker whose lifetime outlives the child. Capture and await the continuation on the dispatcher's own turn.

## Task contract

The agent fetches `@sai/policies/budget-agent.md`, which owns single-task scope, bounded structured output, permission-block aborts, no self-correction, and the approximately 30-call soft limit.

Fetch @sai/policies/budget-agent.md
