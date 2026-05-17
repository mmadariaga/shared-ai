---
description: Structured Security Audit Prompt — SAST + SCA on the diff vs parent branch (or full repo / path), produces openspec/changes/{change-name}/security.md
model: opencode-go/qwen3.6-plus
---

Fetch @~/.config/opencode/instructions/sai/caveman.md

Also fetch @~/.config/opencode/instructions/sai/security.md and follow those instructions exactly. First argument is the change name (kebab-case). Resolve all artifact paths under `openspec/changes/{change-name}/` — treat `proposal.md` + `design.md` + `specs/**/*.md` as the equivalent of `spec.md`, and write the report to `openspec/changes/{change-name}/security.md`. $ARGUMENTS
