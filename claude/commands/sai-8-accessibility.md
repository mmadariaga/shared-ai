---
description: Structured Accessibility Audit Prompt — WCAG 2.2 AA static review (and optional runtime axe/Lighthouse) on UI changes vs parent branch, produces openspec/changes/{change-name}/accessibility.md
argument-hint: "[change-name] [optional: --full | --path {dir}] [optional: --runtime] [optional: parent branch]"
model: claude-sonnet-4-6
effort: high
---

Fetch @~/.claude/instructions/sai/prereqs.md

## Load behaviors (in order)

Fetch @~/.claude/instructions/sai/caveman.md

Fetch @~/.claude/instructions/sai/accessibility.md and follow those instructions exactly. $ARGUMENTS

Fetch @~/.claude/instructions/sai/remember.md
