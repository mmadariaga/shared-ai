---
name: budget-executor
description: >
  Binds "executor subagent" to Claude Code subagent dispatch routed through the budget-executor agent file. Enforces execute-only, minimal-output, structured-failure-report discipline. Claude Code only — NOT compatible with opencode.
  TRIGGER when: "budget executor", "cheap executor", "budget mode", "cheap mode", "low-cost mode", "low cost mode", "economy mode"
license: MIT
compatibility: claude
metadata:
  author: Mikel Madariaga
  version: "1.0"
---

## Subagent binding

"executor subagent" → `Agent(subagent_type: budget-executor, run_in_background: true, prompt: <prompt>)`.

## Model resolution

The subagent model is controlled by the `model` frontmatter of the resolved `budget-executor.md` agent file: `.claude/agents/budget-executor.md` takes precedence over `~/.claude/agents/budget-executor.md`. Do not pass a per-spawn model parameter.

## Dispatch mode

Dispatch in the background only from a main agent, routed SAI coordinator, or routed SAI worker whose lifetime outlives the child. Capture and await the continuation on the dispatcher's own turn.

## Execution contract

The agent fetches `@sai/policies/executor-agent.md`, which owns exact-command execution, narrow low-output behavior, parallel independent commands, no self-correction, and structured failure reporting. There is no tool-call cap.

Fetch @sai/policies/executor-agent.md
