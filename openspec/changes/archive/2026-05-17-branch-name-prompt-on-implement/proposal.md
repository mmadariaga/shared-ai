## Why

`implementation.md`'s Prerequisites section hardcodes the branch name as the change name in kebab-case (e.g. `Create \`my-change\` from \`main\``). Teams using conventions like `feature/JIRA-123-description` must edit every generated `implementation.md` manually after `/sai-3-implement` runs. A prompt at generation time resolves this without forcing any naming convention.

## What Changes

- `~/.claude/commands/sai-3-implement.md` — insert an AskUserQuestion step before plan.md instructions execute; substitute the resolved branch name into implementation.md's Prerequisites
- `~/.config/opencode/commands/sai-3-implement.md` — mirror the same change for the OpenCode harness
- (Optional) write the resolved branch name to `openspec/changes/{name}/.openspec.yaml` under `git.branch` for downstream reuse by `/sai-5-review` and `/sai-pr`

## Capabilities

### New Capabilities

- `sai-implement-branch-prompt`: interactive branch-name question during `/sai-3-implement`; default = change-name; offers "reuse `<current-branch>`" when the agent detects the user is not on main/master; substitutes the resolved name into implementation.md Prerequisites
- `sai-change-git-metadata`: persists the chosen branch under `git.branch` in `openspec/changes/{name}/.openspec.yaml` so downstream commands can reuse it without re-prompting (optional capability)

### Modified Capabilities

(none)

## Impact

- Files changed: `~/.claude/commands/sai-3-implement.md`, `~/.config/opencode/commands/sai-3-implement.md`
- Runtime side-effect: `openspec/changes/{name}/.openspec.yaml` gains a `git.branch` field per change (optional capability only)
- No changes to `/sai-1-spec`, `/sai-2-design`, `/sai-4-apply`, schema files, `plan.md` template, `implement.md` git-authorization gate, or any artifact outside the change directory
