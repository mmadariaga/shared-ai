---
description: Archive a completed change — wraps opsx:archive skill, adds caveman mode. Moves openspec/changes/{name}/ into the archive folder once tasks are done.
model: opencode-go/deepseek-v4-flash
---

## Prerequisite check

Before proceeding, verify:
1. `openspec` binary is available in PATH. If not, STOP and print: "openspec CLI not found. Install it first: https://github.com/Fission-AI/OpenSpec"
2. `openspec/` directory exists at project root. If not, STOP and print: "OpenSpec not initialized in this project. Run: openspec init"

Do not create or modify any files if either check fails.

## Load behaviors (in order)

Fetch @~/.config/opencode/instructions/sai/caveman.md

Then fetch and follow the openspec-archive-change skill at `.opencode/skills/openspec-archive-change/SKILL.md` exactly. User input: $ARGUMENTS

Fetch @~/.config/opencode/instructions/sai/remember.md
