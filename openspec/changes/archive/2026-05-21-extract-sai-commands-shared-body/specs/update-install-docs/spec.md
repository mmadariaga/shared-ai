# Spec: update-install-docs

## What

Add `sai/commands/` copy steps to `INSTALL.claude.md` and `README.md` so that the new shared body files are installed alongside the harness-specific wrappers.

## Install Targets

| Harness | Source | Destination |
|---|---|---|
| Claude Code | `sai/commands/*.md` | `~/.claude/sai/commands/` |
| OpenCode | `sai/commands/*.md` | `~/.config/opencode/sai/commands/` |

## Changes Required

### INSTALL.claude.md

Add a step that creates `~/.claude/sai/commands/` and copies `sai/commands/*.md` into it. Insert this step near the existing `commands/claude/*.md` copy step, so the install sequence stays logically grouped (all commands together).

Bash snippet to add:
```bash
mkdir -p ~/.claude/sai/commands
cp sai/commands/*.md ~/.claude/sai/commands/
```

### README.md

The README contains two install sections: bash and PowerShell. Update both.

**Bash section** — add near the `commands/opencode/*.md` copy step:
```bash
mkdir -p ~/.config/opencode/sai/commands
cp sai/commands/*.md ~/.config/opencode/sai/commands/
```

**PowerShell section** — add equivalent:
```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.config\opencode\sai\commands"
Copy-Item -Path "sai\commands\*.md" -Destination "$env:USERPROFILE\.config\opencode\sai\commands\"
```

## Notes

- `sai/commands/` files are harness-agnostic; the same source directory installs to both harnesses.
- The Fetch runtime resolves `@sai/commands/<cmd>.md` relative to the harness config root (`~/.claude/` or `~/.config/opencode/`), so the destination must be `sai/commands/` under that root.
- No changes needed to skill copy steps — only `sai/commands/` is new.

## Acceptance Criteria

- `INSTALL.claude.md` includes a `sai/commands/` mkdir + cp step.
- `README.md` bash section includes `sai/commands/` mkdir + cp step.
- `README.md` PowerShell section includes equivalent step.
- All copy steps reference the same source: `sai/commands/*.md`.
