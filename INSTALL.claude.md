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
cp commands/claude/*.md ~/.claude/commands/
mkdir -p ~/.claude/sai/commands
cp sai/commands/*.md ~/.claude/sai/commands/

# Copy instructions
if [ -d ~/.claude/sai/instructions ]; then
    echo "Overwriting ~/.claude/sai/instructions/"
fi
mkdir -p ~/.claude/sai/instructions
cp sai/instructions/*.md ~/.claude/sai/instructions/

# Copy skills (skip if already installed)
if [ ! -f ~/.claude/skills/caveman/SKILL.md ]; then
    mkdir -p ~/.claude/skills/caveman
    cp skills/universal/caveman/SKILL.md ~/.claude/skills/caveman/SKILL.md
fi
mkdir -p ~/.claude/skills/token-efficient-languages
cp skills/universal/token-efficient-languages/SKILL.md ~/.claude/skills/token-efficient-languages/SKILL.md
mkdir -p ~/.claude/skills/budget-explorer
cp skills/claude/budget-explorer/SKILL.md ~/.claude/skills/budget-explorer/SKILL.md
mkdir -p ~/.claude/skills/budget-executor
cp skills/claude/budget-executor/SKILL.md ~/.claude/skills/budget-executor/SKILL.md
mkdir -p ~/.claude/skills/fetch
cp skills/claude/fetch/SKILL.md ~/.claude/skills/fetch/SKILL.md

echo "Reminder: run 'openspec init --tools claude' in each project to enable the spec/explore/apply/archive commands."
```

**Windows (PowerShell):**
```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.claude\commands"
Copy-Item commands\claude\*.md "$env:USERPROFILE\.claude\commands\"
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.claude\sai\commands"
Copy-Item sai\commands\*.md "$env:USERPROFILE\.claude\sai\commands\"

# Copy instructions
$instructionsDir = "$env:USERPROFILE\.claude\sai\instructions"
if (Test-Path $instructionsDir) {
    Write-Host "Overwriting $instructionsDir"
}
New-Item -ItemType Directory -Force -Path $instructionsDir | Out-Null
Copy-Item sai\instructions\*.md $instructionsDir\

# Copy skills
if (-not (Test-Path "$env:USERPROFILE\.claude\skills\caveman\SKILL.md")) {
    New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.claude\skills\caveman" | Out-Null
    Copy-Item skills\universal\caveman\SKILL.md "$env:USERPROFILE\.claude\skills\caveman\SKILL.md"
}
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.claude\skills\token-efficient-languages" | Out-Null
Copy-Item skills\universal\token-efficient-languages\SKILL.md "$env:USERPROFILE\.claude\skills\token-efficient-languages\SKILL.md"
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.claude\skills\budget-explorer" | Out-Null
Copy-Item skills\claude\budget-explorer\SKILL.md "$env:USERPROFILE\.claude\skills\budget-explorer\SKILL.md"
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.claude\skills\budget-executor" | Out-Null
Copy-Item skills\claude\budget-executor\SKILL.md "$env:USERPROFILE\.claude\skills\budget-executor\SKILL.md"
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.claude\skills\fetch" | Out-Null
Copy-Item skills\claude\fetch\SKILL.md "$env:USERPROFILE\.claude\skills\fetch\SKILL.md"

Write-Host "Reminder: run 'openspec init --tools claude' in each project to enable the spec/explore/apply/archive commands."
```
