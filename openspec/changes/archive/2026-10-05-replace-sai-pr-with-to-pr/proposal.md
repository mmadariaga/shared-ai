> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

**Complexity**: high (9 capabilities)

## Why

The publication workflow needed GitHub pull requests and GitLab merge requests without requiring an OpenSpec change. The implemented universal to-pr skill uses committed Git changes as its primary content source, accepts optional OpenSpec context, and preserves explicit, independent approval of publication and push operations.

## What Changes

- Replaced the sai-pr command with a universal to-pr skill and invocation wrappers for Claude Code and OpenCode.
- Added provider-neutral collection, destination selection, content querying, publication, push, and read-only recovery mechanics in `sai/tools/to-pr.js`.
- Added separate GitHub and GitLab adapters and conditionally loaded provider instructions.
- Implemented creation and updates to existing requests, restricting updates to title and description.
- Required complete content presentation before publication approval, with renewed approval after changes to content, destination, baseline, or HEAD.
- Required a separate approval for each necessary non-force push and verified remote HEAD before publication.
- Used committed branch history and diff for drafting, distinguished pending files, and made OpenSpec documents optional supporting context.
- Added private publication receipts outside the repository, rejected unsafe or symlinked receipt paths, and made recovery read-only.
- Added a concrete missing-temporary-root blocker without creating or repairing shared roots.
- Retired managed sai-pr wrappers, cards, template, and tool through installer migration while preserving modified overrides and existing user pr.md documents.
- Updated status navigation, capability assignments, documentation, model customization, presets, and tests.
- Added provider, authorization, recovery, receipt-boundary, installation, and retirement regression coverage with portable routine temporary fixtures.

## Capabilities

### New Capabilities

- `to-pr`: Committed-Git preparation, complete content review, separately authorized publication and push, creation or title/description update, private receipts, and read-only recovery.
- `provider-resolution`: Provider and repository resolution with explicit/configuration/remote precedence, self-hosted GitLab clarification, and verified source and destination selection.
- `installation-and-retirement`: Both-harness installation of to-pr and managed retirement of sai-pr without deleting user documents or modified overrides.

### Modified Capabilities

- `pr-collect`: Remove the retired pr.js collection requirements, replaced by to-pr collection.
- `pr-apply`: Remove the retired create-only pr.js apply requirements, replaced by provider-neutral publication and independent push approval.
- `pr-tool-paths`: Remove the retired pr.js invocation contract.
- `pr-command-prose`: Remove the retired sai-pr command and generated pr.md workflow.
- `contract-tool-capabilities`: Replace the sai-pr assignment with the scoped to-pr command profile while retaining twenty-one shipped commands.
- `artifact-reference-model`: Remove pr.md from the mandatory review/audit artifact-loading scope while retaining explicit artifact references for those commands.

## Impact

New files:
- `commands/claude/to-pr.md`
- `commands/opencode/to-pr.md`
- `sai/tools/to-pr.js`
- `sai/tools/to-pr-github.js`
- `sai/tools/to-pr-gitlab.js`
- `skills/universal/to-pr/SKILL.md`
- `skills/universal/to-pr/description-format.md`
- `skills/universal/to-pr/providers/github.md`
- `skills/universal/to-pr/providers/gitlab.md`
- `skills/universal/to-pr/providers/registry.json`
- `test/to-pr.test.js`

Modified integration files include `sai/install-manifest.json`, `bin/install-manifest.js`, `bin/model-customization.js`, both harness boot adapters, `sai/tools/status.js`, `sai/policies/status-picker.md`, `sai/policies/prereqs-paths.md`, `AGENTS.md`, `README.md`, `docs/on-demand-commands.md`, command baseline fixtures, shipped model presets, and the command, installer, doctor, model-customization, status, and hand-back tests.

Removed sources include both `commands/{claude,opencode}/sai-pr.md` wrappers, `sai/commands/pr/`, `sai/tools/pr.js`, `docs/commands/sai-pr.md`, and `test/pr-tool.test.js`. Existing user pr.md files are preserved.

Known boundaries: publication uses matching source and destination repositories; cross-repository branches require clarification. Missing tools, authentication, local target refs, or safe temporary storage block execution instead of triggering installation or repair. POSIX temporary directories are private; the preparation helper claims no additional Windows privacy guarantee. Independent approval adds interaction, and descriptions must remain useful from Git alone.

The supplied final functional review reported High=0 Medium=0 Low=0. The supplied full-suite result was 2072 passed, 4 skipped, and no failures; these results were not independently rerun during backfill.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Proposal Research Documentation

Consulted implementation and integration sources:
- `skills/universal/to-pr/SKILL.md`: ordered preparation, review, independent authorization, publication, and recovery flow.
- `skills/universal/to-pr/description-format.md`: title and description drafting structure.
- `skills/universal/to-pr/providers/github.md` and `skills/universal/to-pr/providers/gitlab.md`: provider-specific publication mechanics.
- `skills/universal/to-pr/providers/registry.json`: provider registrations.
- `sai/tools/to-pr.js`: collection, resolution, destination verification, approval tokens, push, receipts, and recovery.
- `sai/tools/to-pr-github.js` and `sai/tools/to-pr-gitlab.js`: request matching and create/update adapters.
- `sai/tools/to-backlog-github.js`: shared receipt containment, ownership, privacy, and link validation reused by to-pr.
- `sai/install-manifest.json`, `bin/install-manifest.js`, and `bin/model-customization.js`: installation, capability assignments, retirement destinations, and customization changes.
- `commands/claude/to-pr.md` and `commands/opencode/to-pr.md`: both-harness invocation wrappers.
- `test/to-pr.test.js`: provider, approval, recovery, receipt, temporary-root, and installation regression evidence.
- `AGENTS.md`, `README.md`, and `sai/policies/prereqs-paths.md`: publication documentation and artifact-path retirement.

Consulted existing specifications:
- `openspec/specs/pr-collect/spec.md`
- `openspec/specs/pr-apply/spec.md`
- `openspec/specs/pr-tool-paths/spec.md`
- `openspec/specs/pr-command-prose/spec.md`
- `openspec/specs/artifact-reference-model/spec.md`
- `openspec/specs/contract-tool-capabilities/spec.md`

Consulted authoring contract: `openspec/schemas/sai-workflow/schema.yaml`. The installed backfill instruction and spec validation rubric were also consulted for the mandatory POST-HOC marker, draft structure, and complexity derivation. No external URLs were fetched during backfill.

## Request Additional Notes

Related backlog item: https://github.com/mmadariaga/shared-ai/issues/19. It was published before implementation details were agreed and has not been updated to reflect their subsequent acceptance.
