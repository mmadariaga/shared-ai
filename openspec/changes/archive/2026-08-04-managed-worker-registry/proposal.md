**Complexity**: high

## Why

Managed worker wiring is repeated across installer constants, owner dispatch, opencode registration, and manifest projections, so adding each worker requires correlated edits that can drift. The fourth managed worker has established the stable shape and the deferred registry work from the archived review-worker change can now remove the duplicated code-derived wiring without changing installation behavior; the design will explicitly determine whether manifest projections are emitted from the registry or remain separately authored and parity-validated.

## What Changes

- Add one declarative managed-worker registry covering the four existing workers and their Claude agent, owner sidecar, and applicable opencode metadata.
- Derive the existing Claude agent and owner constants, fail-closed owner dispatch map, and opencode managed-agent registrations from that registry.
- Preserve the existing exported constant names, worker names, owner mappings, opencode model and permission shapes, manifest projection inventory, and fresh-install output bytes.
- Preserve the existing doctor, migration, and guarded-uninstall consumers of those exported values.
- Add behavior-preservation and registry-completeness coverage to the existing installer test harness.

## Capabilities

### New Capabilities

- `managed-worker-registry`: A single declarative source of truth for managed worker metadata from which installer dispatch and opencode registration are derived while preserving current installation behavior.

### Modified Capabilities

- None.

## Impact

- `bin/install-flow.js` — registry definition and derived installer/opencode surfaces.
- `sai/install-manifest.json` — existing managed-worker projection contract to preserve or validate against the registry.
- `bin/install-manifest.js` — conditional parity validation if the design retains checked-in manifest projections.
- `test/install-manifest.test.js` — manifest and registry parity coverage.
- `test/install-claude.test.js` — Claude ownership, sidecar, and compatibility coverage.
- `test/install-opencode.test.js` — opencode registration, permission, and fresh-config coverage.
- `bin/doctor.js` — managed-worker enumeration and compatibility consumers.
- `bin/managed-worker-migration.js` — legacy ownership verification compatibility.
- `bin/uninstall-flow.js` — guarded worker cleanup and compatibility consumers.
- `test/uninstall-enumeration.test.js` — uninstall inventory preservation.

No new dependencies, public user-facing behavior, or harness projections are introduced.

## Proposal Research Documentation

**Local files**: `bin/install-flow.js`; `sai/install-manifest.json`; `bin/install-manifest.js`; `bin/doctor.js`; `bin/managed-worker-migration.js`; `test/install-manifest.test.js`; `test/install-claude.test.js`; `test/install-opencode.test.js`; `test/doctor-opencode-agent-preservation-step-2.test.js`; `test/uninstall-enumeration.test.js`; `openspec/changes/archive/2026-08-04-sai-5-review-coordinator-worker-split/design.md`; `openspec/changes/archive/2026-08-04-sai-5-review-coordinator-worker-split/tasks.md`; `docs/adr/0096-fail-closed-owned-worker-owner-dispatch.md`; `GLOSSARY.md`.

**External URLs**: None.

## Additional Notes

- The archived `sai-5-review-coordinator-worker-split` change records this registry as deferred work after the fourth worker and is now the sequencing prerequisite for this change.
- The current manifest is a checked-in version-1 projection source consumed by installer, doctor, and uninstall; this proposal does not assume a new manifest-generation lifecycle.
- Design must decide whether the registry emits the existing manifest records or whether the checked-in records remain authored separately and are parity-validated. Either choice must preserve deterministic projection ordering, harness isolation, collision checks, and existing fresh-install bytes.
- Opencode metadata is conditional: the registry must represent the three workers currently present in `OPENCODE_MANAGED_AGENTS`; the Claude-only `sai-1-spec-proposal-worker` must not acquire a new opencode registration.
- The derived opencode registration must preserve the current insertion order `sai-3-implementation-worker`, `sai-2-design-worker`, `sai-5-review-worker`; registry authoring order must not silently sort or reorder the emitted JSONC edits.
- Folding `LEGACY_CLAUDE_WORKERS` into the registry is explicitly out of scope for this slice. Its existing export, values, and migration role remain compatibility surfaces rather than a second registry redesign.
- Unknown owned-copy workers must remain fail-closed, and existing user-owned or incompatible content must not be silently adopted or overwritten.
