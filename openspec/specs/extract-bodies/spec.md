# Spec: extract-bodies

## What

Create `commands/sai/` directory at project root. For each of the 12 sai-* commands, create `commands/sai/<cmd>.md` containing the current command body verbatim, with `$ARGUMENTS` removed.

## Files Produced

| Source (either harness) | Output |
|---|---|
| sai-1-spec.md | commands/sai/sai-1-spec.md |
| sai-2-design.md | commands/sai/sai-2-design.md |
| sai-3-implement.md | commands/sai/sai-3-implement.md |
| sai-4-apply.md | commands/sai/sai-4-apply.md |
| sai-5-review.md | commands/sai/sai-5-review.md |
| sai-6-security.md | commands/sai/sai-6-security.md |
| sai-7-performance.md | commands/sai/sai-7-performance.md |
| sai-8-accessibility.md | commands/sai/sai-8-accessibility.md |
| sai-archive.md | commands/sai/sai-archive.md |
| sai-commit.md | commands/sai/sai-commit.md |
| sai-explore.md | commands/sai/sai-explore.md |
| sai-pr.md | commands/sai/sai-pr.md |

## Body Extraction Rules

1. Strip frontmatter (everything between and including `---` delimiters at the top of the file).
2. Strip any line containing `$ARGUMENTS` (including its surrounding context line "User input: $ARGUMENTS").
3. The resulting content is the shared body. Preserve all blank lines and section headers.
4. Source from `claude/commands/` — both harnesses are identical, but claude/ is canonical for body extraction.

## Acceptance Criteria

- `commands/sai/` exists with exactly 12 files.
- No file in `commands/sai/` contains `$ARGUMENTS`.
- No file in `commands/sai/` contains frontmatter (`---` blocks).
- Content matches the current body of the corresponding claude/commands/sai-*.md (minus $ARGUMENTS line).

## Example

Current `claude/commands/sai-archive.md` body:
```
Fetch @instructions/sai/prereqs.md

## Load behaviors (in order)

Fetch @skills/caveman/SKILL.md
Fetch @instructions/sai/archive.md

Then fetch and follow the openspec-archive-change skill at @skills/openspec-archive-change/SKILL.md exactly. User input: $ARGUMENTS

Fetch @instructions/sai/remember.md
```

Extracted `commands/sai/sai-archive.md`:
```
Fetch @instructions/sai/prereqs.md

## Load behaviors (in order)

Fetch @skills/caveman/SKILL.md
Fetch @instructions/sai/archive.md

Then fetch and follow the openspec-archive-change skill at @skills/openspec-archive-change/SKILL.md exactly.

Fetch @instructions/sai/remember.md
```

Note: "User input: $ARGUMENTS" removed; the sentence ending before it is kept intact (trailing period stays).
