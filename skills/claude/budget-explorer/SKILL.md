---
name: budget-explorer
description: >
  Binds "cheap research subagent" to Claude Code subagent dispatch routed through the budget-explorer agent file. Read-only research and lookup with a 40 tool calls ceiling and output-contract discipline; multi-step synthesis stays with the main agent.
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

Use this agent for bounded read-only lookup, research, and documentation reads. Multi-step synthesis and cross-file reasoning stay with the caller: the main agent, coordinator, or worker that dispatched it.

## Spawn prompt

Every spawn prompt states the **goal** and the **output contract**: exact response fields, a hard word-or-line length cap, and the raw-content rule (`no raw file contents`, or bounded verbatim excerpts when an audit needs them). State what to find, not how: a spawn prompt MUST NOT prescribe a research tool, a procedure, a numbered sequence of steps, or a method, because the tool-preference ladder in `@sai/policies/explore-agent.md` governs tool choice whatever the prompt says.

## Tool-call ceiling

At most 40 tool calls per execution segment: the spawn and every continuation each get their own 40. A caller may declare a smaller cap for one dispatch. When a task needs more, open another segment or spawn another bounded explorer instead of raising the ceiling.

Fetch @sai/policies/explore-agent.md
