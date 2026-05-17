---
description: Propose a new change — generates proposal.md and specs/ only. Stops before design. Run /sai-2-design when specs are reviewed and approved.
argument-hint: "[change name or feature description]"
model: claude-sonnet-4-6
effort: high
---

Fetch @~/.claude/instructions/sai/prereqs.md

## Load behaviors (in order)

Fetch @~/.claude/instructions/sai/caveman.md
Fetch @~/.claude/instructions/sai/glossary-format.md
Fetch @~/.claude/instructions/sai/spec.propose.md

Then fetch and follow the openspec-propose skill at `.claude/skills/openspec-propose/SKILL.md` exactly, with this OVERRIDE:

- Generate ONLY `proposal.md` and `specs/**/*.md`. Do NOT generate `design.md` or `tasks.md`.
- After all spec files are written, STOP and print exactly:
  "Specs ready in openspec/changes/{name}/. Review them and run /sai-2-design {name} when ready."
- Then ask: "Have you reviewed the specs and are ready to approve them for design? (yes/no, and any notes)"
- When the user confirms approval, write the following fields to `openspec/changes/{name}/.openspec.yaml` under the key `approval.specs`:
  - `approved_at`: current UTC timestamp in ISO 8601 format (e.g. 2026-05-17T14:30:00Z)
  - `notes`: the user's notes (empty string if none provided)

User input: $ARGUMENTS
