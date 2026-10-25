> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

Model customization could leave complete project-local definitions shadowing later global updates and retaining retired workflow references. Hash-gated retirement left edited obsolete definitions installed, including an old opencode explore agent able to shadow the built-in agent.

## What Changes

- **BREAKING**: Give all command wrappers, Generic Agent sources, and worker templates an explicit user customization boundary. Preserve native model/reasoning tuning and the exact suffix while replacing other managed content; unmarked legacy definitions retain tuning only, without backups.
- Use customizable-copy for commands and retain tunable-seed for agents. Normalize opencode command model#variant while preserving separate agent model and optional variant.
- Refresh existing manifest-owned project-local commands and agents during current-project installation and named-project setup, without creating missing local copies or scanning other projects.
- **BREAKING**: Delete exact declared retired files regardless of content. Remove old opencode explore.md, executor.md, and budget.md agents and audit-definition cloning without transferring old tuning or text. Keep targeted preset-key compatibility.
- Unlink retired file symlinks without touching targets; skip directories and linked parents rather than deleting recursively. Validate exact relative retirement paths.
- Ignore native tuning and the explicit suffix in doctor managed-content comparisons, including existing local definitions. Keep guarded uninstall protection for custom suffixes and other body changes. Retain historical retirement hashes for diagnostics and guarded uninstall, not installer deletion gates.
- Preserve global opencode agent-map entries outside installer ownership, as explicitly confirmed by the user.

## Capabilities

### New Capabilities
- `managed-definition-customizations`: Explicit user regions, native tuning, diagnostics, and guarded uninstall.
- `project-local-definition-refresh`: Refresh existing managed definitions only in the selected project.

### Modified Capabilities
- `installation-and-retirement`: Align installation, retirement, or lifecycle behavior with the implemented ownership rules.
- `generic-agent-name-migration`: Align installation, retirement, or lifecycle behavior with the implemented ownership rules.
- `install-doctor-diagnostics`: Align installation, retirement, or lifecycle behavior with the implemented ownership rules.
- `install-command-overwrite`: Align installation, retirement, or lifecycle behavior with the implemented ownership rules.
- `root-destination-retirement`: Align installation, retirement, or lifecycle behavior with the implemented ownership rules.
- `retired-root-contract-cleanup`: Align installation, retirement, or lifecycle behavior with the implemented ownership rules.
- `orphan-inline-caller-retirement`: Align installation, retirement, or lifecycle behavior with the implemented ownership rules.
- `legacy-orchestration-retirement`: Align installation, retirement, or lifecycle behavior with the implemented ownership rules.
- `dead-review-step-retirement`: Align installation, retirement, or lifecycle behavior with the implemented ownership rules.
- `command-runner-layout`: Align installation, retirement, or lifecycle behavior with the implemented ownership rules.
- `agent-projection-strategy`: Align installation, retirement, or lifecycle behavior with the implemented ownership rules.
- `managed-worker-registry`: Align installation, retirement, or lifecycle behavior with the implemented ownership rules.
- `opencode-worker-system-prompt`: Align installation, retirement, or lifecycle behavior with the implemented ownership rules.
- `preset-install`: Align installation, retirement, or lifecycle behavior with the implemented ownership rules.

## Impact

- Added `bin/managed-customizations.js`; modified `bin/install-flow.js`, `bin/install-manifest.js`, `bin/audit-name-migration.js`, `bin/setup.js`, `bin/doctor.js`, and `bin/uninstall-flow.js`.
- Modified `sai/install-manifest.json`, command wrappers under `commands/claude/` and `commands/opencode/`, and Generic Agent sources and worker templates under both harness agent directories.
- Added `test/command-customizations.test.js` and `test/install-retirement-ownership.test.js`; adjusted existing migration, installation, diagnostic, wrapper, and publication test expectations.
- Updated `AGENTS.md`, `README.md`, `docs/models.md`, `docs/skills.md`, `docs/doctor.md`, and `docs/tool-capabilities.md`.
- Accepted limits: edits above the marker and unmarked non-tunable edits are replaced without backups; declared retired files lose all settings and text; other projects need their own refresh; linked current definitions and retired directories require manual resolution. Global configuration-map ownership remains unchanged.
- Unrelated untracked `.sai/` configuration, publishing, commits, model-default changes, and pipeline-runtime changes are outside this record.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Proposal Research Documentation

**Local files**:
- `AGENTS.md`
- `README.md`
- `agents/claude/budget-executor.md`
- `agents/claude/budget-explorer.md`
- `agents/claude/budget-subagent.md`
- `agents/claude/worker-template.md`
- `agents/opencode/budget-executor.md`
- `agents/opencode/budget-explorer.md`
- `agents/opencode/budget-subagent.md`
- `agents/opencode/worker-template.md`
- `bin/audit-name-migration.js`
- `bin/doctor.js`
- `bin/install-flow.js`
- `bin/install-manifest.js`
- `bin/managed-customizations.js`
- `bin/setup.js`
- `bin/uninstall-flow.js`
- `commands/claude/from-backlog.md`
- `commands/claude/from-next-backlog-item.md`
- `commands/claude/sai-1-spec.md`
- `commands/claude/sai-2-design.md`
- `commands/claude/sai-3-implement.md`
- `commands/claude/sai-4-review.md`
- `commands/claude/sai-5-security.md`
- `commands/claude/sai-6-performance.md`
- `commands/claude/sai-7-accessibility.md`
- `commands/claude/sai-archive.md`
- `commands/claude/sai-backfill.md`
- `commands/claude/sai-build.md`
- `commands/claude/sai-commit.md`
- `commands/claude/sai-context-cache-ttl-benchmark.md`
- `commands/claude/sai-deep-review.md`
- `commands/claude/sai-explore.md`
- `commands/claude/sai-merge.md`
- `commands/claude/sai-plan.md`
- `commands/claude/sai-retire-docs.md`
- `commands/claude/sai-status.md`
- `commands/claude/sai-worktree.md`
- `commands/claude/to-backlog.md`
- `commands/claude/to-pr.md`
- `commands/opencode/from-backlog.md`
- `commands/opencode/from-next-backlog-item.md`
- `commands/opencode/sai-1-spec.md`
- `commands/opencode/sai-2-design.md`
- `commands/opencode/sai-3-implement.md`
- `commands/opencode/sai-4-review.md`
- `commands/opencode/sai-5-security.md`
- `commands/opencode/sai-6-performance.md`
- `commands/opencode/sai-7-accessibility.md`
- `commands/opencode/sai-archive.md`
- `commands/opencode/sai-backfill.md`
- `commands/opencode/sai-build.md`
- `commands/opencode/sai-commit.md`
- `commands/opencode/sai-context-cache-ttl-benchmark.md`
- `commands/opencode/sai-deep-review.md`
- `commands/opencode/sai-explore.md`
- `commands/opencode/sai-merge.md`
- `commands/opencode/sai-plan.md`
- `commands/opencode/sai-retire-docs.md`
- `commands/opencode/sai-status.md`
- `commands/opencode/sai-worktree.md`
- `commands/opencode/to-backlog.md`
- `commands/opencode/to-pr.md`
- `docs/doctor.md`
- `docs/models.md`
- `docs/skills.md`
- `docs/tool-capabilities.md`
- `openspec/schemas/sai-workflow/schema.yaml`
- `openspec/schemas/sai-workflow/templates/proposal.md`
- `openspec/specs/agent-projection-strategy/spec.md`
- `openspec/specs/command-runner-layout/spec.md`
- `openspec/specs/dead-review-step-retirement/spec.md`
- `openspec/specs/generic-agent-name-migration/spec.md`
- `openspec/specs/install-command-overwrite/spec.md`
- `openspec/specs/install-doctor-diagnostics/spec.md`
- `openspec/specs/installation-and-retirement/spec.md`
- `openspec/specs/legacy-orchestration-retirement/spec.md`
- `openspec/specs/managed-worker-registry/spec.md`
- `openspec/specs/opencode-worker-system-prompt/spec.md`
- `openspec/specs/orphan-inline-caller-retirement/spec.md`
- `openspec/specs/preset-install/spec.md`
- `openspec/specs/proposal-research-documentation/spec.md`
- `openspec/specs/retired-root-contract-cleanup/spec.md`
- `openspec/specs/root-destination-retirement/spec.md`
- `sai/install-manifest.json`
- `test/command-customizations.test.js`
- `test/install-retirement-ownership.test.js`

**External URLs**:
None

## Request Additional Notes
This is a post-hoc record of the changes implemented in this conversation. The most recent completed full suite reported 2677 passing tests, 7 skipped tests, and no failures. The pre-existing untracked .sai/ directory must remain untouched and is not part of the installer change.
