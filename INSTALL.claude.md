# Claude Code — Installation

| OS | Destination |
|----|---------|
| Linux / macOS | `~/.claude/commands/` |
| Windows | `%USERPROFILE%\.claude\commands\` |

**Linux / macOS:**
```bash
mkdir -p ~/.claude/commands
cp claude/commands/*.md ~/.claude/commands/

# Copy instructions
if [ -d ~/.claude/instructions ]; then
    echo "Overwriting ~/.claude/instructions/"
fi
mkdir -p ~/.claude/instructions
cp instructions/*.md ~/.claude/instructions/
```

**Windows (PowerShell):**
```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.claude\commands"
Copy-Item claude\commands\*.md "$env:USERPROFILE\.claude\commands\"

# Copy instructions
$instructionsDir = "$env:USERPROFILE\.claude\instructions"
if (Test-Path $instructionsDir) {
    Write-Host "Overwriting $instructionsDir"
}
New-Item -ItemType Directory -Force -Path $instructionsDir | Out-Null
Copy-Item instructions\*.md $instructionsDir\
```
