---
description: Pull Request Author — synthesizes title and body from the OpenSpec change artifacts (proposal/design/specs/implementation/review/security/performance/accessibility) and the git diff vs parent branch; saves openspec/changes/{change-name}/pr.md and (with authorization) opens the PR via gh
argument-hint: "[change-name] [optional: parent branch]"
model: claude-haiku-4-5
---

Fetch @~/.claude/instructions/sai/prereqs.md

## Load behaviors (in order)

Fetch @~/.claude/instructions/sai/caveman.md

Fetch @~/.claude/instructions/sai/pr.md and follow those instructions exactly. $ARGUMENTS

Fetch @~/.claude/instructions/sai/remember.md
