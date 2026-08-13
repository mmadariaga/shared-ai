**Complexity**: high (breaking source-layout move with cross-harness install projections)

## Why

The current source tree mixes shared orchestration protocol, per-command content, and harness-specific dispatch details across several directories, making a command difficult to understand and extend as one unit. This change establishes explicit ownership boundaries now, before additional routed commands deepen those couplings, and makes the installer, doctor, and uninstall flows project the same layout.

## What Changes

- **BREAKING** Introduce the harness-neutral root protocol files `sai/command-runner.md` and `sai/worker-core.md`.
- **BREAKING** Reorganize routed per-invocation coordinator and worker content, and utility-command body content, into self-contained `sai/commands/{name}/` folders.
- Introduce exactly one harness-specific boot entry under each supported adapter directory: `sai/adapters/claude/boot.md` and `sai/adapters/opencode/boot.md`.
- Keep phase-specific behavior in command-card flags consumed by the shared runner and worker core; do not add phase branches to the shared protocol files.
- Re-project `sai/install-manifest.json` so Claude Code and opencode receive mirrored neutral content plus only their own adapter boot, with installer, doctor, and uninstall deriving the same inventory.
- Preserve `sai/policies/` as the shared fetch target, including generic budget/executor/explore fetches.

## Capabilities

### New Capabilities

- `command-runner-layout`: A shared root protocol, self-contained per-invocation command cards, harness boot adapters, and deterministic two-harness installation projections.

### Modified Capabilities

- None.

## Impact

- Source layout: `sai/command-runner.md`, `sai/worker-core.md`, `sai/commands/`, and `sai/adapters/`.
- Projection source of truth: `sai/install-manifest.json`.
- Projection expansion and lifecycle consumers: `bin/install-manifest.js`, `bin/install-flow.js`, `bin/doctor.js`, and `bin/uninstall-flow.js`.
- Fetching and forwarding surfaces in both supported harnesses, plus their projection and parity tests.
- Existing harness-specific worker bindings and managed agent runtime surfaces remain supported runtime glue; this change does not migrate those established paths into the adapter source seam.
- Existing installed users must re-run installation because the managed fetch destinations and source paths change.
- No new runtime dependency is introduced; `sai/policies/` remains shared and unchanged.

## Proposal Research Documentation

**Local files**: `sai/install-manifest.json`; `docs/adr/0003-fetch-path-convention-commands-sai.md`; `docs/adr/0004-source-layout-and-install-path-restructure.md`; `openspec/specs/source-layout/spec.md`; `openspec/specs/orchestration-source-layout/spec.md`; `openspec/specs/sai-command-naming/spec.md`; `bin/install-manifest.js`; `bin/install-flow.js`; `bin/doctor.js`; `bin/uninstall-flow.js`; `test/install-manifest.test.js`; `test/uninstall-enumeration.test.js`; `AGENTS.md`; `GLOSSARY.md`.

**External URLs**: None.

## Additional Notes

- The two supported harnesses are Claude Code and opencode; parity is required per slice, not as a follow-up.
- The requested root/command/adapter split is source-layout authority. Installed copies remain managed projections, and existing ownership-safe drift behavior remains in force.
- A future `/sai-*` command adds its own `sai/commands/{name}/` card. Changes to `command-runner.md` or `worker-core.md` are reserved for protocol changes expressed through card flags.
