**Complexity**: high (3 capabilities, coordinated source/projection/spec/test updates, no breaking change)

## Why

The project-agnostic ADR index template is classified and consumed as an instruction asset, but its source currently lives under `sai/compat/` while active runtime and specification requirements establish `sai/instructions/_templates/` as the canonical location. Relocating it now removes duplicate ownership and lets the existing recursive instruction projection serve all supported harnesses without changing template behavior.

## What Changes

- Move `sai/compat/_templates/adr-index.md` to `sai/instructions/_templates/adr-index.md` without changing its content.
- Update the Step 3 runtime consumer to reference the new exact path.
- Remove the dedicated compatibility projection, rely on the existing recursive `sai-instructions` projection for Claude Code, opencode, and GitHub Copilot, and register the former destination through the manifest's existing hash-guarded retirement mechanism.
- Align active installer documentation, source-classification specifications, projection specifications, and projection, retirement, doctor, and uninstall tests with the new ownership and destination.
- Preserve generated artifact locations, workflow ordering, harness behavior, and OpenSpec-owned skills.
- Leave archived change records unchanged.

## Capabilities

### New Capabilities

### Modified Capabilities

- `adr-index-maintenance`: relocate the project-agnostic template to the canonical instruction-template directory and update its runtime and installation references without changing the template contract or ADR index behavior.
- `orchestration-source-layout`: classify the project-agnostic ADR template as a shared instruction asset rather than a compatibility-only asset, while preserving compatibility-only source boundaries.
- `instruction-output-templates`: include the ADR template in the existing recursive instruction-template projection, remove its dedicated compatibility projection, and retire the former managed destination through the existing manifest mechanism.

## Impact

- `sai/compat/_templates/adr-index.md`
- `sai/instructions/_templates/adr-index.md`
- `sai/instructions/implement.md`
- `sai/install-manifest.json`
- `INSTALL.claude.md`
- `INSTALL.opencode.md`
- `INSTALL.copilot.md`
- `README.md`
- `openspec/specs/adr-index-maintenance/spec.md`
- `openspec/specs/orchestration-source-layout/spec.md`
- `openspec/specs/instruction-output-templates/spec.md`
- `test/install-manifest.test.js`
- `test/install-retirement-step-3.test.js`
- `test/install-claude.test.js`
- `test/install-opencode.test.js`
- `test/uninstall-enumeration.test.js`
- `test/doctor-retirement-step-5.test.js`
- `test/orchestration-source-layout-step-2.test.js`
- `test/orchestration-source-layout-step-6.test.js`
- `test/inline-coordinator-adapter-step-1.test.js`

The change affects repository source classification, the manifest-driven projection and retirement configuration, manual installer guidance, active specifications, and projection/layout/retirement assertions. `sai/install-manifest.json` removes the dedicated projection and adds a retirement entry consumed by existing installer, doctor, and uninstall logic; no installer implementation change is required. No other configuration change, dependency, API, generated-artifact, workflow-ordering, or production-code change is introduced.

## Proposal Research Documentation

**Local files**: `sai/compat/_templates/adr-index.md`, `sai/instructions/implement.md`, `sai/install-manifest.json`, `INSTALL.claude.md`, `INSTALL.opencode.md`, `INSTALL.copilot.md`, `README.md`, `openspec/specs/adr-index-maintenance/spec.md`, `openspec/specs/orchestration-source-layout/spec.md`, `openspec/specs/instruction-output-templates/spec.md`, `test/install-manifest.test.js`, `test/install-retirement-step-3.test.js`, `test/install-claude.test.js`, `test/install-opencode.test.js`, `test/uninstall-enumeration.test.js`, `test/doctor-retirement-step-5.test.js`, `test/orchestration-source-layout-step-2.test.js`, `test/orchestration-source-layout-step-6.test.js`, `test/inline-coordinator-adapter-step-1.test.js`

**External URLs**: None.

## Additional Notes

- The template content must remain byte-for-byte identical across the move.
- The destination is already covered by the recursive `sai-instructions` projection for all three harnesses; no replacement explicit projection is needed.
- The existing manifest retirement mechanism removes recognized former managed destinations and preserves modified or unrecognized copies; installer, doctor, and uninstall tests verify both paths.
- Historical archived references to the former path are intentionally preserved.
