## Why

The `# Isolation Mode` block is duplicated across 9 `sai/instructions/*.md` files, but isolation is a behavioral concern that belongs at the command body level — vendor wrappers own only model routing. Moving it to `sai/commands/sai-*.md` consolidates the behavior at the correct architectural layer and removes duplication.

## What Changes

- Remove `# Isolation Mode` block (lines 1–5) from 9 `sai/instructions/*.md` files
- Prepend identical `# Isolation Mode` block to the top of 9 corresponding `sai/commands/sai-*.md` body files
- Update AGENTS.md "Isolation Mode" section to reflect the new file location

## Capabilities

### New Capabilities

- `move-isolation-block`: Remove the `# Isolation Mode` block from 9 instruction files and prepend it to the top of the 9 corresponding sai/commands/ body files
- `docs-sync`: Update AGENTS.md "Isolation Mode" section to reference the new location in sai/commands/ files

### Modified Capabilities

*(none)*

## Impact

**Files modified — instruction files (block removed):**
- `sai/instructions/accessibility.md`
- `sai/instructions/apply.md`
- `sai/instructions/commit.md`
- `sai/instructions/design.md`
- `sai/instructions/implement.md`
- `sai/instructions/performance.md`
- `sai/instructions/pr.md`
- `sai/instructions/review.md`
- `sai/instructions/security.md`

**Files modified — command body files (block prepended):**
- `sai/commands/sai-8-accessibility.md`
- `sai/commands/sai-4-apply.md`
- `sai/commands/sai-commit.md`
- `sai/commands/sai-2-design.md`
- `sai/commands/sai-3-implement.md`
- `sai/commands/sai-7-performance.md`
- `sai/commands/sai-pr.md`
- `sai/commands/sai-5-review.md`
- `sai/commands/sai-6-security.md`

**Files modified — docs:**
- `AGENTS.md` (Isolation Mode section, lines 68–77)

**Unchanged:** `sai-explore`, `sai-archive`, vendor wrappers in `commands/{claude,opencode}/`, harness entry files (`$ARGUMENTS` substitution stays there).
