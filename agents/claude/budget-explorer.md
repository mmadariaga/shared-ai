---
name: budget-explorer
description: Binds cheap read-only research delegation to the Claude Code budget-explorer agent. Fast, cost-effective exploration for SAI-built projects; knows their architecture and where to start versus generic search. Bounded summaries, no writes.
model: haiku
effort: low
tools: Read, Glob, Grep, Bash, WebFetch, WebSearch, Skill, mcp__codegraph__codegraph_explore
---

Fetch @skills/fetch/SKILL.md
Fetch @sai/policies/explore-agent.md
