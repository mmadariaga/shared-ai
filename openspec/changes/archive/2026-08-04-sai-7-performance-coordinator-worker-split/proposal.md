**Complexity**: high

## Why

The `/sai-7-performance` audit is still executed inline, so its terminal lifecycle, technical research, and single-artifact write boundary are coupled in one session. The security split now provides a proven routed-audit pattern; applying the same boundary to performance supplies the second real audit instance needed to decide whether shared coordinator mechanics should be generalized without changing audit behavior.

## What Changes

- Split the performance phase for Claude Code and opencode into a terminal-only coordinator and a routed performance worker.
- Keep the performance worker responsible for prerequisites, change resolution, scope inference, tier-aware research, diagnostics, findings, and `performance.md` production and verification.
- Add Claude Code and opencode worker bindings for dispatch, continuation, bounded recovery, and read-only research.
- Register and project the managed performance worker through the installer surfaces while keeping GitHub Copilot on its existing inline path.
- Preserve the current performance scope options, parent-branch inference, tier definitions, severity vocabulary, delegation caps, and single-writable-artifact boundary.

## Capabilities

### New Capabilities

- `performance-phase-coordinator`: Routes the performance lifecycle, validates worker lifecycle results, maintains terminal state, and presents the completion navigation without performing technical audit I/O.
- `performance-phase-worker`: Performs the complete evidence-based backend, frontend, database, and queue performance audit and exclusively creates and verifies `performance.md`.
- `performance-worker-bindings`: Provides Claude Code and opencode dispatch, continuation, bounded recovery, and read-only tier-research bindings for the performance worker.
- `performance-worker-installation`: Registers and projects the managed performance worker and its supported harness surfaces with deterministic ownership and parity checks.

### Modified Capabilities

- None.

## Impact

- `sai/commands/sai-7-performance.md`
- `sai/commands/performance/coordinator.md`
- `sai/commands/performance/invocation.md`
- `sai/orchestration/workers/sai-7-performance-worker.md`
- `sai/orchestration/workers/bindings/claude/performance-worker.md`
- `sai/orchestration/workers/bindings/opencode/performance-worker.md`
- `agents/claude/sai-7-performance-worker.md`
- `skills/claude/sai-7-performance-worker/SKILL.md`
- `skills/opencode/sai-7-performance-worker/SKILL.md`
- `commands/claude/sai-7-performance.md`
- `commands/opencode/sai-7-performance.md`
- `sai/install-manifest.json`
- `bin/install-flow.js`
- `test/install-manifest.test.js`
- `test/uninstall-enumeration.test.js`

No production application code, external dependency, performance tier definition, severity vocabulary, runtime configuration, performance instruction, or Copilot prompt is changed by the audit execution itself.

## Proposal Research Documentation

**Local files**: `sai/instructions/performance.md`; `sai/commands/sai-7-performance.md`; `sai/commands/security/coordinator.md`; `sai/commands/security/invocation.md`; `sai/orchestration/coordinator-contract.md`; `sai/orchestration/worker-lifecycle.md`; `sai/orchestration/inline-invocation.md`; `sai/orchestration/workers/sai-6-security-worker.md`; `sai/orchestration/workers/bindings/claude/security-worker.md`; `sai/orchestration/workers/bindings/opencode/security-worker.md`; `sai/install-manifest.json`; `commands/claude/sai-7-performance.md`; `commands/opencode/sai-7-performance.md`; `commands/copilot/sai-7-performance.prompt.md`; `agents/claude/sai-6-security-worker.md`; `skills/claude/sai-6-security-worker/SKILL.md`; `skills/opencode/sai-6-security-worker/SKILL.md`; `configs/opencode.jsonc`; `INSTALL.claude.md`; `INSTALL.opencode.md`; `INSTALL.copilot.md`; `GLOSSARY.md`; `AGENTS.md`; `README.md`; `openspec/schemas/sai-workflow/schema.yaml`; `openspec/schemas/sai-workflow/templates/performance.md`; `openspec/changes/archive/2026-08-04-sai-6-security-coordinator-worker-split/proposal.md`; `openspec/changes/archive/2026-08-04-sai-6-security-coordinator-worker-split/design.md`; `openspec/changes/archive/2026-08-04-sai-6-security-coordinator-worker-split/tasks.md`; `openspec/changes/archive/2026-08-04-sai-6-security-coordinator-worker-split/interfaces.md`; `openspec/changes/archive/2026-08-04-sai-6-security-coordinator-worker-split/specs/security-phase-coordinator/spec.md`; `openspec/changes/archive/2026-08-04-sai-6-security-coordinator-worker-split/specs/security-phase-worker/spec.md`; `openspec/changes/archive/2026-08-04-sai-6-security-coordinator-worker-split/specs/security-worker-bindings/spec.md`; `openspec/changes/archive/2026-08-04-sai-6-security-coordinator-worker-split/specs/security-worker-installation/spec.md`.

**External URLs**: None.

## Additional Notes

- The dependent security change is archived at `openspec/changes/archive/2026-08-04-sai-6-security-coordinator-worker-split/` and is the concrete structural precedent.
- The coordinator must remain terminal-only; technical research, diagnostics, artifact writing, and artifact verification belong exclusively to the worker.
- GitHub Copilot remains an inline adapter because this change does not introduce a portable routed-worker continuation contract for that harness.
- Copilot delivery must follow D3 of the archived security split: leave the `copilot-prompts` and `copilot-sai-commands` exclude arrays untouched so their generic projections continue delivering `sai/commands/sai-7-performance.md` and `commands/copilot/sai-7-performance.prompt.md`; exclude only routed worker assets from Copilot.
- Any shared audit coordinator extraction is a design-phase decision and must be justified by the two real audit instances rather than assumed from one precedent.
