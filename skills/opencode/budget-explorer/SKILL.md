---
name: budget-explorer
description: >
  Binds "cheap research subagent" to the opencode explore agent keyword. Model resolved via agent.explore.model in the project's opencode.jsonc — not hardcoded here.
  TRIGGER when: "budget explorer", "cheap explorer", "budget mode", "cheap mode", "low-cost mode", "low cost mode", "economy mode"
license: MIT
compatibility: opencode
metadata:
  author: Mikel Madariaga
  version: "1.0"
---

## Subagent binding

"cheap research subagent" → `explore` (lowercase) when invoked as an OpenCode agent keyword.

## Model resolution

The model for `explore` subagents is controlled by `agent.explore.model` in the project's `opencode.jsonc`. This file contains no hardcoded model identifier.

## Tool-call caps

Per-spawn cap for `explore` subagents: ≤30 tool calls. If a task exceeds the cap, spawn an additional subagent rather than raising the cap.

## Output contract

Every subagent spawn MUST declare in its prompt:
- Exact fields expected in the response
- A hard length cap (word or line count)
- Explicit "no raw file contents" (or "verbatim excerpts required" for audit mode)
