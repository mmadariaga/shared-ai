# Opencode — Manual Installation

> **Recommended:** Run `npx github:mmadariaga/shared-ai` for automated installation. The steps below are for manual installation only.

## Prerequisites

The pipeline depends on the [OpenSpec](https://github.com/Fission-AI/OpenSpec) CLI for change lifecycle and skill provisioning. Install it once globally, and initialize it inside every project that will use shared-AI:

```bash
# 1. Install OpenSpec CLI (see https://github.com/Fission-AI/OpenSpec for current install instructions)
npm install -g @fission-ai/openspec   # example — check the project README for the canonical command

# 2. In each project where you want to use shared-AI, initialize OpenSpec
cd /path/to/your/project
openspec init --tools opencode
```

`openspec init` scaffolds:
- `openspec/` directory at the project root (where change artifacts live)
- `.opencode/skills/openspec-*/` — the skill files invoked by the `sai-*` wrappers

Shared-AI **does not bundle the OpenSpec skills**; they come from the OpenSpec CLI and are versioned by it.

If you skip this step, the openspec-dependent `sai-*` commands (`sai-explore`, `sai-1-spec`, `sai-2-design`, `sai-3-implement`, `sai-4-apply`, `sai-archive`) will halt with a clear error message.


## Automatic Shared-AI instalation

```bash
npx github:mmadariaga/shared-ai
```

## Manual Shared-AI instalation

| OS | Destination |
|----|---------|
| Linux / macOS | `~/.config/opencode/commands/` |
| Windows | `%USERPROFILE%\.config\opencode\commands\` |

### Linux / macOS

```bash
# Copy commands
mkdir -p ~/.config/opencode/commands
cp commands/opencode/*.md ~/.config/opencode/commands/
mkdir -p ~/.config/opencode/sai/commands
cp sai/commands/*.md ~/.config/opencode/sai/commands/

# Copy instructions
if [ -d ~/.config/opencode/sai/instructions ]; then
    echo "Overwriting ~/.config/opencode/sai/instructions/"
fi
mkdir -p ~/.config/opencode/sai/instructions
cp sai/instructions/*.md ~/.config/opencode/sai/instructions/

# Copy skills (skip if already installed)
if [ ! -f ~/.config/opencode/skills/caveman/SKILL.md ]; then
    mkdir -p ~/.config/opencode/skills/caveman
    cp skills/universal/caveman/SKILL.md ~/.config/opencode/skills/caveman/SKILL.md
fi
mkdir -p ~/.config/opencode/skills/token-efficient-languages
cp skills/universal/token-efficient-languages/SKILL.md ~/.config/opencode/skills/token-efficient-languages/SKILL.md
mkdir -p ~/.config/opencode/skills/budget-explorer
cp skills/opencode/budget-explorer/SKILL.md ~/.config/opencode/skills/budget-explorer/SKILL.md
mkdir -p ~/.config/opencode/skills/budget-executor
cp skills/opencode/budget-executor/SKILL.md ~/.config/opencode/skills/budget-executor/SKILL.md
mkdir -p ~/.config/opencode/skills/budget
cp skills/universal/budget/SKILL.md ~/.config/opencode/skills/budget/SKILL.md
mkdir -p ~/.config/opencode/skills/fetch
cp skills/opencode/fetch/SKILL.md ~/.config/opencode/skills/fetch/SKILL.md

# Copy opencode.json
if [ ! -f ~/.config/opencode/opencode.json ] && [ ! -f ~/.config/opencode/opencode.jsonc ]; then
    cp configs/opencode.jsonc ~/.config/opencode/
else
    echo "~/.config/opencode/opencode.json(c) already exists."
    echo "Ensure it includes the 'agent' section:"
    echo '  "agent": {'
    echo '    "explore": {'
    echo '      "mode": "subagent",'
    echo '      // Set your trusted low-cost model below'
    echo '      "model": "opencode-go/deepseek-v4-flash"'
    echo '    },'
    echo '    "executor": {'
    echo '      "mode": "subagent",'
    echo '      // Set your trusted low-cost model below'
    echo '      "model": "opencode-go/deepseek-v4-flash"'
    echo '    }'
    echo '  }'
fi
```

### Windows (PowerShell)

```powershell
# Copy commands
$configDir = "$env:USERPROFILE\.config\opencode"
New-Item -ItemType Directory -Force -Path "$configDir\commands"
Copy-Item commands\opencode\*.md "$configDir\commands\"
New-Item -ItemType Directory -Force -Path "$configDir\sai\commands"
Copy-Item sai\commands\*.md "$configDir\sai\commands\"

# Copy instructions
$instructionsDir = "$configDir\sai\instructions"
if (Test-Path $instructionsDir) {
    Write-Host "Overwriting $instructionsDir"
}
New-Item -ItemType Directory -Force -Path $instructionsDir | Out-Null
Copy-Item sai\instructions\*.md $instructionsDir\

# Copy skills
if (-not (Test-Path "$configDir\skills\caveman\SKILL.md")) {
    New-Item -ItemType Directory -Force -Path "$configDir\skills\caveman" | Out-Null
    Copy-Item skills\universal\caveman\SKILL.md "$configDir\skills\caveman\SKILL.md"
}
New-Item -ItemType Directory -Force -Path "$configDir\skills\token-efficient-languages" | Out-Null
Copy-Item skills\universal\token-efficient-languages\SKILL.md "$configDir\skills\token-efficient-languages\SKILL.md"
New-Item -ItemType Directory -Force -Path "$configDir\skills\budget-explorer" | Out-Null
Copy-Item skills\opencode\budget-explorer\SKILL.md "$configDir\skills\budget-explorer\SKILL.md"
New-Item -ItemType Directory -Force -Path "$configDir\skills\budget-executor" | Out-Null
Copy-Item skills\opencode\budget-executor\SKILL.md "$configDir\skills\budget-executor\SKILL.md"
New-Item -ItemType Directory -Force -Path "$configDir\skills\budget" | Out-Null
Copy-Item skills\universal\budget\SKILL.md "$configDir\skills\budget\SKILL.md"
New-Item -ItemType Directory -Force -Path "$configDir\skills\fetch" | Out-Null
Copy-Item skills\opencode\fetch\SKILL.md "$configDir\skills\fetch\SKILL.md"

# Copy opencode.json
$jsonPath = Join-Path $configDir "opencode.json"
$jsoncPath = Join-Path $configDir "opencode.jsonc"
if (-not (Test-Path $jsonPath) -and -not (Test-Path $jsoncPath)) {
    Copy-Item configs\opencode.jsonc $configDir\
} else {
    Write-Host "$configDir\opencode.json(c) already exists."
    Write-Host "Ensure it includes the 'agent' section:"
    Write-Host '  "agent": {'
    Write-Host '    "explore": {'
    Write-Host '      "mode": "subagent",'
    Write-Host '      // Set your trusted low-cost model below'
    Write-Host '      "model": "opencode-go/deepseek-v4-flash"'
    Write-Host '    },'
    Write-Host '    "executor": {'
    Write-Host '      "mode": "subagent",'
    Write-Host '      // Set your trusted low-cost model below'
    Write-Host '      "model": "opencode-go/deepseek-v4-flash"'
    Write-Host '    }'
    Write-Host '  }'
}
```

## Post Install

Once installed, modify the models in your commands to adapt them to your subscriptions and personal preferences.

Open `~/.config/opencode/commands/sai-1-spec.md` and `sai-2-design.md` and set your preferred frontier model based on your subscriptions.

To list all models available in your opencode subscriptions, run:

```bash
opencode models
```
