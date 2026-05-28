# Claude Code — Installation

## Prerequisites

The pipeline depends on the [OpenSpec](https://github.com/Fission-AI/OpenSpec) CLI for change lifecycle and skill provisioning. Install it once globally:

```bash
# Install OpenSpec CLI (see https://github.com/Fission-AI/OpenSpec for current install instructions)
npm install -g @fission-ai/openspec   # example — check the project README for the canonical command
```

Shared-AI **does not bundle the OpenSpec skills**; they come from the OpenSpec CLI and are versioned by it.

If you skip this step, the `sai-*` commands will halt with a clear error message.

## Automatic installation (recommended)

```bash
# 1. Install shared-AI commands globally
npx github:mmadariaga/shared-ai

# 2. In each project where you want to use shared-AI:
npx github:mmadariaga/shared-ai setup /path/to/your/project
```

Step 1 copies all commands and skills to `~/.claude/`. Step 2 verifies the openspec CLI, runs `openspec init --tools claude` if needed, sets `schema: sai-workflow` in `openspec/config.yaml`, and copies the schema templates into the project.

## Manual installation

| OS | Destination |
|----|---------|
| Linux / macOS | `~/.claude/commands/` |
| Windows | `%USERPROFILE%\.claude\commands\` |

### Linux / macOS
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

mkdir -p ~/.claude/skills/token-efficient-languages
cp skills/universal/token-efficient-languages/SKILL.md ~/.claude/skills/token-efficient-languages/SKILL.md
mkdir -p ~/.claude/skills/budget-explorer
cp skills/claude/budget-explorer/SKILL.md ~/.claude/skills/budget-explorer/SKILL.md
mkdir -p ~/.claude/skills/budget-executor
cp skills/claude/budget-executor/SKILL.md ~/.claude/skills/budget-executor/SKILL.md
mkdir -p ~/.claude/skills/budget-subagent
cp skills/claude/budget-subagent/SKILL.md ~/.claude/skills/budget-subagent/SKILL.md
mkdir -p ~/.claude/skills/budget
cp skills/universal/budget/SKILL.md ~/.claude/skills/budget/SKILL.md
mkdir -p ~/.claude/skills/fetch
cp skills/claude/fetch/SKILL.md ~/.claude/skills/fetch/SKILL.md
mkdir -p ~/.claude/skills/sai-commands
cp skills/universal/sai-commands/SKILL.md ~/.claude/skills/sai-commands/SKILL.md
```

### Windows (PowerShell)
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
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.claude\skills\token-efficient-languages" | Out-Null
Copy-Item skills\universal\token-efficient-languages\SKILL.md "$env:USERPROFILE\.claude\skills\token-efficient-languages\SKILL.md"
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.claude\skills\budget-explorer" | Out-Null
Copy-Item skills\claude\budget-explorer\SKILL.md "$env:USERPROFILE\.claude\skills\budget-explorer\SKILL.md"
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.claude\skills\budget-executor" | Out-Null
Copy-Item skills\claude\budget-executor\SKILL.md "$env:USERPROFILE\.claude\skills\budget-executor\SKILL.md"
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.claude\skills\budget-subagent" | Out-Null
Copy-Item skills\claude\budget-subagent\SKILL.md "$env:USERPROFILE\.claude\skills\budget-subagent\SKILL.md"
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.claude\skills\budget" | Out-Null
Copy-Item skills\universal\budget\SKILL.md "$env:USERPROFILE\.claude\skills\budget\SKILL.md"
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.claude\skills\fetch" | Out-Null
Copy-Item skills\claude\fetch\SKILL.md "$env:USERPROFILE\.claude\skills\fetch\SKILL.md"
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.claude\skills\sai-commands" | Out-Null
Copy-Item skills\universal\sai-commands\SKILL.md "$env:USERPROFILE\.claude\skills\sai-commands\SKILL.md"
```

### Post-install

After the files are in place, in each project where you want to use shared-AI:

```bash
# 1. Initialize OpenSpec for Claude Code
openspec init --tools claude

# 2. Copy the SAI workflow schema templates into the project
cp -r openspec/schemas/sai-workflow /path/to/your/project/openspec/schemas/

# 3. Edit openspec/config.yaml in your project and set:
#    schema: sai-workflow
```
