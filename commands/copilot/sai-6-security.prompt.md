---
description: Structured Security Audit Prompt — SAST + SCA on the diff vs parent branch (or full repo / path), produces openspec/changes/{change-name}/security.md
argument-hint: "[change-name] [optional: --full | --path {dir}] [optional: parent branch]"
agent: agent
model: GPT-5.4 (copilot)
tools: [vscode, read, search, edit, execute, web]
---
## Sai Security - 6

Use the skill tool to load the fetch skill.
Fetch @sai/commands/sai-6-security.md and follow those instructions exactly.
