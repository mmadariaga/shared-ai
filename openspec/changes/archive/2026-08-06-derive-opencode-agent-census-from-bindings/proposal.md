**Complexity**: high (4 capabilities, 8 affected paths, lazy cross-consumer validation boundary, intentional fail-closed opencode install behavior)

## Why

The opencode managed-agent inventory is currently inferred from optional settings in a hand-maintained registry, so a worker can be dispatched by a binding without being registered, reported by the installer, or checked by the doctor. Deriving membership from the opencode bindings removes this silent divergence while keeping each worker's model, variant, permissions, and user-config preservation explicit.

## What Changes

- Derive the managed opencode agent name set from the explicit `task(subagent_type: "...")` dispatch declarations in `sai/orchestration/workers/bindings/opencode/*.md`.
- Require explicit per-agent defaults for every derived worker and fail visibly during installation if a binding names a worker without settings.
- **BREAKING** Installation now fails instead of silently succeeding when binding-derived membership and repository registration defaults are incomplete or inconsistent.
- Use the derived census directly for opencode installer guidance and doctor managed-agent diagnostics, and parity-check the checked-in seed configuration's managed keys and dispatchability-critical values against the canonical repository registration defaults.
- Resolve and validate the census lazily so opencode operations fail closed before mutation, doctor reports derivation failures as diagnostics, and importing shared installer code does not break Claude or Copilot paths.
- Preserve add-if-missing JSONC merge behavior, comments, formatting, user-selected models, custom variants, permissions, unrelated keys, and deterministic config-file precedence.
- Leave Claude and Copilot registration paths unchanged; sai-4-apply's non-canonical architecture remains out of scope.

## Capabilities

### New Capabilities

- `opencode-agent-census`: The managed opencode worker-name set is derived from binding dispatch declarations, with complete explicit defaults required for every discovered worker.
- `installer-config-guidance`: Installer output reports the complete derived managed-agent census, while the seeded opencode configuration remains a parity-checked settings projection with worker-specific defaults.
- `install-doctor-diagnostics`: Installer and doctor checks use the same complete derived census, so every dispatched worker is registered and missing settings are visible failures.

### Modified Capabilities

- `managed-worker-registry`: Preserve the existing Claude registry while deriving opencode managed-agent membership from every opencode binding and requiring explicit registration defaults for each derived worker.

## Impact

- `bin/install-flow.js`: derive the opencode census, validate settings coverage, and use it for configuration guidance and merging.
- `bin/doctor.js`: inherit the complete derived census for managed-agent checks.
- `configs/opencode.jsonc`: include the full derived worker set in the seeded agent map.
- `sai/orchestration/workers/bindings/opencode/*.md`: remain the dispatch source of truth and define the parseable declaration shape.
- `test/install-opencode.test.js`: cover census, guidance, defaults, and preservation behavior.
- `test/doctor-opencode-agent-preservation-step-2.test.js`: cover diagnostics for the complete census.
- `test/install-claude.test.js`: prove opencode census failures do not prevent shared-module import or Claude installation.
- `test/accessibility-coordinator-worker.test.js`: preserve the existing routed-worker compatibility boundary.

## Proposal Research Documentation

**Local files**: `bin/install-flow.js`; `bin/doctor.js`; `configs/opencode.jsonc`; `sai/orchestration/workers/bindings/opencode/`; `sai/install-manifest.json`; `test/install-opencode.test.js`; `test/doctor-opencode-agent-preservation-step-2.test.js`; `test/accessibility-coordinator-worker.test.js`; `openspec/specs/managed-worker-registry/spec.md`; `openspec/specs/opencode-config-install/spec.md`; `openspec/specs/opencode-agent-preservation/spec.md`; `docs/adr/0029-jsonc-parser-surgical-merge-for-opencode-agent-block.md`; `README.md`; `package.json`.

**External URLs**: None.

## Additional Notes

- Binding membership supplies names only. Model, `mode: "subagent"`, variant, and `permission.task` defaults remain explicit data keyed by each derived name because bindings cannot express those settings.
- The current binding declarations include `sai-1-spec-proposal-worker`, while the existing hand-maintained opencode settings omit its registration.
- Existing opencode entries remain user-owned by name. Installation adds only missing derived names, and doctor validates presence without comparing customized definitions.
- Binding parsing is intentionally coupled to the literal `task(subagent_type: "...")` form. Every binding file must contain exactly one such declaration, extracted names must be unique, and missing, duplicate, or malformed declarations must fail clearly rather than silently changing the census.
- The checked-in `configs/opencode.jsonc` remains a hand-maintained settings projection, not a membership source; automated parity coverage must fail when its managed keys do not equal the binding-derived census or a managed seed entry is not dispatchable as a subagent. Existing destinations that followed the old guidance may need the newly required registration before installation can complete.
- Repository registration defaults are the canonical managed values; the checked-in seed is a static projection that must match each derived worker's model, mode, variant, and task-permission values. Worker retirement is fail-closed and synchronized: a binding/default mismatch fails until both sides are updated together.
- Census validation is deferred until an opencode consumer requests the managed-agent projection. The existing `OPENCODE_MANAGED_AGENTS` export remains compatible through lazy resolution; doctor catches the same derivation errors and translates them into actionable diagnostics instead of failing during module import.
