---
description: Structured Accessibility Audit Prompt — WCAG 2.2 AA static review (and optional runtime axe/Lighthouse) on UI changes vs parent branch, produces openspec/changes/{change-name}/accessibility.md
argument-hint: "[change-name] [optional: --full | --path {dir}] [optional: --runtime] [optional: parent branch]"
model: opus
effort: medium
allowed-tools: Read, Glob, Skill, Agent, SendMessage, AskUserQuestion
---
## Sai Accessibility - 8

Fetch @skills/fetch/SKILL.md
Fetch @skills/sai-8-accessibility-worker/SKILL.md and use it.
Fetch @sai/commands/accessibility/coordinator.md and follow those instructions exactly.

InvocationEnvelope:
  wrapper_echo_value: ""
  arguments_value: $ARGUMENTS
