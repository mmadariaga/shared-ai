**Complexity**: medium (3 capabilities, 10 requirements, no new dependency, 4 affected paths)

## Why

The post-setup customization menu collects model and effort/variant choices but currently discards them as in-memory results, so setup leaves no project-local agent configuration for the selected harness. Persisting those choices now makes customization observable while preserving existing project-specific agent edits and the setup flow's optional nature.

## What Changes

- Replace the agent customization menu's non-persistent local override contract with project-local agent materialization.
- Replace Claude Code's placeholder model/effort choices with concrete selected values while retaining its single combined selection frame.
- Write selected Claude Code agents under `.claude/agents/` with `model` and `effort` tunables, and selected opencode agents under `.opencode/agents/` with `model` and optional `variant` tunables.
- Clone the same-named installed global agent when a selected project-local agent does not exist.
- Update only harness tunables in existing project-local agents, preserving all other frontmatter and body content.
- Treat an unavailable global source as a per-agent soft failure when a missing local agent needs an installed template, while updating an existing local agent independently.
- Invert the walking-skeleton tests and replace the current zero-write specification.

## Capabilities

### New Capabilities

- `project-local-agent-overrides`: Persist selected harness agent settings as durable project-local agent files with source cloning, tunable-only updates, and soft-failure handling.

### Modified Capabilities

- `agent-customization-menu`: Replace placeholder Claude settings and in-memory local overrides with concrete settings and persistent project-local materialization while retaining selection, cancellation, and traversal behavior.
- `opencode-settings-selection`: Keep settings selection memory-only, but hand the selected settings to the persistent project-local override operation instead of a non-persistent result contract.

## Impact

- `bin/agent-customization.js`: persist selected overrides and resolve installed global agent sources.
- `bin/setup.js`: retain the post-setup integration while allowing persistence failures to remain non-fatal.
- `openspec/specs/agent-customization-menu/spec.md`: replace the zero-write requirement.
- `test/agent-customization-menu.test.js`: assert selected-file writes, preservation, and soft failures instead of zero writes.

## Proposal Research Documentation

**Local files**: `bin/agent-customization.js`, `bin/setup.js`, `bin/install-flow.js`, `bin/install-manifest.js`, `sai/install-manifest.json`, `openspec/specs/agent-customization-menu/spec.md`, `openspec/specs/agent-tunable-ownership/spec.md`, `openspec/schemas/sai-workflow/templates/specs.md`, `test/agent-customization-menu.test.js`, `INSTALL.claude.md`, `INSTALL.opencode.md`

**External URLs**: None.

## Additional Notes

- The installed global source is harness-specific: `~/.claude/agents/<name>.md` for Claude Code and `~/.config/opencode/agents/<name>.md` for opencode.
- Project-local agent files are user-owned extension points, not entries in the global install manifest or its install, doctor, and uninstall projections.
- Claude Code persists `model` and `effort`; opencode persists `model` and an optional `variant`. An existing opencode `variant` line is removed when the selected settings have no variant.
- A source/destination model match does not suppress materialization; the local file itself is the durable override surface.
- An existing project-local agent does not require its global source for a tunable-only update; the installed source is required when the local file must be cloned.
- Claude model and effort values come from a non-empty harness-owned settings catalog; only catalog members may be selected or persisted.
- This change does not introduce a dependency, alter global agent files, alter `opencode.json`/`opencode.jsonc`, or delete local agents.
