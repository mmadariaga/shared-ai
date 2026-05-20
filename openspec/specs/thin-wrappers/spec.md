# Spec: thin-wrappers

## What

Rewrite `claude/commands/sai-*.md` (12 files) and `opencode/commands/sai-*.md` (12 files) to thin wrappers. Each wrapper retains its existing frontmatter unchanged and replaces the body with a Fetch of the shared body file, followed by an optional user-arguments line.

## Wrapper Template

### Commands with $ARGUMENTS (11 of 12)

```markdown
---
[existing frontmatter unchanged]
---

Fetch @commands/sai/<cmd>.md

User input: $ARGUMENTS
```

### sai-2-design.md (no $ARGUMENTS)

```markdown
---
[existing frontmatter unchanged]
---

Fetch @commands/sai/sai-2-design.md
```

## Frontmatter Preservation Rules

- Copy frontmatter from the current file verbatim — do not add, remove, or reorder fields.
- Claude wrappers keep their `argument-hint` and `effort` fields if present.
- OpenCode wrappers keep their model identifiers unchanged.

## File List

**claude/commands/** (12 files):
sai-1-spec.md, sai-2-design.md, sai-3-implement.md, sai-4-apply.md, sai-5-review.md,
sai-6-security.md, sai-7-performance.md, sai-8-accessibility.md, sai-archive.md,
sai-commit.md, sai-explore.md, sai-pr.md

**opencode/commands/** (12 files): same names

## Acceptance Criteria

- Every wrapper file is ≤10 lines total (frontmatter block + blank line + Fetch line + optional args line).
- No wrapper contains any instruction body content (no Fetch @instructions/..., no Fetch @skills/...).
- `$ARGUMENTS` appears only in wrappers that had it before (i.e., 11 of 12; not in sai-2-design.md).
- The Fetch path format is `@commands/sai/<cmd>.md` where `<cmd>` matches the wrapper filename without extension.

## Example

**claude/commands/sai-archive.md** (before):
```markdown
---
description: Archive a completed change — wraps opsx:archive skill, adds caveman mode. Moves openspec/changes/{name}/ into the archive folder once tasks are done.
argument-hint: "[change-name]"
model: claude-haiku-4-5
---

Fetch @instructions/sai/prereqs.md

## Load behaviors (in order)

Fetch @skills/caveman/SKILL.md
Fetch @instructions/sai/archive.md

Then fetch and follow the openspec-archive-change skill at @skills/openspec-archive-change/SKILL.md exactly. User input: $ARGUMENTS

Fetch @instructions/sai/remember.md
```

**claude/commands/sai-archive.md** (after):
```markdown
---
description: Archive a completed change — wraps opsx:archive skill, adds caveman mode. Moves openspec/changes/{name}/ into the archive folder once tasks are done.
argument-hint: "[change-name]"
model: claude-haiku-4-5
---

Fetch @commands/sai/sai-archive.md

User input: $ARGUMENTS
```
