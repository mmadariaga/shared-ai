---
description: Structured Code Review Prompt — diffs current branch against parent, contrasts with the OpenSpec change artifacts, and produces openspec/changes/{change-name}/review.md
argument-hint: "[change-name] [optional: parent branch]"
model: opus
effort: medium
allowed-tools: Read, Glob, Skill, Agent, SendMessage, AskUserQuestion
---
## Sai Review - 5

Fetch @skills/fetch/SKILL.md
Fetch @sai/orchestration/workers/bindings/review-worker.md and use it.
Fetch @sai/commands/review/coordinator.md and follow those instructions exactly.
