**Complexity**: high

## Why

Installed worker-binding paths currently carry a harness identity segment, forcing shared coordinator instructions and worker skills to infer which harness path to read. A real opencode run selected the Claude binding and stopped; neutral destinations remove that branch while retiring the predecessor slice's transitional cross-harness guard now that new binding paths no longer expose the guarded slot.

## What Changes

- Project all 14 Claude and opencode worker-binding manifest entries to the neutral destination `orchestration/workers/bindings/<worker-filename>.md`, where the seven existing filenames are `spec-worker.md`, `design-worker.md`, `implementation-worker.md`, `review-worker.md`, `security-worker.md`, `performance-worker.md`, and `accessibility-worker.md`; keep `sai/orchestration/workers/bindings/{claude,opencode}/` as the harness-specific source tree.
- Update the 14 Claude and opencode worker forwarding skills to fetch the neutral binding path without changing their harness-specific dispatch and continuation content.
- Align install, uninstall enumeration, deletion planning, drift expectations, legacy-file retirement, fixtures, and focused harness-binding tests with the neutral destination graph.
- Remove the identity-bearing-slot guard and its assertions from the Claude Code, opencode, and Copilot fetch skills; preserve ordinary path resolution, missing-file handling, recursion, and Copilot's no-routed-binding boundary.
- Leave the seven `sai/commands/*/coordinator.md` files unchanged intentionally; once all active binding references use the neutral path, their existing "active <phase>-worker binding" wording no longer requires a harness choice, and the change verifies that those references remain identity-neutral.
- Do not change the worker protocol, coordinator contract, lifecycle payloads, Copilot binding projections, or `bin/doctor.js`.

## Capabilities

### New Capabilities

- `neutral-binding-destination`: Harness-specific worker-binding sources project to a harness-neutral installed destination for every routed worker phase.
- `worker-skill-path-update`: Claude Code and opencode worker forwarding skills resolve the neutral installed binding path while retaining their distinct worker behavior.
- `install-uninstall-enumeration-parity`: Manifest expansion, installation, uninstall enumeration, deletion planning, and drift expectations use the same neutral worker-binding destinations.
- `transitional-guard-retirement`: The obsolete identity-bearing binding-path guard and its test assertions are removed from all three fetch skills after the path layout is neutralized.

### Modified Capabilities

<!-- No existing capability name is being redefined; the four change capabilities capture the new contract and its retired transitional coverage. -->

## Impact

- `sai/install-manifest.json` and the manifest-driven install/uninstall projection tests.
- `skills/claude/sai-*-worker/SKILL.md` and `skills/opencode/sai-*-worker/SKILL.md`.
- `skills/claude/fetch/SKILL.md`, `skills/opencode/fetch/SKILL.md`, and `skills/copilot/fetch/SKILL.md`.
- `test/doctor-fetch-resolution.test.js`, `test/implementation-harness-bindings-step-2.test.js`, `test/implementation-harness-bindings-step-3.test.js`, `test/install-retirement-step-3.test.js`, and `fixtures/spec-coordinator-worker.js`.
- `bin/install-retirement.js` and the manifest retirement entries remove each old `bindings/{claude,opencode}/<worker-filename>.md` only when its content matches one of the historical managed hashes; edited legacy files remain protected by the existing retirement behavior.
- `sai/commands/*/coordinator.md` is an intentionally unchanged verification surface: its active-binding wording remains valid once no active binding path carries an identity segment.
- No new dependency, API, worker lifecycle, or shared instruction contract is introduced.

## Proposal Research Documentation

**Local files**: `sai/install-manifest.json`; `bin/install-manifest.js`; `bin/uninstall-flow.js`; `bin/install-retirement.js`; `bin/doctor.js`; `test/install-manifest.test.js`; `test/uninstall-enumeration.test.js`; `test/install-claude.test.js`; `test/install-opencode.test.js`; `test/install-retirement-step-3.test.js`; `test/implementation-harness-bindings-step-2.test.js`; `test/implementation-harness-bindings-step-3.test.js`; `test/doctor-fetch-resolution.test.js`; `fixtures/spec-coordinator-worker.js`; `sai/commands/*/coordinator.md`; `skills/claude/sai-*-worker/SKILL.md`; `skills/opencode/sai-*-worker/SKILL.md`; `skills/claude/fetch/SKILL.md`; `skills/opencode/fetch/SKILL.md`; `skills/copilot/fetch/SKILL.md`; `openspec/changes/archive/2026-08-05-harness-identity-in-shared-instructions/design.md`; `openspec/changes/archive/2026-08-05-harness-identity-in-shared-instructions/interfaces.md`; `openspec/specs/orchestration-source-layout/spec.md`; `openspec/specs/doctor-fetch-resolution/spec.md`; `openspec/specs/claude-fetch-resolution/spec.md`; `openspec/specs/worker-lifecycle-protocol/spec.md`; `GLOSSARY.md`

**External URLs**: None.

## Additional Notes

The source tree remains split by harness because Claude Code and opencode bindings have different dispatch and continuation mechanisms. Neutrality applies to the installed destination and every forwarding reference only: within each harness's SAI root, the canonical shape is `orchestration/workers/bindings/<worker-filename>.md`, with the destination filename copied unchanged from the seven existing source filenames. Prior harness-qualified destinations are represented as managed retirements rather than orphaned files. Copilot remains inline and receives no routed binding projection; its fetch skill is changed only to retire the now-unreachable guard prose and assertions.
