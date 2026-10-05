> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

**Complexity**: high

## Why

Late plan-parsing failures, incomplete existing-test adaptations, scope checks blocked by unrelated work, and stale HEAD guard references caused avoidable stops and manual recovery despite successful production implementation. The implementation checks compatibility before execution and preserves ownership evidence throughout retries and commits.

## What Changes

- Added read-only preflight to Apply's existing tool and made it mandatory at Implement delivery and Apply run start. It reuses execution interpretation functions and reports located errors without running tests.
- Required semantic review of existing contract consumers and shared fixtures in Design, with exact-path and failure-mode carry-through into RED in Implement.
- **BREAKING**: Verify and close now require retained execution references; every close mode requires an explicit HEAD guard reference. Missing or corrupt state blocks continuation rather than silently falling back.
- Added coordinator-owned immutable file/index baselines, stable run identities, per-dispatch checkpoints, pre-write checks for initially dirty owned paths, and exact planning provenance.
- Distinguished preserved unrelated work, planning inputs, current execution changes, and earlier closed owned changes in verification and reports.
- Added settled receipts for previously closed Steps, including declined commits, and coordinator plan checkpoints for authorized bookkeeping.
- Extended affected-file declarations with bounded generated families and expected counts. Shared parsing and derivative manifest count lines keep declaration consumers consistent; Apply resolves exact files before close.
- Required fresh HEAD guard windows after authorized commits and bounded restoration of initial unrelated staging after Apply's guard-remediation reset.
- Changed Step and terminal documentation commits to exact-path `git commit --only`, preserving unrelated staging and stopping when isolation cannot be established.
- Preferred safe, viable agent-executed continuations with the least remaining human work while retaining pinned choices, authorizations, verification, and retry limits.
- Added regression coverage for parser compatibility, carry-through, unrelated work, dirty paths, immutable state recovery, dispatch ownership, generated outputs, settled state, bookkeeping, guard transitions, manifest parsing, and harness parity.

## Capabilities

### New Capabilities

- None. Existing planning, Apply, manifest, guard, tool-resolution, and stop-policy capabilities were extended.

### Modified Capabilities

- `apply-step-tool`: executable-plan preflight, immutable records, dispatch checks, baseline-aware verification, isolated close, and bookkeeping receipts.
- `apply-coordinator-ownership`: coordinator-owned run state, provenance, retained receipts, preservation checks, guard continuity, and terminal filtering.
- `tasks-scaffold-format`: the bounded generated-family exception within the existing closed token vocabulary and five-field scaffold.
- `tasks-existing-test-impact`: semantic consumer and fixture review supporting adaptations or None.
- `implement-design-carry-through`: mandatory Apply-compatible delivery preflight and exact RED carry-through.
- `design-file-manifest-tool`: shared declaration parsing, generated-count fold output, and intentional empty declarations.
- `design-target-state`: bounded generated derivative lines and explicit empty declarations alongside unchanged ordinary net-fold behavior.
- `apply-pre-commit-file-report`: preserved initial work stays visible without becoming a discrepancy or commit content.
- `no-commit-guard`: Apply's bounded unrelated-index restoration and fresh HEAD windows.
- `shared-tool-resolution`: invocation forms for the extended Apply tool.
- `unplanned-stop-options`: least-human-intervention recommendations with unchanged contract-pinned choices.

## Impact

Modified instruction and policy files:
- `sai/commands/apply/coordinator.md`
- `sai/commands/apply/runner.md`
- `sai/commands/apply/steps/terminal-lifecycle.md`
- `sai/commands/design/steps/tasks.md`
- `sai/commands/implement/steps/validation.md`
- `sai/policies/no-commit-guard.md`
- `sai/policies/stop-options.md`
- `sai/policies/tool-resolution.md`

Modified tools and regression tests:
- `sai/tools/apply-step.js`
- `sai/tools/file-manifest.js`
- `test/apply-step-tool.test.js`
- `test/file-manifest-tool.test.js`

Claude Code and opencode consume shared instructions and tool behavior while retaining their existing presentation and dispatch mechanisms. Initial unrelated content and staging remain in place. Temporary record loss blocks continuation. Semantic test-impact completeness remains agent-owned rather than guaranteed by preflight. No dependency was introduced. Existing approvals, recovery limits, RED ownership, GREEN's test prohibition, and implementation.md versioning remain unchanged.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Proposal Research Documentation

**Local files**:
- `sai/tools/apply-step.js`
- `sai/tools/file-manifest.js`
- `test/apply-step-tool.test.js`
- `test/file-manifest-tool.test.js`
- `sai/commands/apply/coordinator.md`
- `sai/commands/apply/runner.md`
- `sai/commands/apply/steps/terminal-lifecycle.md`
- `sai/commands/design/steps/tasks.md`
- `sai/commands/implement/steps/validation.md`
- `sai/policies/no-commit-guard.md`
- `sai/policies/stop-options.md`
- `sai/policies/tool-resolution.md`
- `openspec/schemas/sai-workflow/schema.yaml`
- `openspec/schemas/sai-workflow/templates/proposal.md`
- `openspec/specs/apply-step-tool/spec.md`
- `openspec/specs/apply-coordinator-ownership/spec.md`
- `openspec/specs/design-file-manifest-tool/spec.md`
- `openspec/specs/design-target-state/spec.md`
- `openspec/specs/tasks-scaffold-format/spec.md`
- `openspec/specs/tasks-existing-test-impact/spec.md`
- `openspec/specs/implement-design-carry-through/spec.md`
- `openspec/specs/apply-pre-commit-file-report/spec.md`
- `openspec/specs/no-commit-guard/spec.md`
- `openspec/specs/shared-tool-resolution/spec.md`
- `openspec/specs/unplanned-stop-options/spec.md`

**External URLs**: None consulted. The supplied backlog and project URLs are retained below as request context, not research evidence.

## Request Additional Notes

Backlog item: https://github.com/mmadariaga/shared-ai/issues/25. The issue records the accepted scope, E1-E11, and I1-I11 and is included in https://github.com/users/mmadariaga/projects/1.
