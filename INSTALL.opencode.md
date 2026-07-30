# Opencode — Installation

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

Step 1 expands `sai/install-manifest.json` and copies the opencode projection to `~/.config/opencode/`. It includes opencode commands, `sai/instructions/`, `sai/policies/`, and `sai/compat/` assets, the shared Orchestration Core contracts, only the opencode routed worker bindings, opencode skills, and the managed configuration projection. Step 2 verifies the openspec CLI, runs `openspec init --tools opencode` if needed, sets `schema: sai-workflow` in `openspec/config.yaml`, and copies the schema templates into the project. `doctor` and `uninstall` use the same manifest projection.

## Manual installation

| OS | Destination |
|----|---------|
| Linux / macOS | `~/.config/opencode/commands/` |
| Windows | `%USERPROFILE%\.config\opencode\commands\` |

### Linux / macOS

```bash
# This is the opencode adapter. Claude Code installs managed worker agents,
# and GitHub Copilot retains inline design and implementation adapters.
# Copy commands
mkdir -p ~/.config/opencode/commands
cp commands/opencode/*.md ~/.config/opencode/commands/
mkdir -p ~/.config/opencode/sai/commands
cp -r sai/commands/. ~/.config/opencode/sai/commands/

# Copy instructions
if [ -d ~/.config/opencode/sai/instructions ]; then
    echo "Overwriting ~/.config/opencode/sai/instructions/"
fi
mkdir -p ~/.config/opencode/sai/instructions
cp sai/instructions/*.md ~/.config/opencode/sai/instructions/

# Copy shared policies and compatibility assets
mkdir -p ~/.config/opencode/sai/policies ~/.config/opencode/sai/compat
cp sai/policies/*.md ~/.config/opencode/sai/policies/
cp -r sai/compat/. ~/.config/opencode/sai/compat/

# Copy the shared Orchestration Core and opencode-only routed bindings
mkdir -p ~/.config/opencode/sai/orchestration
cp sai/orchestration/coordinator-contract.md ~/.config/opencode/sai/orchestration/
cp sai/orchestration/worker-lifecycle.md ~/.config/opencode/sai/orchestration/
cp -r sai/orchestration/workers/. ~/.config/opencode/sai/orchestration/workers/

# Copy skills (skip if already installed)
mkdir -p ~/.config/opencode/skills/token-efficient-languages
cp skills/universal/token-efficient-languages/SKILL.md ~/.config/opencode/skills/token-efficient-languages/SKILL.md
mkdir -p ~/.config/opencode/skills/budget-explorer
cp skills/opencode/budget-explorer/SKILL.md ~/.config/opencode/skills/budget-explorer/SKILL.md
mkdir -p ~/.config/opencode/skills/budget-executor
cp skills/opencode/budget-executor/SKILL.md ~/.config/opencode/skills/budget-executor/SKILL.md
mkdir -p ~/.config/opencode/skills/budget-subagent
cp skills/opencode/budget-subagent/SKILL.md ~/.config/opencode/skills/budget-subagent/SKILL.md
mkdir -p ~/.config/opencode/skills/budget
cp skills/universal/budget/SKILL.md ~/.config/opencode/skills/budget/SKILL.md
mkdir -p ~/.config/opencode/skills/fetch
cp skills/opencode/fetch/SKILL.md ~/.config/opencode/skills/fetch/SKILL.md
mkdir -p ~/.config/opencode/skills/sai-commands
cp skills/universal/sai-commands/SKILL.md ~/.config/opencode/skills/sai-commands/SKILL.md
mkdir -p ~/.config/opencode/skills/safe-operations
cp skills/universal/safe-operations/SKILL.md ~/.config/opencode/skills/safe-operations/SKILL.md
mkdir -p ~/.config/opencode/skills/sai-3-implementation-worker
cp skills/opencode/sai-3-implementation-worker/SKILL.md ~/.config/opencode/skills/sai-3-implementation-worker/SKILL.md
mkdir -p ~/.config/opencode/skills/sai-2-design-worker
cp skills/opencode/sai-2-design-worker/SKILL.md ~/.config/opencode/skills/sai-2-design-worker/SKILL.md

# Copy opencode.json
if [ ! -f ~/.config/opencode/opencode.json ] && [ ! -f ~/.config/opencode/opencode.jsonc ]; then
    cp configs/opencode.jsonc ~/.config/opencode/
else
     echo "~/.config/opencode/opencode.json(c) already exists."
     echo "Ensure it includes subagent_depth and these agent entries:"
     echo "Existing agent names are user-owned; keep their definitions unchanged and add repository defaults only for names that are absent."
     echo '  "subagent_depth": 2,'
    echo '  "agent": {'
    echo '    "explore": {'
    echo '      "mode": "subagent",'
    echo '      "model": "opencode-go/glm-5.1"'
    echo '    },'
    echo '    "executor": {'
    echo '      "mode": "subagent",'
    echo '      "model": "opencode-go/glm-5.1"'
    echo '    },'
    echo '    "budget": {'
    echo '      "mode": "subagent",'
    echo '      "model": "opencode-go/glm-5.1"'
    echo '    },'
    echo '    "sai-3-implementation-worker": {'
    echo '      "mode": "subagent",'
    echo '      "model": "opencode-go/kimi-k2.6",'
    echo '      "permission": {'
    echo '        "task": { "*": "deny", "budget": "allow", "explore": "allow" }'
    echo '      }'
    echo '    },'
    echo '    "sai-2-design-worker": { "mode": "subagent", "model": "opencode-go/glm-5.2", "variant": "high", "permission": { "task": { "*": "deny", "explore": "allow" } } }'
    echo '  }'
fi

# Manual edits are needed only when automatic installation cannot safely merge the file.
# This is the narrow external-directory authorization:
# {
#   "permission": {
#     "external_directory": {
#       "~/.config/opencode/sai/**": "allow"
#     }
#   }
# }
```

```jsonc
{
  "permission": {
    "external_directory": {
      "~/.config/opencode/sai/**": "allow"
    }
  }
}
```

### Windows (PowerShell)

```powershell
# This is the opencode adapter. Claude Code installs managed worker agents,
# and GitHub Copilot retains inline design and implementation adapters.
# Copy commands
$configDir = "$env:USERPROFILE\.config\opencode"
New-Item -ItemType Directory -Force -Path "$configDir\commands"
Copy-Item commands\opencode\*.md "$configDir\commands\"
New-Item -ItemType Directory -Force -Path "$configDir\sai\commands"
Copy-Item sai\commands\* "$configDir\sai\commands\" -Recurse -Force

# Copy instructions
$instructionsDir = "$configDir\sai\instructions"
if (Test-Path $instructionsDir) {
    Write-Host "Overwriting $instructionsDir"
}
New-Item -ItemType Directory -Force -Path $instructionsDir | Out-Null
Copy-Item sai\instructions\*.md $instructionsDir\

# Copy shared policies and compatibility assets
New-Item -ItemType Directory -Force -Path "$configDir\sai\policies" | Out-Null
Copy-Item sai\policies\*.md "$configDir\sai\policies\"
New-Item -ItemType Directory -Force -Path "$configDir\sai\compat" | Out-Null
Copy-Item sai\compat\* "$configDir\sai\compat\" -Recurse -Force

# Copy the shared Orchestration Core and opencode-only routed bindings
New-Item -ItemType Directory -Force -Path "$configDir\sai\orchestration" | Out-Null
Copy-Item sai\orchestration\coordinator-contract.md "$configDir\sai\orchestration\"
Copy-Item sai\orchestration\worker-lifecycle.md "$configDir\sai\orchestration\"
Copy-Item sai\orchestration\workers\ "$configDir\sai\orchestration\workers" -Recurse -Force

# Copy skills
New-Item -ItemType Directory -Force -Path "$configDir\skills\token-efficient-languages" | Out-Null
Copy-Item skills\universal\token-efficient-languages\SKILL.md "$configDir\skills\token-efficient-languages\SKILL.md"
New-Item -ItemType Directory -Force -Path "$configDir\skills\budget-explorer" | Out-Null
Copy-Item skills\opencode\budget-explorer\SKILL.md "$configDir\skills\budget-explorer\SKILL.md"
New-Item -ItemType Directory -Force -Path "$configDir\skills\budget-executor" | Out-Null
Copy-Item skills\opencode\budget-executor\SKILL.md "$configDir\skills\budget-executor\SKILL.md"
New-Item -ItemType Directory -Force -Path "$configDir\skills\budget-subagent" | Out-Null
Copy-Item skills\opencode\budget-subagent\SKILL.md "$configDir\skills\budget-subagent\SKILL.md"
New-Item -ItemType Directory -Force -Path "$configDir\skills\budget" | Out-Null
Copy-Item skills\universal\budget\SKILL.md "$configDir\skills\budget\SKILL.md"
New-Item -ItemType Directory -Force -Path "$configDir\skills\fetch" | Out-Null
Copy-Item skills\opencode\fetch\SKILL.md "$configDir\skills\fetch\SKILL.md"
New-Item -ItemType Directory -Force -Path "$configDir\skills\sai-commands" | Out-Null
Copy-Item skills\universal\sai-commands\SKILL.md "$configDir\skills\sai-commands\SKILL.md"
New-Item -ItemType Directory -Force -Path "$configDir\skills\safe-operations" | Out-Null
Copy-Item skills\universal\safe-operations\SKILL.md "$configDir\skills\safe-operations\SKILL.md"
New-Item -ItemType Directory -Force -Path "$configDir\skills\sai-3-implementation-worker" | Out-Null
Copy-Item skills\opencode\sai-3-implementation-worker\SKILL.md "$configDir\skills\sai-3-implementation-worker\SKILL.md"
New-Item -ItemType Directory -Force -Path "$configDir\skills\sai-2-design-worker" | Out-Null
Copy-Item skills\opencode\sai-2-design-worker\SKILL.md "$configDir\skills\sai-2-design-worker\SKILL.md"

# Copy opencode.json
$jsonPath = Join-Path $configDir "opencode.json"
$jsoncPath = Join-Path $configDir "opencode.jsonc"
if (-not (Test-Path $jsonPath) -and -not (Test-Path $jsoncPath)) {
    Copy-Item configs\opencode.jsonc $configDir\
} else {
     Write-Host "$configDir\opencode.json(c) already exists."
     Write-Host "Ensure it includes subagent_depth and these agent entries:"
     Write-Host "Existing agent names are user-owned; keep their definitions unchanged and add repository defaults only for names that are absent."
     Write-Host '  "subagent_depth": 2,'
    Write-Host '  "agent": {'
    Write-Host '    "explore": {'
    Write-Host '      "mode": "subagent",'
    Write-Host '      "model": "opencode-go/glm-5.1"'
    Write-Host '    },'
    Write-Host '    "executor": {'
    Write-Host '      "mode": "subagent",'
    Write-Host '      "model": "opencode-go/glm-5.1"'
    Write-Host '    },'
    Write-Host '    "budget": {'
    Write-Host '      "mode": "subagent",'
    Write-Host '      "model": "opencode-go/glm-5.1"'
    Write-Host '    },'
     Write-Host '    "sai-3-implementation-worker": {'
    Write-Host '      "mode": "subagent",'
    Write-Host '      "model": "opencode-go/kimi-k2.6",'
    Write-Host '      "permission": {'
    Write-Host '        "task": { "*": "deny", "budget": "allow", "explore": "allow" }'
    Write-Host '      }'
    Write-Host '    },'
    Write-Host '    "sai-2-design-worker": { "mode": "subagent", "model": "opencode-go/glm-5.2", "variant": "high", "permission": { "task": { "*": "deny", "explore": "allow" } } }'
    Write-Host '  }'
}

# Manual edits are needed only when automatic installation cannot safely merge the file.
# This is the narrow external-directory authorization:
# {
#   "permission": {
#     "external_directory": {
#       "~/.config/opencode/sai/**": "allow"
#     }
#   }
# }
```

```jsonc
{
  "permission": {
    "external_directory": {
      "~/.config/opencode/sai/**": "allow"
    }
  }
}
```

### Managed implementation agents

The canonical opencode sample sets `subagent_depth: 2`, uses `opencode-go/glm-5.1` for the existing low-cost helper agents, and keeps `sai-3-implementation-worker` in `subagent` mode with `opencode-go/kimi-k2.6` and no variant. The `/sai-3-implement` wrapper declares the routed coordinator model and `variant: high`; the implementation worker permits only `budget` and `explore` tasks.

Installation preserves every existing agent definition by name and adds the repository default only when a name is absent. Existing `sai-3-implementation-worker` values, including model, variant, mode, and permissions, govern runtime dispatch; Kimi K2.6 is only the bootstrap default for a missing entry. A fully populated configuration is not rewritten. Parseable JSON/JSONC files retain comments, formatting, unrelated entries, and `opencode.json` precedence; malformed roots or agent maps remain unchanged and receive the existing manual-guidance fallback. Claude worker files and ordinary managed destinations retain their collision protection. Uninstall preserves opencode configuration under the existing config-merge exclusion. The opencode routed phases run under the active primary agent, which must permit native question and numbered-worker task dispatch; no separate coordinator profile is installed. Restart opencode after configuration changes.

This is the opencode harness adapter. Claude Code uses its managed worker agent and ownership sidecar, while GitHub Copilot keeps the inline implementation boundary for this slice because there is no portable coordinator-worker continuation contract. Copilot has subagent support; its inline boundary is a portability choice.

Automatic installation surgically merges `permission.external_directory["~/.config/opencode/sai/**"] = "allow"` into the selected OpenCode configuration. The permission trusts only the installed SAI prompt tree; it does not allow every external directory. This permission is separate from `permission.read`: read access alone does not authorize a tool to cross the workspace boundary.

Automatic installation merges rather than overwrites user settings and preserves user comments.
Automatic installation merges rather than overwrite user settings.

This external-directory authorization is intentionally narrower than read access and applies only to the installed SAI prompt tree.
External-directory authorization is separate from read authorization; do not grant broad external-directory access.

The merge preserves comments, formatting, unrelated permissions, agents, plugins, MCP entries, and user rule order. When both files exist, `opencode.json` is the merge target and `opencode.jsonc` remains unchanged. Equivalent tilde, `$HOME`, absolute-home, separator, dot-segment, and host-case spellings are not duplicated. An effective user `ask` or `deny` rule is never overridden.

Installer diagnostics write these stable stdout diagnostic forms:

- `OpenCode SAI permission: preserved <ask|deny> for ~/.config/opencode/sai/**; explicit user restriction prevents automatic SAI access.`
- `OpenCode SAI permission: preserved allow at <permission|permission.external_directory>; existing broad user permission allows ~/.config/opencode/sai/**.`
- `OpenCode SAI permission: no change for ~/.config/opencode/sai/**; <location> has invalid <shape-or-action>; expected allow, ask, deny, or a rule object.`

Effective allow passes without a prompt.

### Managed design agents

`/sai-2-design` preserves `openspec/changes/{change-name}/design.md`, `tasks.md`, and `interfaces.md`. Its wrapper declares `model: opencode-go/glm-5.2`, `variant: high`, `subtask: false`, and no `agent` field; it dispatches `sai-2-design-worker` in `subagent` mode. The design worker denies `task.*` by default and allows `explore`. The phase ends at design completion; run `/sai-3-implement {name}` separately in a new chat. Users may delete a leftover `sai-coordinator` from a previous installation because install and uninstall leave it untouched; a stale allowlist may otherwise deny newer workers.

Installation preserves an existing `sai-2-design-worker` definition by name and adds the GLM 5.2 high-reasoning repository default only when the name is absent. Existing configured model, variant, mode, and permissions govern runtime dispatch. Doctor accepts the present name in a valid agent map and still reports missing names or malformed configuration as errors. Configuration exclusion means uninstall leaves both reused and bootstrapped entries intact. Restart opencode after configuration changes; reinstall after updates to refresh command, instruction, and both design/implementation binding skill files.

### Post-install

After the files are in place, in each project where you want to use shared-AI:

```bash
# 1. Initialize OpenSpec for opencode
openspec init --tools opencode

# 2. Copy the SAI workflow schema templates into the project
cp -r openspec/schemas/sai-workflow /path/to/your/project/openspec/schemas/

# 3. Edit openspec/config.yaml in your project and set:
#    schema: sai-workflow
```

Restart or reload OpenCode after installation, then invoke one SAI command that reads its global prompt or binding under `~/.config/opencode/sai/`.

- Effective `allow`: pass means access is allowed with no prompt; any prompt or block is failure.
- Preserved `ask`: pass means installation printed the matching install notice and runtime prompt; silence or a block is failure.
- Preserved `deny`: pass means installation printed the matching install notice and runtime prompt or block; silence is failure.

For preserved `ask`, the pass condition is a matching install notice followed by a runtime prompt.

A matching `permission.read` rule without the narrow `permission.external_directory` authorization fails this check. Do not replace the narrow rule with a wildcard that trusts every external directory.

## Post Install

Once installed, adapt the models to your subscriptions and personal preferences.

### Recommended: per-project override

Copy the commands you want to customize into your project's `.opencode/commands/` directory. Opencode will use the project-local file instead of the global one, and your changes will survive future reinstalls and updates.

```bash
cp ~/.config/opencode/commands/sai-1-spec.md .opencode/commands/
cp ~/.config/opencode/commands/sai-2-design.md .opencode/commands/
```

Then edit copied files for command-level customization. Routed design and implementation wrappers declare their model and variant directly, as Claude Code already does; no named coordinator is shipped.

Opencode's project-local commands (`.opencode/commands/`) take precedence over user-global ones (`~/.config/opencode/commands/`) by filename — a project-local command with the same filename as a user-global one silently shadows it. Claude Code has the analogous `.claude/commands/` precedence; GitHub Copilot in VS Code uses independent prompt scopes and the inline implementation adapter. Copilot has subagent support; these are harness-specific boundaries. See `INSTALL.copilot.md#customizing-models`.

### Alternative: edit global commands

You can also edit `~/.config/opencode/commands/sai-*.md` directly, but **these changes will be overwritten** on future updates or reinstalls.

To list all models available in your opencode subscriptions, run:

```bash
opencode models
```

If you pull a repo update that touches `commands/opencode/`, re-run `node bin/install.js` to refresh your `~/.config/opencode/commands/` snapshot.

## Uninstall

To remove all shared-AI files from opencode's global directories (`~/.config/opencode/commands/`, `~/.config/opencode/sai/`, `~/.config/opencode/skills/`):

```bash
npx shared-ai uninstall --target opencode
```

See the [Uninstall section in README.md](README.md#uninstall) for details on `--dry-run`, `--yes`, the sha256 override guard, idempotent re-runs, empty-directory pruning, and excluded targets.
