> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation. It describes a decision already made, not one being proposed.

## Why

GitHub Copilot users working in VS Code had no first-class way to use the shared-ai SAI workflow. The existing setup covered Opencode and Claude Code but left Copilot subscribers without a supported path, requiring them to use a different tool or skip the pipeline entirely.

## What Changes

- **`INSTALL.copilot.md`** — New installation guide covering automatic (`npx`) and manual install steps for Linux/macOS/Windows, post-install OpenSpec setup, model customization, and usage instructions.
- **`README.md`** — Added GitHub Copilot as a supported editor; expanded the model defaults table with Copilot (VS Code) and Copilot (opencode) columns; updated per-project override paths to include `.github/prompts/`.
- **`bin/install-flow.js`** — Added `getCopilotPromptsDir()` (cross-platform), `installCopilot()` function, `detectInstalledEditors()` auto-detection, and GitHub Copilot option in the interactive installer checklist.
- **`commands/copilot/*.prompt.md`** — 14 new Copilot prompt files (`sai-1-spec` through `sai-8-accessibility`, plus `budget`, `sai-archive`, `sai-backfill`, `sai-commit`, `sai-explore`, `sai-pr`) with frontmatter (`agent: agent`, per-command model, `argument-hint`) and `Fetch @` delegation to the shared SAI command bodies.
- **`agents/copilot/budget-explorer.agent.md`** — Read-only research subagent; `GPT-5 mini (copilot)`; `user-invocable: false`; tools: codebase search, file read, web fetch.
- **`agents/copilot/budget-executor.agent.md`** — Command-execution subagent; `GPT-5 mini (copilot)`; `user-invocable: false`; tools: terminal command, last command read.
- **`agents/copilot/budget-subagent.agent.md`** — General-purpose subagent; `GPT-5 mini (copilot)`; `user-invocable: false`; full tool set including writes.
- **`skills/copilot/fetch/SKILL.md`** — Copilot-specific fetch skill mapping `@skills/<name>/SKILL.md` to the skill tool and `@<subpath>` to `.github/sai/` then the VS Code user prompts folder.
- **`skills/copilot/budget-explorer/SKILL.md`** — Binds "cheap research subagent" to the `budget-explorer` custom agent; defines task classification, tool-call caps, and output contract rules.
- **`skills/copilot/budget-executor/SKILL.md`** — Binds "executor subagent" to the `budget-executor` custom agent; defines delegation criteria and invocation rules.
- **`skills/copilot/budget-subagent/SKILL.md`** — Binds "task subagent" to the `budget-subagent` custom agent; defines routing table and invocation rules.

## Capabilities

### New Capabilities

- `copilot-install`: Full installation path (automatic and manual) for GitHub Copilot in VS Code on Linux, macOS, and Windows.
- `copilot-commands`: All `sai-*` and `budget` slash commands available in GitHub Copilot agent mode, delegating to shared SAI command bodies via `Fetch @`.
- `copilot-budget-agents`: Three hidden custom agents (`budget-explorer`, `budget-executor`, `budget-subagent`) providing cost-controlled subagent delegation for Copilot sessions.
- `copilot-fetch-skill`: Copilot-specific `fetch` skill resolving `@sai/` paths via `.github/sai/` (project-local) then the VS Code user prompts folder (global).
- `copilot-auto-detect`: Installer auto-detects GitHub Copilot presence via the VS Code prompts directory and pre-selects it in the checklist.

### Modified Capabilities

- `install-flow`: Installer checklist expanded from `[Claude Code, Opencode]` to `[Claude Code, Opencode, GitHub Copilot]`; default selection is now driven by `detectInstalledEditors()` rather than hardcoded `['Opencode']`.
- `readme-supported-editors`: README now lists GitHub Copilot (VS Code) as a supported target with installation link.
- `model-defaults-table`: Table restructured to split the Copilot column into two: VS Code model names and opencode provider IDs.

## Impact

- **New files**: `INSTALL.copilot.md`, `agents/copilot/budget-executor.agent.md`, `agents/copilot/budget-explorer.agent.md`, `agents/copilot/budget-subagent.agent.md`, `commands/copilot/budget.prompt.md`, `commands/copilot/sai-1-spec.prompt.md`, `commands/copilot/sai-2-design.prompt.md`, `commands/copilot/sai-3-implement.prompt.md`, `commands/copilot/sai-4-apply.prompt.md`, `commands/copilot/sai-5-review.prompt.md`, `commands/copilot/sai-6-security.prompt.md`, `commands/copilot/sai-7-performance.prompt.md`, `commands/copilot/sai-8-accessibility.prompt.md`, `commands/copilot/sai-archive.prompt.md`, `commands/copilot/sai-backfill.prompt.md`, `commands/copilot/sai-commit.prompt.md`, `commands/copilot/sai-explore.prompt.md`, `commands/copilot/sai-pr.prompt.md`, `skills/copilot/budget-executor/SKILL.md`, `skills/copilot/budget-explorer/SKILL.md`, `skills/copilot/budget-subagent/SKILL.md`, `skills/copilot/fetch/SKILL.md`
- **Modified files**: `README.md`, `bin/install-flow.js`
- **Out of scope**: `design.md`, `tasks.md`, `implementation.md` — not generated by `/sai-backfill`
