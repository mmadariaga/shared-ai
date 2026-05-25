## Why

The 3-rule language contract (reason in English / respond in user's language / artifacts in English) is duplicated verbatim in 9 `instructions/sai/*.md` files (~80 lines). Consolidating into a universal skill gives it a single source of truth, removes the drift risk, and aligns it with the existing cost-efficiency skill family (`budget-explorer`, `budget-executor`).

## What Changes

- Add `skills/universal/token-efficient-languages/SKILL.md` — universal skill carrying the 3-rule contract
- Replace the `Language:` block in each of the 9 `instructions/sai/*.md` files with `Fetch skills/universal/token-efficient-languages/SKILL.md`
- Add `claude/commands/token-efficient-languages.md` — dedicated slash command for Claude Code
- Add `opencode/commands/token-efficient-languages.md` — dedicated slash command for OpenCode
- Update `claude/commands/budget.md` and `opencode/commands/budget.md` to also load the new skill
- Add skill copy step for `token-efficient-languages` to `README.md` (bash + PowerShell) and `INSTALL.claude.md`

## Capabilities

### New Capabilities

- `token-efficient-languages-skill`: Universal SKILL.md at `skills/universal/token-efficient-languages/SKILL.md` encoding the 3-rule language contract
- `token-efficient-languages-commands`: Dedicated `/token-efficient-languages` command files for Claude Code and OpenCode

### Modified Capabilities

- `sai-instructions-dedup`: Replace inline `Language:` blocks in 9 `instructions/sai/*.md` files with a `Fetch` pointer to the new skill
- `budget-command-update`: Both platform budget.md command files load `token-efficient-languages` alongside `budget-explorer` and `budget-executor`
- `install-scripts-update`: Bash + PowerShell sections of `README.md` and `INSTALL.claude.md` gain a copy step for the new skill

## Impact

- New files: `skills/universal/token-efficient-languages/SKILL.md`, `claude/commands/token-efficient-languages.md`, `opencode/commands/token-efficient-languages.md`
- Modified files: `instructions/sai/accessibility.md`, `instructions/sai/apply.md`, `instructions/sai/commit.md`, `instructions/sai/implement.md`, `instructions/sai/performance.md`, `instructions/sai/pr.md`, `instructions/sai/review.md`, `instructions/sai/security.md`, `instructions/sai/spec.propose.md`, `claude/commands/budget.md`, `opencode/commands/budget.md`, `README.md`, `INSTALL.claude.md`
- No behavior change — same rule, same semantics
- `instructions/sai/remember.md` line 3 unchanged (already a 1-line pointer; no full rule to replace)
