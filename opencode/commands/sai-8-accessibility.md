---
description: Structured Accessibility Audit Prompt — WCAG 2.2 AA static review (and optional runtime axe/Lighthouse) on UI changes vs parent branch, produces openspec/changes/{change-name}/accessibility.md
model: opencode-go/qwen3.6-plus
---

Fetch @~/.config/opencode/instructions/sai/caveman.md

Also fetch @~/.config/opencode/instructions/sai/accessibility.md and follow those instructions exactly. First argument is the change name (kebab-case). Resolve all artifact paths under `openspec/changes/{change-name}/` — treat `proposal.md` + `design.md` + `specs/**/*.md` as the equivalent of `spec.md`, and write the report to `openspec/changes/{change-name}/accessibility.md`. $ARGUMENTS
