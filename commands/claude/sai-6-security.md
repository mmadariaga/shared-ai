---
description: Structured Security Audit Prompt — SAST + SCA on the diff vs parent branch (or full repo / path), produces openspec/changes/{change-name}/security.md
argument-hint: "[change-name] [optional: --full | --path {dir}] [optional: parent branch]"
model: opus
effort: xhigh
allowed-tools: Read, Glob, Skill, Agent, SendMessage, AskUserQuestion
---
## Sai Security - 6

Fetch @skills/fetch/SKILL.md
Fetch @sai/orchestration/workers/bindings/security-worker.md and use it.
Fetch @sai/commands/security/coordinator.md and follow those instructions exactly.
