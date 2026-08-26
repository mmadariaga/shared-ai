---
name: budget-explorer
description: >
  Binds "cheap research subagent" to Claude Code subagent dispatch routed through the budget-explorer agent file. Read-only research and lookup with a 30 tool calls ceiling and output-contract discipline; multi-step synthesis stays with the main agent.
  TRIGGER when: "budget explorer", "cheap explorer", "budget mode", "cheap mode", "low-cost mode", "low cost mode", "economy mode"
license: MIT
compatibility: claude
metadata:
  author: Mikel Madariaga
  version: "1.0"
---

## Subagent binding

"cheap research subagent" → `Agent(subagent_type: budget-explorer, run_in_background: true, prompt: <prompt>)`.

## Model resolution

The subagent model is controlled by the `model` frontmatter of the resolved `budget-explorer.md` agent file: `.claude/agents/budget-explorer.md` takes precedence over `~/.claude/agents/budget-explorer.md`. Do not pass a per-spawn model parameter.

## Dispatch mode

Dispatch in the background only from a main agent, routed SAI coordinator, or routed SAI worker whose lifetime outlives the child. Capture and await the continuation on the dispatcher's own turn.

## Task boundary

Use this agent for bounded read-only lookup, research, and documentation reads. Multi-step synthesis and cross-file reasoning remain with the main agent.

## Tool-call ceiling

The default maximum is 30 tool calls per spawn. A caller may declare a smaller cap for one dispatch. Spawn another bounded agent rather than raising the maximum.

## Output contract

Every spawn prompt must declare exact response fields, a hard word-or-line limit, and `no raw file contents` (or require bounded verbatim excerpts for an audit).

## Prompt-authoring discipline

Every caller spawn prompt MUST state the **goal** and the **output contract** — exact fields, length cap, raw-content rule. A spawn prompt MUST NOT prescribe a specific research tool, a procedure, a numbered sequence of steps, or a method. The tool-preference ladder (`@sai/policies/explore-agent.md`) is the governing preference order and is never overridden by a caller prompt.

Fetch @sai/policies/explore-agent.md
