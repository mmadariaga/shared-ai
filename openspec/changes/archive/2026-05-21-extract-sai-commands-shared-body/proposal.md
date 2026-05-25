---
id: extract-sai-commands-shared-body
status: proposed
---

# Extract sai-* Command Bodies to Shared Location

## Problem

After the imports rework, the bodies of all 12 sai-* commands are identical between the `claude/commands/` and `opencode/commands/` harnesses — only frontmatter (model, argument-hint, effort) differs. Editing any command today requires touching two files; forgetting one causes silent drift.

## Proposed Change

Extract the shared body of each sai-* command to `commands/sai/<cmd>.md`. Reduce both harness files to thin wrappers: harness-specific frontmatter + `Fetch @commands/sai/<cmd>.md` + user arguments line.

Update installation documentation to include the new `commands/sai/` directory in the copy steps for both Claude Code and OpenCode.

## Capabilities

- **extract-bodies**: Create `commands/sai/sai-*.md` (12 files) containing the command body, stripped of `$ARGUMENTS`
- **thin-wrappers**: Rewrite `claude/commands/sai-*.md` and `opencode/commands/sai-*.md` (24 files) to frontmatter + Fetch + optional args line
- **update-install-docs**: Add `commands/sai/` copy step to `INSTALL.claude.md` and `README.md`

## Constraints

- `budget.md` excluded — body genuinely diverges (skill paths differ per harness)
- `$ARGUMENTS` interpolation stays in the wrapper (entry file), not in the shared body
- `sai-2-design.md` has no `$ARGUMENTS` — its wrapper omits the "User input:" line
- Shared body files must be installed to harness-specific locations (`~/.claude/commands/sai/` and `~/.config/opencode/commands/sai/`)

## Success Criteria

- Each sai-* body exists exactly once, in `commands/sai/`
- Both harness wrapper files are ≤6 lines (frontmatter + blank + Fetch line + optional args line)
- `make install` / manual install steps copy `commands/sai/*.md` to correct harness destinations
- Behavior of all 12 commands is unchanged after the refactor

## Out of Scope

- `budget.md` — diverging body, excluded by design
- Changes to skill files or instruction files
- Automation of the install process beyond updating existing documentation
