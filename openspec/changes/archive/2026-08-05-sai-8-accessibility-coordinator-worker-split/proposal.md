**Complexity**: high

## Why

Split the last unsplit report-producing phase so accessibility auditing follows the same terminal-only coordinator and routed-worker lifecycle as the other supervised phases. This is needed now because accessibility combines static analysis with an optional interactive runtime mode whose per-command authorization must be owned by the worker and routed through the coordinator.

## What Changes

- Add a terminal-only accessibility phase coordinator for Claude Code and opencode.
- Add an accessibility worker that owns change resolution, static WCAG 2.2 AA review, optional `--runtime` checks, and `accessibility.md` creation and verification.
- Add a caller-neutral accessibility invocation core loaded by both the routed worker and the GitHub Copilot inline caller so the audit policy has one source of truth.
- Route runtime authorization as the worker's closed `needs_input` lifecycle question; every browser command remains individually authorized and nothing is auto-executed.
- Add mirrored Claude Code and opencode worker bindings, including same-worker continuation and bounded replacement recovery.
- Register and project the managed worker through the installer, while keeping GitHub Copilot on its existing inline path.
- Preserve the existing `--full`, `--path`, and `--runtime` argument contract, WCAG scope, severity vocabulary, verbatim-evidence rule, and no-production-modification rule.
- Correct the shared accessibility instruction's invalid `Major` regression floor to High at minimum, or Critical when existing Critical criteria apply. This wording-only policy correction applies to both routed workers and the GitHub Copilot inline caller.
- Preserve the existing conditional research policy: the worker inspects scopes of five or fewer UI files directly, delegates per-component inspection when more than five are in scope, and parallelizes only independent component areas that need codebase context.

## Capabilities

### New Capabilities

- `accessibility-phase-coordinator`: Terminal-only lifecycle routing and terminal presentation for the accessibility phase.
- `accessibility-phase-worker`: Complete static and optional runtime accessibility review producing and verifying `accessibility.md`.
- `accessibility-worker-bindings`: Claude Code and opencode dispatch, continuation, recovery, and runtime authorization forwarding for the worker.
- `accessibility-worker-installation`: Managed-worker registration and deterministic harness-specific projection wiring for the routed accessibility worker.

### Modified Capabilities

- None.

## Impact

- Accessibility phase wrappers and shared invocation: `commands/claude/sai-8-accessibility.md`, `commands/opencode/sai-8-accessibility.md`, `sai/commands/sai-8-accessibility.md`, and `sai/commands/accessibility/invocation.md`.
- Shared accessibility policy wording: `sai/instructions/accessibility.md`.
- Accessibility worker assets: `sai/commands/accessibility/`, `sai/orchestration/workers/`, and harness-specific bindings. The shared lifecycle and coordinator contracts are consumed unchanged.
- Managed installation surfaces: `bin/install-flow.js`, `sai/install-manifest.json`, Claude agent projections, Claude/opencode forwarding skills, doctor, uninstall, and projection tests.
- No new runtime dependency is proposed. Runtime scanners remain the existing `npx @axe-core/cli`, `pa11y`, and `lhci` commands described by the accessibility instructions.
- The worker writes only `openspec/changes/{change-name}/accessibility.md`; no production source, UI, configuration, or runtime state is modified.

## Proposal Research Documentation

**Local files**: `sai/instructions/accessibility.md`; `sai/orchestration/worker-lifecycle.md`; `sai/orchestration/coordinator-contract.md`; `sai/commands/performance/coordinator.md`; `sai/orchestration/workers/sai-7-performance-worker.md`; `sai/orchestration/workers/bindings/claude/performance-worker.md`; `sai/orchestration/workers/bindings/opencode/performance-worker.md`; `bin/install-flow.js`; `sai/install-manifest.json`; `test/install-manifest.test.js`; `test/uninstall-enumeration.test.js`; `openspec/changes/sai-7-performance-coordinator-worker-split/`; `openspec/changes/archive/2026-08-04-sai-6-security-coordinator-worker-split/`; `openspec/specs/accessibility-audit/spec.md`; `openspec/schemas/sai-workflow/templates/specs.md`; `GLOSSARY.md`.

**External URLs**: None.

## Additional Notes

- Static review remains the default; `--runtime` is opt-in and must first establish the user's authorization context for each individual scanner command.
- Runtime authorization is a lifecycle interaction, not an audit step: the worker asks through the closed `needs_input` payload, and the coordinator presents the choice without performing technical work.
- GitHub Copilot remains an inline adapter and receives no routed worker, binding, forwarding skill, or managed Claude agent projection.
- GitHub Copilot's execution path remains inline, but it intentionally receives the shared High-or-Critical regression classification correction through the caller-neutral accessibility policy.
- Do not add `sai-8-accessibility` assets to the Copilot command or prompt exclude arrays; the generic Copilot projections continue to represent the inline path.
- Shared audit-coordinator extraction is intentionally deferred to design; the first implementation may keep accessibility lifecycle policy phase-specific.
