# GitHub Copilot (VS Code) — Installation

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

Step 1 copies all commands and skills to the VS Code user prompts folder and `~/.copilot/skills/`. Step 2 verifies the openspec CLI, runs `openspec init --tools copilot` if needed, sets `schema: sai-workflow` in `openspec/config.yaml`, and copies the schema templates into the project.

## Manual installation

Prompt files live in your VS Code user data folder under `prompts/`. SAI commands and instructions live under `sai/` (sibling to `prompts/`). Skills live under `~/.copilot/skills/`.

| OS | User prompts folder | SAI folder | Skills folder |
|----|---------------------|------------|---------------|
| Linux / macOS | `~/.config/Code/User/prompts/` | `~/.config/Code/User/sai/` | `~/.copilot/skills/` |
| Windows | `%APPDATA%\Code\User\prompts\` | `%APPDATA%\Code\User\sai\` | `%USERPROFILE%\.copilot\skills\` |

> **VS Code profile:** If you use a non-default VS Code profile, replace `Code` with `Code - <profile name>` in the paths above.

### Linux / macOS

```bash
PROMPTS_DIR="$HOME/.config/Code/User/prompts"
SAI_DIR="$HOME/.config/Code/User/sai"
SKILLS_DIR="$HOME/.copilot/skills"
AGENTS_DIR="$HOME/.copilot/agents"

# Copy prompt files (user-global slash commands)
mkdir -p "$PROMPTS_DIR"
cp commands/copilot/*.prompt.md "$PROMPTS_DIR/"

# Copy sai command bodies
mkdir -p "$SAI_DIR/commands"
cp sai/commands/*.md "$SAI_DIR/commands/"

# Copy instructions
if [ -d "$SAI_DIR/instructions" ]; then
    echo "Overwriting $SAI_DIR/instructions/"
fi
mkdir -p "$SAI_DIR/instructions"
cp -r sai/instructions/. "$SAI_DIR/instructions/"

# Copy skills
mkdir -p "$SKILLS_DIR/fetch"
cp skills/copilot/fetch/SKILL.md "$SKILLS_DIR/fetch/SKILL.md"
mkdir -p "$SKILLS_DIR/token-efficient-languages"
cp skills/universal/token-efficient-languages/SKILL.md "$SKILLS_DIR/token-efficient-languages/SKILL.md"
mkdir -p "$SKILLS_DIR/budget"
cp skills/universal/budget/SKILL.md "$SKILLS_DIR/budget/SKILL.md"
mkdir -p "$SKILLS_DIR/budget-explorer"
cp skills/copilot/budget-explorer/SKILL.md "$SKILLS_DIR/budget-explorer/SKILL.md"
mkdir -p "$SKILLS_DIR/budget-executor"
cp skills/copilot/budget-executor/SKILL.md "$SKILLS_DIR/budget-executor/SKILL.md"
mkdir -p "$SKILLS_DIR/budget-subagent"
cp skills/copilot/budget-subagent/SKILL.md "$SKILLS_DIR/budget-subagent/SKILL.md"
mkdir -p "$SKILLS_DIR/sai-commands"
cp skills/universal/sai-commands/SKILL.md "$SKILLS_DIR/sai-commands/SKILL.md"
mkdir -p "$SKILLS_DIR/safe-operations"
cp skills/universal/safe-operations/SKILL.md "$SKILLS_DIR/safe-operations/SKILL.md"

# Copy budget subagents (user-global custom agents)
mkdir -p "$AGENTS_DIR"
cp agents/copilot/*.agent.md "$AGENTS_DIR/"
```

### Windows (PowerShell)

```powershell
$promptsDir = "$env:APPDATA\Code\User\prompts"
$saiDir     = "$env:APPDATA\Code\User\sai"
$skillsDir  = "$env:USERPROFILE\.copilot\skills"
$agentsDir  = "$env:USERPROFILE\.copilot\agents"

# Copy prompt files (user-global slash commands)
New-Item -ItemType Directory -Force -Path $promptsDir | Out-Null
Copy-Item commands\copilot\*.prompt.md "$promptsDir\"

# Copy sai command bodies
New-Item -ItemType Directory -Force -Path "$saiDir\commands" | Out-Null
Copy-Item sai\commands\*.md "$saiDir\commands\"

# Copy instructions
$instructionsDir = "$saiDir\instructions"
if (Test-Path $instructionsDir) {
    Write-Host "Overwriting $instructionsDir"
}
New-Item -ItemType Directory -Force -Path $instructionsDir | Out-Null
Copy-Item sai\instructions\* $instructionsDir -Recurse -Force

# Copy skills
New-Item -ItemType Directory -Force -Path "$skillsDir\fetch" | Out-Null
Copy-Item skills\copilot\fetch\SKILL.md "$skillsDir\fetch\SKILL.md"
New-Item -ItemType Directory -Force -Path "$skillsDir\token-efficient-languages" | Out-Null
Copy-Item skills\universal\token-efficient-languages\SKILL.md "$skillsDir\token-efficient-languages\SKILL.md"
New-Item -ItemType Directory -Force -Path "$skillsDir\budget" | Out-Null
Copy-Item skills\universal\budget\SKILL.md "$skillsDir\budget\SKILL.md"
New-Item -ItemType Directory -Force -Path "$skillsDir\budget-explorer" | Out-Null
Copy-Item skills\copilot\budget-explorer\SKILL.md "$skillsDir\budget-explorer\SKILL.md"
New-Item -ItemType Directory -Force -Path "$skillsDir\budget-executor" | Out-Null
Copy-Item skills\copilot\budget-executor\SKILL.md "$skillsDir\budget-executor\SKILL.md"
New-Item -ItemType Directory -Force -Path "$skillsDir\budget-subagent" | Out-Null
Copy-Item skills\copilot\budget-subagent\SKILL.md "$skillsDir\budget-subagent\SKILL.md"
New-Item -ItemType Directory -Force -Path "$skillsDir\sai-commands" | Out-Null
Copy-Item skills\universal\sai-commands\SKILL.md "$skillsDir\sai-commands\SKILL.md"
New-Item -ItemType Directory -Force -Path "$skillsDir\safe-operations" | Out-Null
Copy-Item skills\universal\safe-operations\SKILL.md "$skillsDir\safe-operations\SKILL.md"

# Copy budget subagents (user-global custom agents)
New-Item -ItemType Directory -Force -Path $agentsDir | Out-Null
Copy-Item agents\copilot\*.agent.md "$agentsDir\"
```

### Post-install

After the files are in place, in each project where you want to use shared-AI:

```bash
# 1. Initialize OpenSpec for Copilot
openspec init --tools copilot

# 2. Copy the SAI workflow schema templates into the project
cp -r openspec/schemas/sai-workflow /path/to/your/project/openspec/schemas/

# 3. Edit openspec/config.yaml in your project and set:
#    schema: sai-workflow
```

## Using the commands

Once installed, type `/` in the GitHub Copilot chat to see all `sai-*` commands. Run each one in **agent mode** — the commands are configured with `agent: agent` in their frontmatter so Copilot will automatically use the right mode.

> **Open a new chat between commands.** Each phase uses Isolation Mode: it ignores prior conversation and reads only its required artifacts. A fresh chat keeps token costs low and ensures clean, replicable context.

## Customizing models

The default models are set in each `.prompt.md` file. To customize them for a specific project, copy the relevant prompt files into your project's `.github/prompts/` directory (a discovered workspace prompt scope) and edit the `model` field:

```bash
cp "$PROMPTS_DIR/sai-1-spec.prompt.md" .github/prompts/
# Then edit .github/prompts/sai-1-spec.prompt.md and change the model field
```

> **⚠️ VS Code prompt files do NOT support name-based override.** Unlike Claude Code (`~/.claude/commands/` vs `.claude/commands/`) and opencode (`~/.config/opencode/commands/` vs `.opencode/commands/`), where a project-local command with the same filename silently shadows the user-global one, VS Code discovers `.github/prompts/` and the user `prompts/` folder as two independent scopes. A prompt file placed in `.github/prompts/` with the same name as a user-global one does **not** take precedence over it — both are discoverable as separate prompts (distinguished only by their source tooltip in `Chat: Configure Prompt Files`). This is a limitation of VS Code's prompt-file discovery model, not of shared-AI.
>
> **Workarounds for VS Code:**
> 1. **Renamed variant** (recommended) — copy the wrapper into `.github/prompts/` under a new filename (e.g. `sai-1-spec-gpt5.prompt.md`) and set `name:` frontmatter or just invoke it as `/sai-1-spec-local`. The user-global `/sai-1-spec` stays untouched.
> 2. **Edit-in-place** — modify the file directly under `%APPDATA%\Code\User\prompts\`. Reinstalls and updates will overwrite these edits; commit them to a fork of shared-AI for persistence.
> 3. **Remove the global** — delete (or rename) the matching file from `%APPDATA%\Code\User\prompts\` so only the `.github/prompts/` copy remains in scope.

## Notes

- **Skills installed by `openspec init`** — OpenSpec installs project-level skills (e.g., `openspec-propose`, `openspec-explore`) into `.github/skills/`. These are loaded automatically by the `sai-*` commands via the `Fetch @skills/<name>/SKILL.md` pattern.
- **Budget subagents** — `budget-explorer`, `budget-executor`, and `budget-subagent` are installed as user-global custom agents (`~/.copilot/agents/`). They are hidden from the agent picker (`user-invocable: false`) and are only invoked programmatically by the main agent when the `budget` skill is active.

## Uninstall

To remove all shared-AI files from VS Code's user data folder (`prompts/`, `sai/`) and `~/.copilot/skills/`:

```bash
npx shared-ai uninstall --target copilot
```

See the [Uninstall section in README.md](README.md#uninstall) for details on `--dry-run`, `--yes`, the sha256 override guard, idempotent re-runs, empty-directory pruning, and excluded targets.
