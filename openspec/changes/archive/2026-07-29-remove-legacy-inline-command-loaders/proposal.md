**Complexity**: high

## Why

The obsolete design and implementation inline command loaders are no longer referenced by any supported wrapper, but the generic command projection still installs them globally and active documentation, fixtures, tests, and specifications still describe them as supported entrypoints. Removing these historical shims now makes the existing Copilot Inline Coordinator Adapter the unambiguous inline entrypoint while preserving the routed Claude Code and opencode paths.

## What Changes

- Remove `sai/commands/sai-2-design-inline.md` and `sai/commands/sai-3-implement-inline.md` without compatibility shims.
- Keep Claude Code and opencode on their current routed coordinator and worker bindings.
- Keep both Copilot prompts invoking `sai/orchestration/inline-invocation.md` directly with their existing phase envelopes and observable behavior.
- Pin the Copilot implementation adapter's proposal, design, and tasks prerequisite checks to the three established failure messages, first-missing order, immediate stop, and no-write behavior.
- Remove stale loader references from the Copilot adapter, installation inventory expectations, fixtures, tests, AGENTS documentation, and active specifications.
- Ensure fresh managed projections no longer contain either obsolete loader. Add manifest-owned retirement records for both former destinations and their known historical managed SHA-256 hashes; install/update and uninstall remove a retired copy only on a recorded hash match, while modified or unrecognized copies remain untouched and doctor reports them for manual cleanup.
- Leave archived OpenSpec changes and ADRs unchanged as historical records.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `inline-coordinator-adapter`: Make the Copilot prompts the only supported inline entrypoints, preserve the shared adapter and exact missing-artifact contract, and remove all retained-inline-loader requirements.
- `design-coordinator`: Replace superseded all-inline and generic inline-caller requirements with the current routed Claude Code/opencode and direct Copilot adapter split.
- `deduplicate-sai-2-design`: Describe the caller-neutral design core, routed coordinator path, and Copilot adapter path without a preserved inline command body.
- `implementation-coordinator`: Define Copilot implementation planning as direct adapter dispatch rather than a preserved inline command loader.
- `implementation-harness-bindings`: Require Copilot's managed inline projection to contain the adapter and required compatibility sources but not obsolete inline command loaders.
- `orchestration-source-layout`: Exclude removed command loaders from active source and runtime inventories, define manifest-owned retirement records, clean up exact historical managed copies, and preserve modified or unrecognized copies.

## Impact

- Removed sources: `sai/commands/sai-2-design-inline.md`, `sai/commands/sai-3-implement-inline.md`.
- Preserved runtime entrypoint: `sai/orchestration/inline-invocation.md`.
- Projection and manual-install surfaces: `sai/install-manifest.json`, `INSTALL.copilot.md`, and installer/doctor/uninstall behavior derived from the manifest.
- Fixtures and tests: `fixtures/implementation-adapter.js`, `fixtures/implementation-completion-step-4.js`, `test/implementation-completion-step-4.test.js`, `test/implement-coordinator-worker.test.js`, and manifest inventory coverage.
- Documentation and contracts: `AGENTS.md` plus the six modified capability specifications listed above.
- No dependency, API, generated-artifact, command-wrapper, routed-worker, or Copilot phase-envelope changes.

## Proposal Research Documentation

**Local files**: `GLOSSARY.md`; `AGENTS.md`; `INSTALL.copilot.md`; `sai/install-manifest.json`; `sai/commands/sai-2-design.md`; `sai/commands/sai-3-implement.md`; `sai/commands/sai-2-design-inline.md`; `sai/commands/sai-3-implement-inline.md`; `sai/orchestration/inline-invocation.md`; `sai/orchestration/workers/sai-3-implementation-worker.md`; `commands/claude/sai-2-design.md`; `commands/claude/sai-3-implement.md`; `commands/opencode/sai-2-design.md`; `commands/opencode/sai-3-implement.md`; `commands/copilot/sai-2-design.prompt.md`; `commands/copilot/sai-3-implement.prompt.md`; `fixtures/implementation-adapter.js`; `fixtures/implementation-completion-step-4.js`; `test/design-coordinator-worker.test.js`; `test/implement-coordinator-worker.test.js`; `test/implementation-completion-step-4.test.js`; `test/install-manifest.test.js`; `test/install-claude.test.js`; `test/install-opencode.test.js`; `test/uninstall-enumeration.test.js`; `test/uninstall-plan.test.js`; `test/uninstall-execution.test.js`; `test/doctor-fetch-resolution.test.js`; `test/doctor-harness-inventory.test.js`; `test/doctor-version-skew.test.js`; `bin/install-manifest.js`; `bin/install-flow.js`; `bin/doctor.js`; `bin/uninstall-flow.js`; `openspec/specs/design-coordinator/spec.md`; `openspec/specs/deduplicate-sai-2-design/spec.md`; `openspec/specs/inline-coordinator-adapter/spec.md`; `openspec/specs/implementation-coordinator/spec.md`; `openspec/specs/implementation-harness-bindings/spec.md`; `openspec/specs/orchestration-source-layout/spec.md`; `openspec/changes/archive/2026-07-27-introduce-implement-coordinator-worker/implementation.md`.

**External URLs**: None.

## Additional Notes

- The existing glossary term **Inline Coordinator Adapter** already names the canonical Copilot boundary, so no glossary update is required.
- Direct manual invocation of either removed loader path will stop working. `sai/install-manifest.json` remains the source of truth through a top-level retirement registry consumed by the shared manifest expander; existing copies that match a registered historical managed hash are removed during install/update or uninstall, while modified or unrecognized copies require manual cleanup after doctor reports them.
- Historical archived artifacts continue to explain why the compatibility loaders once existed and are intentionally not rewritten.
