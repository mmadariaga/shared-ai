# Spec: update-install-docs

## What

Add `commands/sai/` copy steps to `INSTALL.claude.md` and `README.md` so that the new shared body files are installed alongside the harness-specific wrappers.

## Install Targets

| Harness | Source | Destination |
|---|---|---|
| Claude Code | `commands/sai/*.md` | `~/.claude/commands/sai/` |
| OpenCode | `commands/sai/*.md` | `~/.config/opencode/commands/sai/` |

## Changes Required

### INSTALL.claude.md

Add a step that creates `~/.claude/commands/sai/` and copies `commands/sai/*.md` into it. Insert this step near the existing `claude/commands/*.md` copy step, so the install sequence stays logically grouped (all commands together).

Bash snippet to add:
```bash
mkdir -p ~/.claude/commands/sai
cp commands/sai/*.md ~/.claude/commands/sai/
```

### README.md

The README contains two install sections: bash and PowerShell. Update both.

**Bash section** — add near the `opencode/commands/*.md` copy step:
```bash
mkdir -p ~/.config/opencode/commands/sai
cp commands/sai/*.md ~/.config/opencode/commands/sai/
```

**PowerShell section** — add equivalent:
```powershell
New-Item -ItemType Directory -Force -Path "$env:APPDATA\OpenCode\commands\sai"
Copy-Item -Path "commands\sai\*.md" -Destination "$env:APPDATA\OpenCode\commands\sai\"
```

## Notes

- `commands/sai/` files are harness-agnostic; the same source directory installs to both harnesses.
- The Fetch runtime resolves `@commands/sai/<cmd>.md` relative to the harness config root (`~/.claude/` or `~/.config/opencode/`), so the destination must be `commands/sai/` under that root.
- No changes needed to skill copy steps — only `commands/sai/` is new.

## Acceptance Criteria

- `INSTALL.claude.md` includes a `commands/sai/` mkdir + cp step.
- `README.md` bash section includes `commands/sai/` mkdir + cp step.
- `README.md` PowerShell section includes equivalent step.
- All copy steps reference the same source: `commands/sai/*.md`.
