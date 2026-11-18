> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

On Windows, `sai/tools/opencode-dispatch.js` spawned `opencode` without a shell. Node cannot execute the `.cmd` shim that npm writes on `PATH` that way, so the route query reported `opencode-missing` and an agent file with `harness: opencode` always ran through Claude Code, even with opencode installed. `sai/tools/dispose-shells.js` had the same launch defect for its `opencode api` calls. Separately, the Claude Code budget skills worded the route query as conditional on the agent file, so a coordinator could create the agent with `Agent` without ever asking the route.

The failure was a launch defect, not a missing install: the binary was present, and only the no-shell spawn of a `.cmd` shim failed.

## What Changes

- New `sai/tools/opencode-launcher.js` (installed by the existing `sai-tools` projection) exports `resolveOpencode({platform, env, exists, read})`, which returns `{command, shim, cause}`. On Linux and macOS the command is `opencode`, found on `PATH` by the spawn itself, as before. On Windows it walks the `PATH` directories in order with no process spawned: in the first directory that holds an `opencode` entry it takes `opencode.exe`, else the `.exe` that `opencode.cmd` names (the first quoted `.exe` path, with a leading `%dp0%` or `%~dp0` replaced by the shim's directory and `node.exe` skipped), accepted only when that `.exe` exists. An extensionless sh shim is skipped. A `.cmd` shim whose `.exe` cannot be read or is absent, or an `opencode.ps1`-only entry, yields the cause `opencode-shim-unresolved` with the shim path; no entry yields `opencode-missing`.
- `sai/tools/opencode-dispatch.js`: the route probe (`defaultProbe`, also used by the setup passthrough warning `checkAgents`) and the `start` and `continue` turns (`defaultRun`) spawn the launcher's command without a shell, keeping the worker message as the single argument after `--`. `FALLBACK_CAUSES` gains `opencode-shim-unresolved`, whose notice names the shim path. A turn with no launchable command fails with that cause.
- `sai/tools/dispose-shells.js`: the `opencode api` call spawns the launcher's command, and a missing command is an unanswered call.
- `bin/doctor.js`: its non-Windows opencode query spawns the launcher's command.
- `sai/policies/opencode-dispatch.md`: the route query runs before every agent creation with no check of the agent file first, and the notice list names the unresolved shim.
- The Claude Code dispatch sites state the route query as an unconditional step before every creation, a replacement included, and never decide the route by reading the agent file: `skills/claude/budget-explorer/SKILL.md`, `skills/claude/budget-executor/SKILL.md`, and `skills/claude/budget-subagent/SKILL.md` (§ Opencode routing), `sai/orchestration/workers/bindings/claude/standalone-worker-template.md`, the Claude Code budget-subagent dispatch line of `sai/commands/design/steps/overview.md`, and the Claude Code creation step of § Explorer two-phase startup in `sai/commands/explore/body.md`. The opencode counterparts are unchanged.
- `AGENTS.md` describes the launcher in the `sai/tools/` row.
- Tests: `test/opencode-launcher.test.js` covers the launcher with injected inputs and fixture directories (a `.exe` stand-in, npm `.cmd` shims including a directory with spaces, extensionless sh shims, unreadable shim formats), the shared cause of the route query and the setup warning, and a guard that fails when a file under `sai/tools/` or `bin/` spawns the literal `opencode` without the launcher; `test/opencode-dispatch.test.js` follows the new overview wording.

## Capabilities

### New Capabilities

None

### Modified Capabilities

- `opencode-agent-dispatch`: the route query, the `start` and `continue` turns, the setup passthrough warning, and `dispose-shells.js` launch opencode through one shared launcher that resolves the `.exe` behind npm's `.cmd` shim on Windows; an unreadable shim is its own fallback cause; every Claude Code dispatch site runs the route query unconditionally before it creates an agent.

## Impact

- New: `sai/tools/opencode-launcher.js`, `test/opencode-launcher.test.js`.
- Modified: `sai/tools/opencode-dispatch.js`, `sai/tools/dispose-shells.js`, `bin/doctor.js`, `sai/policies/opencode-dispatch.md`, `skills/claude/budget-explorer/SKILL.md`, `skills/claude/budget-executor/SKILL.md`, `skills/claude/budget-subagent/SKILL.md`, `sai/orchestration/workers/bindings/claude/standalone-worker-template.md`, `sai/commands/design/steps/overview.md`, `sai/commands/explore/body.md`, `AGENTS.md`, `test/opencode-dispatch.test.js`.
- Limitations: shims written by package managers other than npm (pnpm, yarn, scoop) are not parsed; they fall back to Claude Code with the distinct cause `opencode-shim-unresolved`. The Windows command-line length limit stays out of scope: an oversized message is a `failed` turn handled as an ordinary obstacle. `skills/universal/fetch/harness-root.js` and the setup's PowerShell query path in `bin/model-customization.js` are unchanged, and opencode as the main harness gains no new behavior.
- Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill
