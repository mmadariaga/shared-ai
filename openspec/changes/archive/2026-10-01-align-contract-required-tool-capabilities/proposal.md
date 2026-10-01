> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.
**Complexity**: high

## Why

SAI agent and command access differed between Claude Code and opencode, while independent native inventories could drift and inherited permissions could block required operations. The implemented change centralizes required capabilities and distinguishes environmental absence, effective permission, and authorization to perform an operation.

## What Changes

- Added canonical capability profiles and assignments for all fifteen managed workers, the three Generic Agent roles in both harnesses, and all nineteen commands.
- Added profile inheritance, validation, native translation, installed profile disclosure, and independent command requirements.
- Generated Claude Code agent tool declarations and command pre-approvals, and ordered deny-default opencode V2 permissions.
- Added profile checks after worker task disclosure and before command card selection without transferring worker or coordinator responsibilities.
- Preserved contract-specific exceptions: Implement's direct initial URL fetch, Design's delegated research, Backfill's authorized draft writes, and Archive's shell-based authorized mutations.
- Restricted explorer tool selection to granted capabilities and classified diagnostics before presenting eligible missing-tool notices with remediation.
- Distinguished panel permission errors from runtime panel absence while preserving existing unavailable-panel continuation.
- Added an access-evidence checker, deterministic notice filter, projection tests, and an opt-in test of the actual opencode permission evaluator.
- Preserved user-owned model and effort/variant settings during managed updates, supported structured model frontmatter, and made doctor accept tunable-only differences.
- Documented native limits: opencode commands retain their active primary agent; Claude Code allowed-tools pre-approves rather than denies unlisted tools; Code Mode does not isolate permission-free session utilities.

## Capabilities

### New Capabilities

- `contract-tool-capabilities`: Canonical profiles, native translation, installed disclosure, independent command requirements, access evidence, and remediation.

### Modified Capabilities

- `managed-worker-registry`: Generated worker grants, current inventory, native V2 permissions, and contract-specific delegation.
- `opencode-generic-agent-files`: Compiled profiles and access-check references in Generic Agent wrappers.
- `agent-projection-strategy`: Current manifest-derived agent inventory and compiled source installation.
- `agent-tunable-ownership`: Compiled-source seeding, tunable preservation, textual block extraction, compatible reuse, and current uninstall inventory.
- `per-command-tool-scoping`: Accurate profile-derived command pre-approval semantics.
- `coordinator-allowlist`: Canonical coordinator grants instead of independent native inventories.
- `explicit-claude-apply-execution-allowlist`: Generated Apply execution pre-approvals.
- `tool-preference-ladder`: Profile-aware research selection.
- `ladder-discard-logging`: Classified diagnostics and filtered public notices.
- `explorer-research-capability`: Equivalent required research access with auxiliary grants.
- `opencode-explore-read-only`: Deny-default V2 explorer permissions.
- `harness-panel-render-binding`: Permission-versus-absence handling without panel redesign.
- `explore-codegraph-fallback-notice`: Explorer-owned detection with consumer-rendered eligible remediation notices.

## Impact

New files:
- `bin/capabilities.js`
- `sai/policies/tool-access.md`
- `sai/tools/tool-access.js`
- `docs/tool-capabilities.md`
- `test/capability-profiles.test.js`
- `test/capability-runtime.test.js`
- `test/helpers/capability-source.js`

Modified files and source groups:
- `sai/install-manifest.json`
- `bin/worker-matrix.js`
- `bin/install-manifest.js`
- `bin/install-flow.js`
- `bin/doctor.js`
- `agents/claude/worker-template.md` and `agents/opencode/worker-template.md`
- All three Generic Agent sources under each of `agents/claude/` and `agents/opencode/`
- All nineteen wrappers under each of `commands/claude/` and `commands/opencode/`
- `sai/adapters/claude/boot.md` and `sai/adapters/opencode/boot.md`
- `sai/adapters/claude/panel-render.md` and `sai/adapters/opencode/panel-render.md`
- `sai/commands/design/steps/research.md`
- `sai/commands/explore/instructions.md`
- `sai/policies/explore-agent.md`
- `sai/policies/tool-execution-permissions.md`
- `sai/policies/tool-resolution.md`
- `AGENTS.md`
- Existing installation, projection, worker-delegation, command, research, tunable-ownership, and uninstall regression tests.

Profile grants remain distinct from mutation authorization. Native mechanisms do not provide identical enforcement guarantees. The coordinator reported 1921 passing tests, four skips, and no failures, plus a passing opt-in actual opencode permission-evaluator test. Claude Code live tool execution remains unverified; evaluator results do not prove model-driven tool execution or environmental availability.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Proposal Research Documentation

Consulted implementation evidence:
- Staged changes to `sai/install-manifest.json`, `bin/capabilities.js`, `bin/worker-matrix.js`, `bin/install-manifest.js`, `bin/install-flow.js`, and `bin/doctor.js`.
- Staged agent-template and Generic Agent changes under `agents/claude/` and `agents/opencode/`.
- Staged wrapper changes under `commands/claude/` and `commands/opencode/`.
- Staged changes to `sai/policies/tool-access.md`, `sai/policies/explore-agent.md`, `sai/policies/tool-execution-permissions.md`, `sai/policies/tool-resolution.md`, and `sai/tools/tool-access.js`.
- Staged changes to both boot and panel adapters, `sai/commands/design/steps/research.md`, and `sai/commands/explore/instructions.md`.
- Staged changes to `docs/tool-capabilities.md`, `test/capability-profiles.test.js`, and `test/capability-runtime.test.js`.

Consulted current contracts and schema:
- `openspec/schemas/sai-workflow/schema.yaml`
- `openspec/specs/managed-worker-registry/spec.md`
- `openspec/specs/opencode-generic-agent-files/spec.md`
- `openspec/specs/agent-projection-strategy/spec.md`
- `openspec/specs/agent-tunable-ownership/spec.md`
- `openspec/specs/per-command-tool-scoping/spec.md`
- `openspec/specs/coordinator-allowlist/spec.md`
- `openspec/specs/explicit-claude-apply-execution-allowlist/spec.md`
- `openspec/specs/tool-preference-ladder/spec.md`
- `openspec/specs/ladder-discard-logging/spec.md`
- `openspec/specs/explorer-research-capability/spec.md`
- `openspec/specs/opencode-explore-read-only/spec.md`
- `openspec/specs/harness-panel-render-binding/spec.md`
- `openspec/specs/explore-codegraph-fallback-notice/spec.md`
- `openspec/specs/opencode-permission-template/spec.md`

Native-reference URLs recorded in the implementation documentation were not independently fetched during this backfill.

## Request Additional Notes

The contract inventory found that Design's external-URL listing does not itself require direct web access, whereas Implement's initial documentation read explicitly does. RED/GREEN showed no identified delegation requirement in the examined contracts; decide grants from their complete current contracts rather than their existing tool lists. Archive's authorized Direct Build execution performs mutations through shell, while Backfill has an authorized draft-write exception. These are research leads, not a final permission table.

The exact effective behavior of opencode permission actions, Code Mode auxiliary grants, Claude Code command `allowed-tools`, and current panel-tool availability still requires verification. No runtime permission experiment or implementation was performed during this exploration.
