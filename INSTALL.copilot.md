# GitHub Copilot — Installation (Experimental - Not tested yet)

Destination: `%APPDATA%\Code\User\`

**Windows (PowerShell):**
```powershell
New-Item -ItemType Directory -Force -Path "$env:APPDATA\Code\User\prompts"
Copy-Item github\prompts\*.prompt.md "$env:APPDATA\Code\User\prompts\"

# Copy instructions
$instructionsDir = "$env:APPDATA\Code\User\instructions"
if (Test-Path $instructionsDir) {
    Write-Host "Overwriting $instructionsDir"
}
New-Item -ItemType Directory -Force -Path $instructionsDir | Out-Null
Copy-Item instructions\*.md $instructionsDir\
```
