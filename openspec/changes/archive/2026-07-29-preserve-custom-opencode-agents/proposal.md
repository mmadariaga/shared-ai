**Complexity**: medium

## Why

Opencode users are expected to customize agent models and variants, but installation currently treats customized managed agent entries as incompatible collisions and doctor reports them as errors. The installer and doctor should treat an existing agent name as user-owned while still bootstrapping missing repository agents.

## What Changes

- Preserve every existing opencode agent definition during configuration merging, including customized repository-managed entries.
- Add repository-default definitions only for installer-provisioned agent names that are missing.
- Change doctor validation from exact definition equality to presence-based acceptance for existing managed agent names.
- Narrow the existing opencode collision-safety contracts so customized entries are preserved rather than treated as incompatible collisions.
- Apply the preservation rule to the current numbered worker entries, `sai-2-design-worker` and `sai-3-implementation-worker`; do not add or restore a separate opencode coordinator profile.
- Honor the configured runtime values of existing customized numbered workers; repository model and variant values apply only to missing entries that are bootstrapped.
- Reconcile accepted ADR language that still describes exact-compatible opencode entries and blocking incompatible collisions.
- Add regression coverage for customized, missing, fully populated byte-identical, and malformed configurations in installation and doctor flows.
- Keep ordinary installer-managed file replacement, malformed-config fallback, and `opencode.json` precedence unchanged.

## Capabilities

### New Capabilities

- `opencode-agent-preservation`: Preserve existing opencode agent definitions and validate them by name ownership while bootstrapping missing definitions.

### Modified Capabilities

- `implementation-harness-bindings`: Narrow opencode agent collision handling to preserve existing definitions by name while retaining ordinary and Claude collision protections.
- `design-harness-bindings`: Narrow opencode design-agent collision handling to preserve existing definitions by name while retaining Claude collision protections.

## Impact

- `bin/install-flow.js`: opencode agent merge ownership and missing-entry bootstrap.
- `bin/doctor.js`: opencode managed-agent validation.
- `test/install-opencode.test.js`: installation preservation and missing-agent regression tests.
- `test/doctor-harness-inventory.test.js`: customized and missing-agent doctor regression tests.
- `openspec/specs/implementation-harness-bindings/spec.md`: existing opencode implementation-agent collision requirements.
- `openspec/specs/design-harness-bindings/spec.md`: existing opencode design-agent collision requirements.
- `docs/adr/0077-harness-specific-worker-bindings.md`: accepted opencode binding and collision policy.
- `docs/adr/0088-implementation-harness-projection-boundaries.md`: accepted implementation projection collision policy.

## Proposal Research Documentation

**Local files**: `bin/install-flow.js`; `bin/doctor.js`; `test/install-opencode.test.js`; `test/doctor-harness-inventory.test.js`; `configs/opencode.jsonc`; `INSTALL.opencode.md`; `README.md`; `GLOSSARY.md`; `openspec/specs/spec-quality/spec.md`; `openspec/specs/implementation-harness-bindings/spec.md`; `openspec/specs/design-harness-bindings/spec.md`; `openspec/changes/simplify-routed-phase-coordination/specs/implementation-harness-bindings/spec.md`; `openspec/changes/simplify-routed-phase-coordination/specs/implementation-coordinator/spec.md`; `openspec/changes/simplify-routed-phase-coordination/specs/opencode-coordinator-runtime/spec.md`; `openspec/changes/simplify-routed-phase-coordination/specs/design-harness-bindings/spec.md`; `docs/adr/0077-harness-specific-worker-bindings.md`; `docs/adr/0088-implementation-harness-projection-boundaries.md`; `openspec/config.yaml`

**External URLs**: None

## Dependencies and Ordering

- `simplify-routed-phase-coordination` is a prerequisite architecture change. Reconcile or apply it before this change's implementation, then use this change's modified `implementation-harness-bindings` delta as the authoritative collision policy for `sai-3-implementation-worker`.
- The two changes MUST NOT be applied with both the old exact-compatibility/blocking rule and this name-presence rule active.

## Additional Notes

- An existing agent name is the ownership boundary: installation does not patch, normalize, or repair any fields in that definition.
- A parseable configuration with a valid agent map still receives missing repository defaults; malformed roots or agent maps retain the existing manual-guidance fallback.
- This change deliberately accepts stale or otherwise customized fields in existing agent definitions because repository defaults are bootstrap values, not enforced configuration.
- The modified binding requirements supersede only opencode definition-collision behavior; ordinary managed-file collision handling and Claude worker ownership rules remain unchanged.
- The live opencode architecture uses wrapper-declared logical coordinator runtimes and only the numbered worker entries; the affected ADRs must retain that architecture while replacing their old opencode collision wording.
