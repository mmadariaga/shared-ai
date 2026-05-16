---
description: Pull Request Author — synthesizes title and body from spec.md, plan.md, review.md, security.md, and the git diff vs parent branch; saves plans/{feature-name}/pr.md and (with authorization) opens the PR via gh
argument-hint: "[path to spec.md] [optional: parent branch]"
model: claude-haiku-4-5
---

Fetch @~/.claude/instructions/caveman.md

Also fetch @~/.claude/instructions/pr.md and follow those instructions exactly. $ARGUMENTS

Also fetch @~/.claude/instructions/remember.md
