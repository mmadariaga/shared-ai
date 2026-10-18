> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

Review moved to `/sai-4-review`, leaving a numbering gap before the audits. A continuous 1–7 sequence makes the current workflow easier to follow while preserving the identity and behavior of each audit.

## What Changes

- **BREAKING**: Security becomes `/sai-5-security`, performance becomes `/sai-6-performance`, and accessibility becomes `/sai-7-accessibility`; associated worker names change with them. Both Claude Code and opencode retire the former names without aliases.
- Update mirrored wrappers, worker matrices, presets, routing, progress-machine descriptions, review recommendations, status navigation, current documentation, and regression fixtures to the new mapping.
- Prepare audit settings before retired-file cleanup, preserving role-specific model tunables and preferring existing renamed destinations. Migrate command and worker preset keys without replacing explicit new keys or unrelated entries.
- Share exact-hash and tunable-stripped managed-body recognition across installation, diagnostics, and uninstallation. Preserve customized legacy bodies and identify them as pending resolution.
- Keep audit options, reports, execution conditions, internal unnumbered identifiers, unrelated commands, and historical ADR/DDR and archived-change contents unchanged.

## Capabilities

### New Capabilities

None; the change extends existing naming, installation, diagnostics, and preset contracts.

### Modified Capabilities

- `review-new-command`: Use renamed audit identities while preserving existing behavior.
- `review-phase-worker`: Use renamed audit identities while preserving existing behavior.
- `audit-command-options`: Use renamed audit identities while preserving existing behavior.
- `audit-command-progress-plans`: Use renamed audit identities while preserving existing behavior.
- `security-standalone-loading`: Use renamed audit identities while preserving existing behavior.
- `performance-standalone-loading`: Use renamed audit identities while preserving existing behavior.
- `accessibility-standalone-loading`: Use renamed audit identities while preserving existing behavior.
- `claude-command-seeds`: Use renamed audit identities while preserving existing behavior.
- `claude-worker-seeds`: Use renamed audit identities while preserving existing behavior.
- `claude-model-routing`: Use renamed audit identities while preserving existing behavior.
- `deep-review-command`: Use renamed audit identities while preserving existing behavior.
- `sai-command-naming`: Close the audit numbering gap and align command and worker identities.
- `preset-install`: Migrate audit-role keys as a narrow exception to preset preservation.
- `installation-and-retirement`: Preserve role settings before shared, identity-aware retirement.
- `install-doctor-diagnostics`: Report customized retired audit bodies as pending resolution.

## Impact

Concrete new and modified files in the selected staged implementation:

- `AGENTS.md`
- `README.md`
- `bin/audit-name-migration.js`
- `bin/doctor.js`
- `bin/install-flow.js`
- `bin/install-manifest.js`
- `bin/model-customization.js`
- `bin/retirement-identity.js`
- `bin/uninstall-flow.js`
- `bin/worker-matrix.js`
- `commands/claude/sai-5-security.md`
- `commands/claude/sai-6-performance.md`
- `commands/claude/sai-7-accessibility.md`
- `commands/opencode/sai-5-security.md`
- `commands/opencode/sai-6-performance.md`
- `commands/opencode/sai-7-accessibility.md`
- `docs/commands/sai-5-security.md`
- `docs/commands/sai-6-performance.md`
- `docs/commands/sai-7-accessibility.md`
- `docs/models.md`
- `docs/review-triage.md`
- `docs/sequential-pipeline.md`
- `fixtures/thin-command-wrappers-baseline.json`
- `sai-state/machines/accessibility-standalone.js`
- `sai-state/machines/performance-standalone.js`
- `sai-state/machines/security-standalone.js`
- `sai/commands/accessibility/coordinator.md`
- `sai/commands/accessibility/options.md`
- `sai/commands/deep-review/coordinator.md`
- `sai/commands/performance/options.md`
- `sai/commands/review/steps/close-review-outcome.md`
- `sai/commands/review/steps/resolve-review-analysis.md`
- `sai/commands/security/options.md`
- `sai/install-manifest.json`
- `sai/policies/artifact-review-contract.md`
- `sai/presets/claude/[sai-default]-OPUS.json`
- `sai/presets/opencode/[sai-default]-Go+Zen.json`
- `sai/presets/opencode/[sai-default]-Go.json`
- `sai/presets/opencode/[sai-default]-oAI-LUNA+Zen.json`
- `sai/presets/opencode/[sai-default]-oAI-SOL+Zen.json`
- `sai/tools/status.js`
- `test/accessibility-coordinator-worker.test.js`
- `test/agent-install-diagnostics.test.js`
- `test/agent-projection-strategy.test.js`
- `test/agent-sidecar-removal.test.js`
- `test/agent-tunable-ownership.test.js`
- `test/audit-numbering-migration.test.js`
- `test/canonical-opencode-agent-behavior.test.js`
- `test/claude-default-preset-alignment.test.js`
- `test/command-launcher-card.test.js`
- `test/design-coordinator-worker.test.js`
- `test/doctor-opencode-agent-preservation-step-2.test.js`
- `test/doctor-retirement-step-5.test.js`
- `test/implementation-harness-bindings-step-2.test.js`
- `test/implementation-harness-bindings-step-3.test.js`
- `test/install-claude.test.js`
- `test/install-manifest.test.js`
- `test/install-opencode.test.js`
- `test/install-retirement-step-3.test.js`
- `test/manual-opencode-contract-smoke.js`
- `test/model-customization-menu.test.js`
- `test/model-customization-taxonomy.test.js`
- `test/performance-coordinator-worker.test.js`
- `test/replace-legacy-build-family.test.js`
- `test/review-audit-options.test.js`
- `test/security-coordinator-worker.test.js`
- `test/status-tool.test.js`
- `test/uninstall-enumeration.test.js`
- `test/uninstall-execution.test.js`
- `test/worker-matrix-projection.test.js`
- `test/worker-matrix.test.js`

Existing invocations using retired names must switch to the new names. Customized legacy instruction bodies can require manual resolution. The functional review reported no findings. The coordinator reported six full-suite failures reproduced independently on the baseline with the same pre-existing `.sai/settings.jsonc`: one in `test/from-backlog.test.js`, four in `test/from-next-backlog-item.test.js`, and one in `test/to-backlog.test.js`. These provider-setting failures limit full-suite verification; they are not evidence of an audit-renaming regression. That settings file is unowned and excluded from the selected staged changes.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill
