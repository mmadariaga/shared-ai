---
description: Generate design.md and tasks.md for an approved change — gated on specs approval recorded by /sai-1-spec.
argument-hint: "[change-name]"
model: claude-opus-4-7
effort: high
---

## Prerequisite check

Before proceeding, verify:
1. `openspec` binary is available in PATH. If not, STOP and print: "openspec CLI not found. Install it first: https://github.com/Fission-AI/OpenSpec"
2. `openspec/` directory exists at project root. If not, STOP and print: "OpenSpec not initialized in this project. Run: openspec init"
3. `openspec/changes/{change-name}/.openspec.yaml` exists AND contains `approval.specs.approved_at`. If not, STOP and print: "Specs not yet approved for '{change-name}'. Review openspec/changes/{change-name}/specs/ and confirm approval before running /sai-2-design."

Do not create or modify any files if any check fails.

## Load behaviors (in order)

Fetch @~/.claude/instructions/sai/caveman.md
Fetch @~/.claude/instructions/sai/glossary-format.md

Then fetch and follow the openspec-continue skill at `.claude/skills/openspec-continue/SKILL.md` exactly, with this OVERRIDE:

- Generate ONLY `design.md` and `tasks.md` for change `$ARGUMENTS`.
- Use proposal.md and specs/**/*.md as inputs.
- Do NOT regenerate proposal.md or specs/.

Fetch @~/.claude/instructions/sai/remember.md
