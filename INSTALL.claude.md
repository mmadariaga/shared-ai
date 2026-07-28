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

Step 1 expands `sai/install-manifest.json` and copies the Claude Code projection to `~/.claude/`. It includes Claude commands, shared instructions/policies/compatibility assets, the shared Orchestration Core contracts, only the Claude routed worker bindings, Claude skills, and managed worker agents. Step 2 verifies the openspec CLI, runs `openspec init --tools claude` if needed, sets `schema: sai-workflow` in `openspec/config.yaml`, and copies the schema templates into the project. `doctor` and `uninstall` use the same manifest projection.

## Manual installation

| OS | Destination |
|----|---------|
| Linux / macOS | `~/.claude/commands/` |
| Windows | `%USERPROFILE%\.claude\commands\` |

### Linux / macOS
```bash
# This is the Claude Code adapter. Opencode uses namespaced config entries,
# and GitHub Copilot retains inline design and implementation adapters.
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

# Copy shared policies and compatibility assets
mkdir -p ~/.claude/sai/policies ~/.claude/sai/compat
cp sai/policies/*.md ~/.claude/sai/policies/
cp -r sai/compat/. ~/.claude/sai/compat/

# Copy the shared Orchestration Core and Claude-only routed bindings
mkdir -p ~/.claude/sai/orchestration
cp sai/orchestration/coordinator-contract.md ~/.claude/sai/orchestration/
cp sai/orchestration/worker-lifecycle.md ~/.claude/sai/orchestration/
cp -r sai/orchestration/workers/. ~/.claude/sai/orchestration/workers/

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
mkdir -p ~/.claude/skills/safe-operations
cp skills/universal/safe-operations/SKILL.md ~/.claude/skills/safe-operations/SKILL.md
mkdir -p ~/.claude/skills/sai-3-implementation-worker
cp skills/claude/sai-3-implementation-worker/SKILL.md ~/.claude/skills/sai-3-implementation-worker/SKILL.md
mkdir -p ~/.claude/skills/sai-2-design-worker
cp skills/claude/sai-2-design-worker/SKILL.md ~/.claude/skills/sai-2-design-worker/SKILL.md
mkdir -p ~/.claude/agents
cp agents/claude/sai-3-implementation-worker.md ~/.claude/agents/sai-3-implementation-worker.md
cp agents/claude/sai-2-design-worker.md ~/.claude/agents/sai-2-design-worker.md
```

### Windows (PowerShell)
```powershell
# This is the Claude Code adapter. Opencode uses namespaced config entries,
# and GitHub Copilot retains inline design and implementation adapters.
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

# Copy shared policies and compatibility assets
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.claude\sai\policies" | Out-Null
Copy-Item sai\policies\*.md "$env:USERPROFILE\.claude\sai\policies\"
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.claude\sai\compat" | Out-Null
Copy-Item sai\compat\* "$env:USERPROFILE\.claude\sai\compat\" -Recurse -Force

# Copy the shared Orchestration Core and Claude-only routed bindings
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.claude\sai\orchestration" | Out-Null
Copy-Item sai\orchestration\coordinator-contract.md "$env:USERPROFILE\.claude\sai\orchestration\"
Copy-Item sai\orchestration\worker-lifecycle.md "$env:USERPROFILE\.claude\sai\orchestration\"
Copy-Item sai\orchestration\workers\ "$env:USERPROFILE\.claude\sai\orchestration\workers" -Recurse -Force

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
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.claude\skills\safe-operations" | Out-Null
Copy-Item skills\universal\safe-operations\SKILL.md "$env:USERPROFILE\.claude\skills\safe-operations\SKILL.md"
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.claude\skills\sai-3-implementation-worker" | Out-Null
Copy-Item skills\claude\sai-3-implementation-worker\SKILL.md "$env:USERPROFILE\.claude\skills\sai-3-implementation-worker\SKILL.md"
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.claude\skills\sai-2-design-worker" | Out-Null
Copy-Item skills\claude\sai-2-design-worker\SKILL.md "$env:USERPROFILE\.claude\skills\sai-2-design-worker\SKILL.md"
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.claude\agents" | Out-Null
Copy-Item agents\claude\sai-3-implementation-worker.md "$env:USERPROFILE\.claude\agents\sai-3-implementation-worker.md"
Copy-Item agents\claude\sai-2-design-worker.md "$env:USERPROFILE\.claude\agents\sai-2-design-worker.md"
```

### Managed implementation-planning worker

Claude Code's managed worker is installed as `agents/claude/sai-3-implementation-worker.md` alongside the shared command files. The installer records its content hash in `.sai-3-implementation-worker.owner.json`. An exact-compatible existing definition is reused without adoption; installation does not adopt or silently claim an existing user-owned definition. An incompatible collision blocks activation without overwrite and reports the remediation: manually rename or remove the conflicting agent, then retry.

During legacy migration, a missing or invalid legacy sidecar preserves the legacy file and any existing sidecar, creates no numbered replacement, and reports a protected collision. The Claude Code uninstall path uses the ownership sidecar-plus-hash guard: it removes a legacy or numbered worker only when the recorded managed hash still matches, and preserves a modified worker. This managed asset is a Claude Code harness adapter; opencode instead manages its coordinator and worker entries in `opencode.json` or `opencode.jsonc`, while GitHub Copilot retains inline planning. Copilot has subagent support; its inline boundary is an adapter choice for this slice.

### Managed design-planning worker

Claude Code routes `/sai-2-design` through the low-effort coordinator and high-effort `sai-2-design-worker`. It preserves `openspec/changes/{change-name}/design.md`, `tasks.md`, and `interfaces.md`. The worker is recorded in `.sai-2-design-worker.owner.json`. During legacy migration, a missing or invalid legacy sidecar preserves the legacy file and any existing sidecar, creates no numbered replacement, and reports a protected collision. An exact-compatible existing agent is reused without adoption; an incompatible collision blocks activation and preserves the user-owned definition. Uninstall removes a managed legacy or numbered agent only when its sidecar hash still matches, and preserves edited or non-adopted agents. Restart Claude Code after changing definitions; reinstall after upgrades to synchronize the command, skill, agent, and ownership metadata.

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

## Customizing models

The default models are set in each Claude Code wrapper's YAML frontmatter (`model:` field). To customize them for a specific project, copy the relevant wrapper into the project's `.claude/commands/` directory and edit the `model` field:

```bash
cp ~/.claude/commands/sai-1-spec.md .claude/commands/
# Then edit .claude/commands/sai-1-spec.md and change the model: field
```

Claude Code's project-local commands (`.claude/commands/`) take precedence over user-global ones (`~/.claude/commands/`) by filename — a project-local command with the same filename as a user-global one silently shadows it. Opencode has the analogous `.opencode/commands/` precedence; GitHub Copilot in VS Code uses independent prompt scopes and its inline adapter instead. Copilot has subagent support; these are harness-specific installation boundaries. See `INSTALL.copilot.md#customizing-models`.

## Uninstall

To remove all shared-AI files from Claude Code's global directories (`~/.claude/commands/`, `~/.claude/sai/`, `~/.claude/skills/`):

```bash
npx shared-ai uninstall --target claude-code
```

See the [Uninstall section in README.md](README.md#uninstall) for details on `--dry-run`, `--yes`, the sha256 override guard, idempotent re-runs, empty-directory pruning, and excluded targets.
