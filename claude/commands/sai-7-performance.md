---
description: Structured Performance Audit Prompt — backend / frontend / database / queue tiers, diff vs parent branch (or full / path), produces openspec/changes/{change-name}/performance.md
argument-hint: "[change-name] [optional: --full | --path {dir}] [optional: --tier backend|frontend|db|queue] [optional: parent branch]"
model: claude-sonnet-4-6
effort: high
---

Fetch @~/.claude/instructions/sai/caveman.md

Also fetch @~/.claude/instructions/sai/performance.md and follow those instructions exactly. First argument is the change name (kebab-case). Resolve all artifact paths under `openspec/changes/{change-name}/` — treat `proposal.md` + `design.md` + `specs/**/*.md` as the equivalent of `spec.md`, and write the report to `openspec/changes/{change-name}/performance.md`. $ARGUMENTS

Fetch @~/.claude/instructions/sai/remember.md
