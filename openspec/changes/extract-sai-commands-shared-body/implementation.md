# Extract sai-* Command Bodies to Shared Location

## Goal

Extract the shared body of all 12 sai-* commands to `commands/sai/`, rewrite both harnesses to thin wrappers, and update install documentation so the new directory is copied alongside existing files.

## Prerequisites

- Ensure branch is not master or main. Create `extract-sai-commands-shared-body` from `main` before implementing otherwise.

## ADR (project maintains ADRs — create directly)

Create `docs/adr/0003-fetch-path-convention-commands-sai.md`:

```markdown
# ADR 0003: Fetch Path Convention for Shared Command Bodies

## Status

Accepted

## Context

After extracting shared sai-* command bodies to `commands/sai/` at the project root, harness wrapper files need a Fetch directive to load the shared body at runtime. The Fetch directive path is resolved relative to the harness config root (`~/.claude/` for Claude Code, `~/.config/opencode/` for OpenCode), not relative to the project root.

Three path formats were considered:
- `@commands/<cmd>.md` — flat, no namespace; collides with future non-sai commands
- `@sai/<cmd>.md` — shorter, but diverges from the established `commands/` top-level directory
- `@commands/sai/<cmd>.md` — mirrors project layout, namespaced, consistent with `instructions/sai/` and `skills/*/`

## Decision

Use `@commands/sai/<cmd>.md` as the Fetch path in all wrapper files.

## Rationale

Mirrors the project layout (`commands/sai/` at project root) and is consistent with how other shared paths are structured (`instructions/sai/`, `skills/*/`). The `commands/` prefix namespaces command bodies separately from other config root contents.

## Consequences

- Shared body files must be installed to `<config-root>/commands/sai/` — existing users must re-run install steps.
- Changing this path after installation breaks existing installed wrappers (requires user reinstall).
- If a harness resolves `@` paths relative to CWD instead of config root, all shared bodies silently fail. No file-level mitigation available; documented as a known runtime dependency.
```

---

### Step-by-Step Instructions

#### Step 1: Create `commands/sai/` with 12 extracted body files

*(Non-testable step — file creation only, no runtime code)*

- [x] Create file `docs/adr/0003-fetch-path-convention-commands-sai.md` with the ADR content shown in the Prerequisites section above.

- [x] Create `commands/sai/sai-1-spec.md`:

```markdown
Fetch @instructions/sai/prereqs.md

## Load behaviors (in order)

Fetch @skills/budget-explorer/SKILL.md
Fetch @skills/caveman/SKILL.md
Fetch @instructions/sai/glossary-format.md
Fetch @instructions/sai/spec.propose.md

Fetch the openspec-propose skill at @skills/openspec-propose/SKILL.md and follow those instructions exactly.

Fetch @instructions/sai/remember.md
```

- [x] Create `commands/sai/sai-2-design.md`:

```markdown
Fetch @instructions/sai/prereqs.md

## Load behaviors (in order)

Fetch @skills/budget-explorer/SKILL.md
Fetch @skills/caveman/SKILL.md
Fetch @instructions/sai/glossary-format.md

Fetch @instructions/sai/design.md and follow those instructions exactly.

Fetch @instructions/sai/remember.md
```

- [x] Create `commands/sai/sai-3-implement.md`:

```markdown
Fetch @instructions/sai/prereqs.md

Also verify before proceeding:
- `openspec/changes/{change-name}/proposal.md` exists. If not, STOP and print: "Change '{change-name}' not found. Run /sai-1-spec to create it first."
- `openspec/changes/{change-name}/design.md` exists. If not, STOP and print: "design.md not found for '{change-name}'. Run /sai-2-design first."

Do not create or modify any files if any check fails.

## Load behaviors (in order)

Fetch @skills/budget-explorer/SKILL.md
Fetch @skills/caveman/SKILL.md
Fetch @instructions/sai/glossary-format.md

Fetch @instructions/sai/implement.md and follow those instructions exactly.

Fetch @instructions/sai/remember.md
```

- [x] Create `commands/sai/sai-4-apply.md`:

```markdown
Fetch @instructions/sai/prereqs.md

Also verify before proceeding:
- `openspec/changes/{change-name}/implementation.md` exists. If not, STOP and print: "implementation.md not found for '{change-name}'. Run /sai-3-implement first."

Do not create or modify any files if this check fails.

## Load behaviors (in order)

Fetch @skills/caveman/SKILL.md

Fetch @instructions/sai/apply.md and follow those instructions exactly.

Fetch @instructions/sai/remember.md
```

- [x] Create `commands/sai/sai-5-review.md`:

```markdown
Fetch @instructions/sai/prereqs.md

## Load behaviors (in order)

Fetch @skills/caveman/SKILL.md
Fetch @instructions/sai/glossary-format.md

Fetch @instructions/sai/review.md and follow those instructions exactly.

Fetch @instructions/sai/remember.md
```

- [x] Create `commands/sai/sai-6-security.md`:

```markdown
Fetch @instructions/sai/prereqs.md

## Load behaviors (in order)

Fetch @skills/caveman/SKILL.md

Fetch @instructions/sai/security.md and follow those instructions exactly.

Fetch @instructions/sai/remember.md
```

- [x] Create `commands/sai/sai-7-performance.md`:

```markdown
Fetch @instructions/sai/prereqs.md

## Load behaviors (in order)

Fetch @skills/caveman/SKILL.md

Fetch @instructions/sai/performance.md and follow those instructions exactly.

Fetch @instructions/sai/remember.md
```

- [x] Create `commands/sai/sai-8-accessibility.md`:

```markdown
Fetch @instructions/sai/prereqs.md

## Load behaviors (in order)

Fetch @skills/caveman/SKILL.md

Fetch @instructions/sai/accessibility.md and follow those instructions exactly.

Fetch @instructions/sai/remember.md
```

- [x] Create `commands/sai/sai-archive.md`:

```markdown
Fetch @instructions/sai/prereqs.md

## Load behaviors (in order)

Fetch @skills/caveman/SKILL.md
Fetch @instructions/sai/archive.md

Then fetch and follow the openspec-archive-change skill at @skills/openspec-archive-change/SKILL.md exactly.

Fetch @instructions/sai/remember.md
```

- [x] Create `commands/sai/sai-commit.md`:

```markdown
Fetch @skills/caveman/SKILL.md

Also fetch @instructions/sai/commit.md and follow those instructions exactly.

Also fetch @instructions/sai/remember.md
```

- [x] Create `commands/sai/sai-explore.md`:

```markdown
Fetch @instructions/sai/prereqs.md

## Load behaviors (in order)

Fetch @skills/budget-explorer/SKILL.md
Fetch @skills/caveman/SKILL.md
Fetch @instructions/sai/explore.md

Then fetch and follow the openspec-explore skill at @skills/openspec-explore/SKILL.md exactly.

Fetch @instructions/sai/remember.md
```

- [x] Create `commands/sai/sai-pr.md`:

```markdown
Fetch @instructions/sai/prereqs.md

## Load behaviors (in order)

Fetch @skills/caveman/SKILL.md

Fetch @instructions/sai/pr.md and follow those instructions exactly.

Fetch @instructions/sai/remember.md
```

##### Step 1 Verification Checklist

**Automated (agent runs before stopping):**
- [x] `ls commands/sai/ | wc -l` — expected: `12`
- [x] `grep -rl '\$ARGUMENTS' commands/sai/` — expected: no output (zero matches)
- [x] `grep -rl '^---' commands/sai/` — expected: no output (zero frontmatter blocks)
- [x] `grep -c 'commit.md and follow those instructions exactly\.' commands/sai/sai-commit.md` — expected: `1` (instruction preserved, token stripped)
- [x] `test -f docs/adr/0003-fetch-path-convention-commands-sai.md && echo OK` — expected: `OK`

*(No Human checks — no UI involved)*

#### Step 1 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. No browser verification required at this step.

---

#### Step 2: Rewrite `claude/commands/` wrappers (12 files)

*(Non-testable step — file rewrites only)*

- [x] Overwrite `claude/commands/sai-1-spec.md` with:

```markdown
---
description: Propose a new change — generates proposal.md and specs/ only. Stops before design. Run /sai-2-design when specs are reviewed and approved.
argument-hint: "[change name or feature description]"
model: claude-sonnet-4-6
effort: high
---

Fetch @commands/sai/sai-1-spec.md

User input: $ARGUMENTS
```

- [x] Overwrite `claude/commands/sai-2-design.md` with:

```markdown
---
description: Generate design.md and tasks.md for an approved change — gated on specs approval recorded by /sai-1-spec.
argument-hint: "[change-name]"
model: claude-opus-4-7
effort: high
---

Fetch @commands/sai/sai-2-design.md
```

- [x] Overwrite `claude/commands/sai-3-implement.md` with:

```markdown
---
description: Granular implementation plan — reads OpenSpec change artifacts (proposal/design/tasks), writes implementation.md with code, RED→GREEN, STOP & COMMIT markers, to openspec/changes/{name}/implementation.md.
argument-hint: "[change-name]"
model: claude-sonnet-4-6
effort: high
---

Fetch @commands/sai/sai-3-implement.md

User input: $ARGUMENTS
```

- [x] Overwrite `claude/commands/sai-4-apply.md` with:

```markdown
---
description: Apply the granular implementation plan mechanically — reads openspec/changes/{name}/implementation.md and executes step-by-step with a cheap model. Uses openspec CLI for status context.
argument-hint: "[change-name]"
model: claude-haiku-4-5
---

Fetch @commands/sai/sai-4-apply.md

User input: $ARGUMENTS
```

- [x] Overwrite `claude/commands/sai-5-review.md` with:

```markdown
---
description: Structured Code Review Prompt — diffs current branch against parent, contrasts with the OpenSpec change artifacts, and produces openspec/changes/{change-name}/review.md
argument-hint: "[change-name] [optional: parent branch]"
model: claude-sonnet-4-6
effort: high
---

Fetch @commands/sai/sai-5-review.md

User input: $ARGUMENTS
```

- [x] Overwrite `claude/commands/sai-6-security.md` with:

```markdown
---
description: Structured Security Audit Prompt — SAST + SCA on the diff vs parent branch (or full repo / path), produces openspec/changes/{change-name}/security.md
argument-hint: "[change-name] [optional: --full | --path {dir}] [optional: parent branch]"
model: claude-opus-4-7
effort: high
---

Fetch @commands/sai/sai-6-security.md

User input: $ARGUMENTS
```

- [x] Overwrite `claude/commands/sai-7-performance.md` with:

```markdown
---
description: Structured Performance Audit Prompt — backend / frontend / database / queue tiers, diff vs parent branch (or full / path), produces openspec/changes/{change-name}/performance.md
argument-hint: "[change-name] [optional: --full | --path {dir}] [optional: --tier backend|frontend|db|queue] [optional: parent branch]"
model: claude-sonnet-4-6
effort: high
---

Fetch @commands/sai/sai-7-performance.md

User input: $ARGUMENTS
```

- [x] Overwrite `claude/commands/sai-8-accessibility.md` with:

```markdown
---
description: Structured Accessibility Audit Prompt — WCAG 2.2 AA static review (and optional runtime axe/Lighthouse) on UI changes vs parent branch, produces openspec/changes/{change-name}/accessibility.md
argument-hint: "[change-name] [optional: --full | --path {dir}] [optional: --runtime] [optional: parent branch]"
model: claude-sonnet-4-6
effort: high
---

Fetch @commands/sai/sai-8-accessibility.md

User input: $ARGUMENTS
```

- [x] Overwrite `claude/commands/sai-archive.md` with:

```markdown
---
description: Archive a completed change — wraps opsx:archive skill, adds caveman mode. Moves openspec/changes/{name}/ into the archive folder once tasks are done.
argument-hint: "[change-name]"
model: claude-haiku-4-5
---

Fetch @commands/sai/sai-archive.md

User input: $ARGUMENTS
```

- [x] Overwrite `claude/commands/sai-commit.md` with:

```markdown
---
description: Conventional Commits message author from staged changes — generates subject (≤50 chars) and optional body, gates `git commit` behind explicit authorization
argument-hint: "[optional: --scope X --type Y --no-body --amend]"
model: claude-haiku-4-5
---

Fetch @commands/sai/sai-commit.md

User input: $ARGUMENTS
```

- [x] Overwrite `claude/commands/sai-explore.md` with:

```markdown
---
description: Explore mode wrapper — thinking partner for ideas, problems, and requirements. Wraps opsx:explore skill, adds caveman mode. Optionally pass a change name to explore an existing change.
argument-hint: "[optional: change-name or topic]"
model: claude-opus-4-7
effort: high
---

Fetch @commands/sai/sai-explore.md

User input: $ARGUMENTS
```

- [x] Overwrite `claude/commands/sai-pr.md` with:

```markdown
---
description: Pull Request Author — synthesizes title and body from the OpenSpec change artifacts (proposal/design/specs/implementation/review/security/performance/accessibility) and the git diff vs parent branch; saves openspec/changes/{change-name}/pr.md and (with authorization) opens the PR via gh
argument-hint: "[change-name] [optional: parent branch]"
model: claude-haiku-4-5
---

Fetch @commands/sai/sai-pr.md

User input: $ARGUMENTS
```

##### Step 2 Verification Checklist

**Automated (agent runs before stopping):**
- [x] `wc -l claude/commands/sai-*.md | grep -v total | awk '$1 > 10'` — expected: no output (all files ≤10 lines)
- [x] `grep -rl '@instructions/' claude/commands/sai-*.md` — expected: no output
- [x] `grep -rl '@skills/' claude/commands/sai-*.md` — expected: no output
- [x] `grep -L '\$ARGUMENTS' claude/commands/sai-2-design.md` — expected: `claude/commands/sai-2-design.md` (sai-2-design has no $ARGUMENTS)
- [x] `grep -c 'User input: \$ARGUMENTS' claude/commands/sai-commit.md` — expected: `1` (standalone line present)
- [x] `grep -c 'argument-hint' claude/commands/sai-2-design.md` — expected: `1` (field preserved)
- [x] `grep -c 'effort: high' claude/commands/sai-1-spec.md` — expected: `1` (effort field preserved)

*(No Human checks — no UI involved)*

#### Step 2 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. No browser verification required at this step.

---

#### Step 3: Rewrite `opencode/commands/` wrappers (12 files)

*(Non-testable step — file rewrites only)*

> **BOM note:** `opencode/commands/sai-archive.md` carries a UTF-8 BOM (`\xEF\xBB\xBF`). The content block below includes the BOM character (﻿) as the first byte — ensure the file is written with it preserved. All other opencode files have no BOM.

- [x] Overwrite `opencode/commands/sai-1-spec.md` with:

```markdown
---
description: Propose a new change — generates proposal.md and specs/ only. Stops before design. Run /sai-2-design when specs are reviewed and approved.
model: opencode-go/qwen3.6-plus
---

Fetch @commands/sai/sai-1-spec.md

User input: $ARGUMENTS
```

- [x] Overwrite `opencode/commands/sai-2-design.md` with:

```markdown
---
description: Generate design.md and tasks.md for an approved change — gated on specs approval recorded by /sai-1-spec.
model: opencode-go/glm-5.1
---

Fetch @commands/sai/sai-2-design.md
```

- [x] Overwrite `opencode/commands/sai-3-implement.md` with:

```markdown
---
description: Granular implementation plan — reads OpenSpec change artifacts (proposal/design/tasks), writes implementation.md with code, RED→GREEN, STOP & COMMIT markers, to openspec/changes/{name}/implementation.md.
model: opencode-go/kimi-k2.6
---

Fetch @commands/sai/sai-3-implement.md

User input: $ARGUMENTS
```

- [x] Overwrite `opencode/commands/sai-4-apply.md` with:

```markdown
---
description: Apply the granular implementation plan mechanically — reads openspec/changes/{name}/implementation.md and executes step-by-step with a cheap model. Uses openspec CLI for status context.
model: opencode-go/deepseek-v4-flash
---

Fetch @commands/sai/sai-4-apply.md

User input: $ARGUMENTS
```

- [x] Overwrite `opencode/commands/sai-5-review.md` with:

```markdown
---
description: Structured Code Review Prompt — diffs current branch against parent, contrasts with the OpenSpec change artifacts, and produces openspec/changes/{change-name}/review.md
model: opencode-go/qwen3.6-plus
---

Fetch @commands/sai/sai-5-review.md

User input: $ARGUMENTS
```

- [x] Overwrite `opencode/commands/sai-6-security.md` with:

```markdown
---
description: Structured Security Audit Prompt — SAST + SCA on the diff vs parent branch (or full repo / path), produces openspec/changes/{change-name}/security.md
model: opencode-go/qwen3.6-plus
---

Fetch @commands/sai/sai-6-security.md

User input: $ARGUMENTS
```

- [x] Overwrite `opencode/commands/sai-7-performance.md` with:

```markdown
---
description: Structured Performance Audit Prompt — backend / frontend / database / queue tiers, diff vs parent branch (or full / path), produces openspec/changes/{change-name}/performance.md
model: opencode-go/qwen3.6-plus
---

Fetch @commands/sai/sai-7-performance.md

User input: $ARGUMENTS
```

- [x] Overwrite `opencode/commands/sai-8-accessibility.md` with:

```markdown
---
description: Structured Accessibility Audit Prompt — WCAG 2.2 AA static review (and optional runtime axe/Lighthouse) on UI changes vs parent branch, produces openspec/changes/{change-name}/accessibility.md
model: opencode-go/qwen3.6-plus
---

Fetch @commands/sai/sai-8-accessibility.md

User input: $ARGUMENTS
```

- [x] Overwrite `opencode/commands/sai-archive.md` — **must preserve the leading UTF-8 BOM byte (`\xEF\xBB\xBF`)**. Write using a method that preserves binary prefix, e.g.:

```bash
printf '\xef\xbb\xbf' > opencode/commands/sai-archive.md
cat >> opencode/commands/sai-archive.md << 'EOF'
---
description: Archive a completed change — wraps opsx:archive skill, adds caveman mode. Moves openspec/changes/{name}/ into the archive folder once tasks are done.
model: opencode-go/deepseek-v4-flash
---

Fetch @commands/sai/sai-archive.md

User input: $ARGUMENTS
EOF
```

- [x] Overwrite `opencode/commands/sai-commit.md` with:

```markdown
---
description: Conventional Commits message author from staged changes — generates subject (≤50 chars) and optional body, gates `git commit` behind explicit authorization
model: opencode-go/deepseek-v4-flash
---

Fetch @commands/sai/sai-commit.md

User input: $ARGUMENTS
```

- [x] Overwrite `opencode/commands/sai-explore.md` with:

```markdown
---
description: Explore mode wrapper — thinking partner for ideas, problems, and requirements. Wraps opsx:explore skill, adds caveman mode. Optionally pass a change name to explore an existing change.
model: opencode/glm-5.1
---

Fetch @commands/sai/sai-explore.md

User input: $ARGUMENTS
```

- [x] Overwrite `opencode/commands/sai-pr.md` with:

```markdown
---
description: Pull Request Author — synthesizes title and body from the OpenSpec change artifacts (proposal/design/specs/implementation/review/security/performance/accessibility) and the git diff vs parent branch; saves openspec/changes/{change-name}/pr.md and (with authorization) opens the PR via gh
model: opencode-go/deepseek-v4-flash
---

Fetch @commands/sai/sai-pr.md

User input: $ARGUMENTS
```

##### Step 3 Verification Checklist

**Automated (agent runs before stopping):**
- [x] `wc -l opencode/commands/sai-*.md | grep -v total | awk '$1 > 10'` — expected: no output (all files ≤10 lines)
- [x] `grep -rl '@instructions/' opencode/commands/sai-*.md` — expected: no output
- [x] `grep -rl '@skills/' opencode/commands/sai-*.md` — expected: no output
- [x] `grep -L '\$ARGUMENTS' opencode/commands/sai-2-design.md` — expected: `opencode/commands/sai-2-design.md`
- [x] `xxd opencode/commands/sai-archive.md | head -1 | grep -c 'efbb bf'` — expected: `1` (BOM preserved)
- [x] `grep -c 'argument-hint\|effort:' opencode/commands/sai-1-spec.md` — expected: `0` (Claude-only fields absent)
- [x] `grep -c 'opencode-go/qwen3.6-plus' opencode/commands/sai-1-spec.md` — expected: `1` (original model preserved)
- [x] `grep -c 'opencode-go/glm-5.1' opencode/commands/sai-2-design.md` — expected: `1`
- [x] `grep -c 'opencode-go/kimi-k2.6' opencode/commands/sai-3-implement.md` — expected: `1`
- [x] `grep -c 'opencode/glm-5.1' opencode/commands/sai-explore.md` — expected: `1`

*(No Human checks — no UI involved)*

#### Step 3 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. No browser verification required at this step.

---

#### Step 4: Update `INSTALL.claude.md` with `commands/sai/` copy step

*(Non-testable step — documentation edit only)*

- [x] In `INSTALL.claude.md`, insert two lines after the `cp claude/commands/*.md ~/.claude/commands/` line (line 34) in the **bash block**. The result should be:

```bash
mkdir -p ~/.claude/commands
cp claude/commands/*.md ~/.claude/commands/
mkdir -p ~/.claude/commands/sai
cp commands/sai/*.md ~/.claude/commands/sai/
```

- [x] In the same file, insert two lines after the `Copy-Item claude\commands\*.md "$env:USERPROFILE\.claude\commands\"` line (line 61) in the **PowerShell block**. The result should be:

```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.claude\commands"
Copy-Item claude\commands\*.md "$env:USERPROFILE\.claude\commands\"
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.claude\commands\sai"
Copy-Item commands\sai\*.md "$env:USERPROFILE\.claude\commands\sai\"
```

##### Step 4 Verification Checklist

**Automated (agent runs before stopping):**
- [x] `grep -c 'commands/sai' INSTALL.claude.md` — expected: `4` (two bash lines + two powershell lines)
- [x] `grep -A1 'cp claude/commands/\*\.md' INSTALL.claude.md | grep -c 'commands/sai'` — expected: `1` (bash sai step is adjacent to commands step)
- [x] `grep -A1 'Copy-Item claude\\\\commands\\\\' INSTALL.claude.md | grep -c 'commands\\\\sai'` — expected: `1` (PS sai step is adjacent)

*(No Human checks — no UI involved)*

#### Step 4 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. No browser verification required at this step.

---

#### Step 5: Update `README.md` with `commands/sai/` copy steps

*(Non-testable step — documentation edit only)*

- [ ] In `README.md`, insert two lines after the `cp opencode/commands/*.md ~/.config/opencode/commands/` line (line 237) in the **OpenCode bash block**. The result should be:

```bash
mkdir -p ~/.config/opencode/commands
cp opencode/commands/*.md ~/.config/opencode/commands/
mkdir -p ~/.config/opencode/commands/sai
cp commands/sai/*.md ~/.config/opencode/commands/sai/
```

- [ ] In `README.md`, insert two lines after the `Copy-Item opencode\commands\*.md "$configDir\commands\"` line (line 284) in the **OpenCode PowerShell block**. The result should be:

```powershell
New-Item -ItemType Directory -Force -Path "$configDir\commands"
Copy-Item opencode\commands\*.md "$configDir\commands\"
New-Item -ItemType Directory -Force -Path "$configDir\commands\sai"
Copy-Item commands\sai\*.md "$configDir\commands\sai\"
```

##### Step 5 Verification Checklist

**Automated (agent runs before stopping):**
- [ ] `grep -c 'commands/sai\|commands\\\\sai' README.md` — expected: `4` (bash mkdir + bash cp + ps mkdir + ps cp)
- [ ] `grep -A1 'cp opencode/commands/\*\.md' README.md | grep -c 'commands/sai'` — expected: `1` (bash sai step adjacent)
- [ ] `grep -A1 'Copy-Item opencode\\\\commands\\\\' README.md | grep -c 'commands\\\\sai'` — expected: `1` (PS sai step adjacent)
- [ ] `grep -c 'commands/sai/\*\.md' README.md` — expected: `2` (source path `commands/sai/*.md`, not `opencode/commands/sai/`)

*(No Human checks — no UI involved)*

#### Step 5 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. No browser verification required at this step.
