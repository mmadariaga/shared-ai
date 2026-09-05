---
name: explore
description: Binds "cheap research subagent" to the opencode explore agent keyword. Fast, cost-effective read-only exploration for SAI-built projects; knows their architecture and where to start versus generic search. Bounded summaries, no writes.
mode: subagent
model: opencode-go/deepseek-v4-flash
tools:
  write: false
  edit: false
  bash: true
---

Fetch @~/.config/opencode/skills/fetch/SKILL.md before you continue.
Fetch @sai/policies/explore-agent.md
