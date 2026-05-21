# Spec: extract-bodies

## What

Create `sai/commands/` directory at project root. For each of the 12 sai-* commands, create `sai/commands/<cmd>.md` containing the current command body verbatim, with `$ARGUMENTS` removed.

## Files Produced

| Source (either harness) | Output |
|---|---|
| sai-1-spec.md | sai/commands/sai-1-spec.md |
| sai-2-design.md | sai/commands/sai-2-design.md |
| sai-3-implement.md | sai/commands/sai-3-implement.md |
| sai-4-apply.md | sai/commands/sai-4-apply.md |
| sai-5-review.md | sai/commands/sai-5-review.md |
| sai-6-security.md | sai/commands/sai-6-security.md |
| sai-7-performance.md | sai/commands/sai-7-performance.md |
| sai-8-accessibility.md | sai/commands/sai-8-accessibility.md |
| sai-archive.md | sai/commands/sai-archive.md |
| sai-commit.md | sai/commands/sai-commit.md |
| sai-explore.md | sai/commands/sai-explore.md |
| sai-pr.md | sai/commands/sai-pr.md |

## Body Extraction Rules

1. Strip frontmatter (everything between and including `---` delimiters at the top of the file).
2. Strip any line containing `$ARGUMENTS` (including its surrounding context line "User input: $ARGUMENTS").
3. The resulting content is the shared body. Preserve all blank lines and section headers.
4. Source from `commands/claude/` — both harnesses are identical, but commands/claude/ is canonical for body extraction.

## Acceptance Criteria

- `sai/commands/` exists with exactly 12 files.
- No file in `sai/commands/` contains `$ARGUMENTS`.
- No file in `sai/commands/` contains frontmatter (`---` blocks).
- Content matches the current body of the corresponding commands/claude/sai-*.md (minus $ARGUMENTS line).

## Example

Current `commands/claude/sai-archive.md` body:
```
Fetch @sai/instructions/prereqs.md

## Load behaviors (in order)

Fetch @skills/caveman/SKILL.md
Fetch @instructions/sai/archive.md

Then fetch and follow the openspec-archive-change skill at @skills/openspec-archive-change/SKILL.md exactly. User input: $ARGUMENTS

Fetch @instructions/sai/remember.md
```

Extracted `sai/commands/sai-archive.md`:
```
Fetch @sai/instructions/prereqs.md

## Load behaviors (in order)

Fetch @skills/caveman/SKILL.md
Fetch @sai/instructions/archive.md

Then fetch and follow the openspec-archive-change skill at @skills/openspec-archive-change/SKILL.md exactly.

Fetch @sai/instructions/remember.md
```

Note: "User input: $ARGUMENTS" removed; the sentence ending before it is kept intact (trailing period stays).
