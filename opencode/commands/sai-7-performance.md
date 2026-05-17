---
description: Structured Performance Audit Prompt — backend / frontend / database / queue tiers, diff vs parent branch (or full / path), produces openspec/changes/{change-name}/performance.md
model: opencode-go/qwen3.6-plus
---

Fetch @~/.config/opencode/instructions/sai/caveman.md

Also fetch @~/.config/opencode/instructions/sai/performance.md and follow those instructions exactly. First argument is the change name (kebab-case). Resolve all artifact paths under `openspec/changes/{change-name}/` — treat `proposal.md` + `design.md` + `specs/**/*.md` as the equivalent of `spec.md`, and write the report to `openspec/changes/{change-name}/performance.md`. $ARGUMENTS
