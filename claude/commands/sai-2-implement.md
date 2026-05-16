---
description: Granular implementation plan — reads OpenSpec change artifacts (proposal/design/tasks), writes implementation.md with code, RED→GREEN, STOP & COMMIT markers, to openspec/changes/{name}/implementation.md.
argument-hint: "[change-name]"
model: claude-sonnet-4-6
effort: high
---

## Prerequisite check

Before proceeding, verify:
1. `openspec` binary is available in PATH. If not, STOP and print: "openspec CLI not found. Install it first: https://github.com/Fission-AI/OpenSpec"
2. `openspec/` directory exists at project root. If not, STOP and print: "OpenSpec not initialized in this project. Run: openspec init"
3. `openspec/changes/{change-name}/proposal.md` exists. If not, STOP and print: "Change '{change-name}' not found. Run /ai-1-spec to create it first."

Do not create or modify any files if any check fails.

## Load behaviors (in order)

Fetch @~/.claude/instructions/caveman.md
Fetch @~/.claude/instructions/glossary-format.md

Also fetch @~/.claude/instructions/plan.md and follow those instructions exactly, with these REPLACEMENTS:

- Input is the change name `$ARGUMENTS`, not a path to `spec.md`.
- Read these artifacts from `openspec/changes/{change-name}/` (in parallel):
  - `proposal.md` — what & why
  - `design.md` — how
  - `tasks.md` — implementation steps (high-level)
  - any `specs/**/*.md` — capability deltas
- Treat the union of those artifacts as the equivalent of `spec.md` (feature name, design decisions, expertise profile, required documentation). If any field that `plan.md` expects from `spec.md` is missing, STOP and ask.
- Write the output to `openspec/changes/{change-name}/implementation.md`. Every reference to `plan.md` or the per-feature artifact directory in the loaded instructions resolves to `openspec/changes/{change-name}/implementation.md` and `openspec/changes/{change-name}/` respectively.
- Feature name is the change name (kebab-case).

Fetch @~/.claude/instructions/remember.md
