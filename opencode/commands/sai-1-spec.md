---
description: Propose a new change with full quality layer — wraps opsx:propose with caveman, glossary, collaboration/research discipline. Produces all OpenSpec artifacts in openspec/changes/{name}/.
model: opencode/glm-5.1
---

## Prerequisite check

Before proceeding, verify:
1. `openspec` binary is available in PATH. If not, STOP and print: "openspec CLI not found. Install it first: https://github.com/Fission-AI/OpenSpec"
2. `openspec/` directory exists at project root. If not, STOP and print: "OpenSpec not initialized in this project. Run: openspec init"

Do not create or modify any files if either check fails.

## Load behaviors (in order)

Fetch @~/.config/opencode/instructions/caveman.md
Fetch @~/.config/opencode/instructions/glossary-format.md
Fetch @~/.config/opencode/instructions/spec.propose.md

Then fetch and follow the openspec-propose skill at `.opencode/skills/openspec-propose/SKILL.md` exactly. The quality-layer file above applies to every artifact you author. User input: $ARGUMENTS
