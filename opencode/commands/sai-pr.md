---
description: Pull Request Author — synthesizes title and body from the OpenSpec change artifacts (proposal/design/specs/implementation/review/security/performance/accessibility) and the git diff vs parent branch; saves openspec/changes/{change-name}/pr.md and (with authorization) opens the PR via gh
model: opencode-go/deepseek-v4-flash
---

Fetch @~/.config/opencode/instructions/sai/prereqs.md

Fetch @~/.config/opencode/instructions/sai/caveman.md

Also fetch @~/.config/opencode/instructions/sai/pr.md and follow those instructions exactly. First argument is the change name (kebab-case). Resolve all artifact paths under `openspec/changes/{change-name}/` — treat `proposal.md` + `design.md` + `specs/**/*.md` as the equivalent of `spec.md`, `implementation.md` as the equivalent of `plan.md`, and write the PR draft to `openspec/changes/{change-name}/pr.md`. $ARGUMENTS

Fetch @~/.config/opencode/instructions/sai/remember.md
