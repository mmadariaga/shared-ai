> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

Different generic-agent names for the same roles complicated cross-harness use and reasoning. The implementation aligns opencode with Claude Code's existing budget-* identities without changing role behavior or model defaults.

## What Changes

- **BREAKING**: Rename opencode explore, executor, and budget to budget-explorer, budget-executor, and budget-subagent without compatibility aliases. External references require manual migration.
- Update source filenames, manifest projections and assignments, generated dispatch grants, budget bindings, overview and recovery dispatch instructions, shipped preset keys, customization targets, active documentation, and regression expectations. Claude Code retains its existing names.
- Migrate owned legacy model and optional variant settings before seeding missing destinations. Existing replacement settings win; conflicting settings are reported. Delete only unchanged, owned predecessors after successful replacement installation.
- Protect linked and other non-regular replacement destinations before any read or write. Preserve modified legacy files, local overrides, and legacy config entries; explain manual migration and the possible built-in explore override.
- Keep doctor and uninstall on the new manifest inventory with existing managed-content protections. Preserve historical decision records.
- Scope drift (not an implementation error): active-contract regression scanning excludes only generated root .stryker-tmp sandboxes, without deleting user artifacts or excluding real nested contracts or similarly named files.

## Capabilities

### New Capabilities

- generic-agent-name-migration: common identities and safe legacy installation migration, destination protection, repeat runs, and lifecycle coverage.

### Modified Capabilities

- agent-projection-strategy: align the affected generic-agent identity, dispatch, tuning, or current documentation contract.
- canonical-opencode-agent-behavior: align the affected generic-agent identity, dispatch, tuning, or current documentation contract.
- opencode-generic-agent-files: align the affected generic-agent identity, dispatch, tuning, or current documentation contract.
- opencode-defaults-alignment: align the affected generic-agent identity, dispatch, tuning, or current documentation contract.
- opencode-budget-explorer-triggers: align the affected generic-agent identity, dispatch, tuning, or current documentation contract.
- opencode-budget-executor-triggers: align the affected generic-agent identity, dispatch, tuning, or current documentation contract.
- budget-subagent-platform-bindings: align the affected generic-agent identity, dispatch, tuning, or current documentation contract.
- opencode-budget-cost-model-docs: align the affected generic-agent identity, dispatch, tuning, or current documentation contract.
- opencode-agent-migration-notice: align the affected generic-agent identity, dispatch, tuning, or current documentation contract.
- change-overview-generation-routing: align the affected generic-agent identity, dispatch, tuning, or current documentation contract.
- explorer-discovery: align the affected generic-agent identity, dispatch, tuning, or current documentation contract.
- opencode-explore-read-only: align the affected generic-agent identity, dispatch, tuning, or current documentation contract.
- design-harness-bindings: align the affected generic-agent identity, dispatch, tuning, or current documentation contract.
- unattended-resilience-rule: align the affected generic-agent identity, dispatch, tuning, or current documentation contract.
- review-worker-installation: align the affected generic-agent identity, dispatch, tuning, or current documentation contract.
- managed-worker-registry: align the affected generic-agent identity, dispatch, tuning, or current documentation contract.
- opencode-agent-preservation: align the affected generic-agent identity, dispatch, tuning, or current documentation contract.

## Impact

- Sources: agents/opencode/budget-explorer.md, agents/opencode/budget-executor.md, agents/opencode/budget-subagent.md replace the three legacy filenames.
- Installer and configuration surfaces: bin/install-flow.js, bin/capabilities.js, bin/model-customization.js, sai/install-manifest.json, and the four shipped sai/presets/opencode presets.
- Active contracts: skills/opencode/budget-explorer/SKILL.md, skills/opencode/budget-executor/SKILL.md, skills/opencode/budget-subagent/SKILL.md, sai/commands/design/steps/overview.md, sai/commands/explore/body.md, and sai/policies/unattended-runtime-recovery.md.
- Documentation: AGENTS.md, GLOSSARY.md, README.md, docs/skills.md.
- Regression coverage: new test/generic-agent-name-migration.test.js plus updated projection, ownership, installer, dispatch, customization, preset, uninstall, and active-contract tests, including test/command-launcher-card.test.js.
- Known limitations: external dispatch references and saved custom presets require manual updates. Protected legacy or project-local explore definitions and legacy configuration entries can still override built-in explore until manually migrated. Cross-harness dispatch is outside scope.
- Verification supplied by the implementation coordinator: 2544 tests, 2509 passed, 10 failed, 25 skipped. All 10 failures reproduced at the captured base: CI assertion, settings/provider fixtures, and Windows symlink privileges. This backfill did not rerun the suite.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Proposal Research Documentation

- openspec/schemas/sai-workflow/schema.yaml: local proposal and capability-delta requirements.
- bin/install-flow.js: legacy migration, destination protection, cleanup ordering, and notices.
- bin/capabilities.js: generic role-to-agent mappings for both harnesses.
- bin/model-customization.js: removal of legacy generic-agent customization identities.
- test/command-launcher-card.test.js: generated root sandbox exclusion and live-contract regression coverage.
- test/generic-agent-name-migration.test.js: isolated migration, settings preservation, destination protection, doctor, and uninstall cases examined in the selected diff.
- docs/skills.md: current naming, migration instructions, and local-override limitations.
- openspec/specs/agent-projection-strategy/spec.md, openspec/specs/canonical-opencode-agent-behavior/spec.md, openspec/specs/opencode-generic-agent-files/spec.md, and openspec/specs/opencode-defaults-alignment/spec.md: published identity, source, projection, and seed contracts.
- openspec/specs/opencode-budget-explorer-triggers/spec.md, openspec/specs/opencode-budget-executor-triggers/spec.md, openspec/specs/budget-subagent-platform-bindings/spec.md, and openspec/specs/opencode-budget-cost-model-docs/spec.md: published binding and model-resolution contracts.
- openspec/specs/opencode-agent-migration-notice/spec.md and openspec/specs/opencode-config-install/spec.md: migration notices and unchanged legacy configuration preservation.
- openspec/specs/change-overview-generation-routing/spec.md, openspec/specs/explorer-discovery/spec.md, openspec/specs/opencode-explore-read-only/spec.md, openspec/specs/design-harness-bindings/spec.md, and openspec/specs/unattended-resilience-rule/spec.md: affected dispatch and research identities.
- openspec/specs/review-worker-installation/spec.md, openspec/specs/managed-worker-registry/spec.md, openspec/specs/shared-ai-uninstall/spec.md, and openspec/specs/opencode-agent-preservation/spec.md: delegation, lifecycle, and ownership contracts.
- Verified Ready to Propose block: supplied intent and backlog origin https://github.com/mmadariaga/shared-ai/issues/195; the URL was validated as provenance, not fetched as remote research.
