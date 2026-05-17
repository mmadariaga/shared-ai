---
description: Explore mode wrapper — thinking partner for ideas, problems, and requirements. Wraps opsx:explore skill, adds caveman mode. Optionally pass a change name to explore an existing change.
argument-hint: "[optional: change-name or topic]"
model: claude-opus-4-7
effort: high
---

## Prerequisite check

Before proceeding, verify:
1. `openspec` binary is available in PATH. If not, STOP and print: "openspec CLI not found. Install it first: https://github.com/Fission-AI/OpenSpec"
2. `openspec/` directory exists at project root. If not, STOP and print: "OpenSpec not initialized in this project. Run: openspec init"

Do not create or modify any files if either check fails.

## Load behaviors (in order)

Fetch @~/.claude/instructions/sai/caveman.md

Then fetch and follow the openspec-explore skill at `.claude/skills/openspec-explore/SKILL.md` exactly. User input: $ARGUMENTS

Fetch @~/.claude/instructions/sai/remember.md
