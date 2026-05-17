# Claude Code — Installation

## Prerequisites

The pipeline depends on the [OpenSpec](https://github.com/Fission-AI/OpenSpec) CLI for change lifecycle and skill provisioning. Install it once globally, and initialize it inside every project that will use shared-AI:

```bash
# 1. Install OpenSpec CLI (see https://github.com/Fission-AI/OpenSpec for current install instructions)
npm install -g @fission-ai/openspec   # example — check the project README for the canonical command

# 2. In each project where you want to use shared-AI, initialize OpenSpec
cd /path/to/your/project
openspec init --tools claude
```

`openspec init` scaffolds:
- `openspec/` directory at the project root (where change artifacts live)
- `.claude/skills/openspec-*/` — the skill files invoked by the `ai-*` wrappers

Shared-AI **does not bundle the OpenSpec skills**; they come from the OpenSpec CLI and are versioned by it.

If you skip this step, the openspec-dependent `ai-*` commands (`ai-explore`, `ai-1-spec`, `ai-2-implement`, `ai-3-apply`, `ai-archive`) will halt with a clear error message.

## Install shared-AI commands

| OS | Destination |
|----|---------|
| Linux / macOS | `~/.claude/commands/` |
| Windows | `%USERPROFILE%\.claude\commands\` |

**Linux / macOS:**
```bash
mkdir -p ~/.claude/commands
cp claude/commands/*.md ~/.claude/commands/

# Copy instructions
if [ -d ~/.claude/instructions/sai ]; then
    echo "Overwriting ~/.claude/instructions/sai/"
fi
mkdir -p ~/.claude/instructions/sai
cp instructions/sai/*.md ~/.claude/instructions/sai/

echo "Reminder: run 'openspec init --tools claude' in each project to enable the spec/explore/apply/archive commands."
```

**Windows (PowerShell):**
```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.claude\commands"
Copy-Item claude\commands\*.md "$env:USERPROFILE\.claude\commands\"

# Copy instructions
$instructionsDir = "$env:USERPROFILE\.claude\instructions\sai"
if (Test-Path $instructionsDir) {
    Write-Host "Overwriting $instructionsDir"
}
New-Item -ItemType Directory -Force -Path $instructionsDir | Out-Null
Copy-Item instructions\sai\*.md $instructionsDir\

Write-Host "Reminder: run 'openspec init --tools claude' in each project to enable the spec/explore/apply/archive commands."
```
