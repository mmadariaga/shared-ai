**Complexity**: high

## Why

`/sai-6-security` still combines user-facing lifecycle control with the complete technical security audit, leaving the last report-producing audit phase without the routed coordinator/worker boundary already established for review. Splitting it now establishes the reusable read-only audit shape while preserving security findings, scope, and tooling semantics.

## What Changes

- Add a terminal-only security coordinator that validates the lifecycle, dispatches the routed worker, and presents worker-authored completion or failure output.
- Add a routed security worker that owns prerequisites, argument parsing, change and parent-branch resolution, diff scoping, SAST, SCA, and `security.md` creation and verification.
- Add mirrored Claude Code and opencode worker bindings with continuation/recovery behavior and bounded authorization for read-only dependency-audit tooling.
- Register and install the managed worker, its agent and skills, orchestration contracts, manifest projections, and Claude Code/opencode wrapper wiring.
- Keep GitHub Copilot on the existing inline path; do not add a Copilot routed binding or managed agent.
- Preserve the existing security audit semantics, including findings vocabulary, CWE mapping, severity, diff scope, delegation limits, and the sole writable artifact boundary.

## Capabilities

### New Capabilities
- `security-phase-coordinator`: Terminal-only routed lifecycle control for the security phase.
- `security-phase-worker`: Complete read-only technical security audit and `security.md` artifact production.
- `security-worker-bindings`: Claude Code and opencode dispatch, continuation, read-only research, and bounded audit-tool authorization.
- `security-worker-installation`: Managed-worker registration, harness bindings, installation projections, and wrapper routing.

### Modified Capabilities
- None.

## Impact

Concrete affected files are `sai/commands/security/coordinator.md`, `sai/commands/security/invocation.md`, `sai/commands/sai-6-security.md`, `sai/orchestration/workers/sai-6-security-worker.md`, `sai/orchestration/workers/bindings/claude/security-worker.md`, `sai/orchestration/workers/bindings/opencode/security-worker.md`, `agents/claude/sai-6-security-worker.md`, `skills/claude/sai-6-security-worker/SKILL.md`, `skills/opencode/sai-6-security-worker/SKILL.md`, `bin/install-flow.js`, `sai/install-manifest.json`, `commands/claude/sai-6-security.md`, and `commands/opencode/sai-6-security.md`. `commands/copilot/sai-6-security.prompt.md` remains on the inline path and receives no routed asset. The change adds no production dependency and does not change `sai/instructions/security.md` audit semantics. The worker may write only `openspec/changes/{change-name}/security.md`; dependency-audit commands remain bounded and read-only.

## Proposal Research Documentation

**Local files**: `sai/commands/review/coordinator.md`, `sai/commands/review/invocation.md`, `sai/commands/sai-5-review.md`, `sai/orchestration/workers/sai-5-review-worker.md`, `sai/orchestration/workers/bindings/claude/review-worker.md`, `sai/orchestration/workers/bindings/opencode/review-worker.md`, `sai/orchestration/coordinator-contract.md`, `sai/orchestration/worker-lifecycle.md`, `sai/instructions/security.md`, `sai/commands/sai-6-security.md`, `commands/claude/sai-6-security.md`, `commands/opencode/sai-6-security.md`, `commands/copilot/sai-6-security.prompt.md`, `bin/install-flow.js`, `sai/install-manifest.json`, `agents/claude/sai-5-review-worker.md`, `skills/claude/sai-5-review-worker/SKILL.md`, `skills/opencode/sai-5-review-worker/SKILL.md`, `openspec/specs/managed-worker-registry/spec.md`, `openspec/specs/orchestration-core/spec.md`, `openspec/specs/review-phase-coordinator/spec.md`, `openspec/specs/review-phase-worker/spec.md`, `openspec/specs/review-worker-bindings/spec.md`, `openspec/specs/review-worker-installation/spec.md`, `GLOSSARY.md`, and `openspec/config.yaml`.

**External URLs**: None.


## Additional Notes

The review split is the structural template, but security must not inherit review's mutation branch. The worker owns all technical I/O and must use the existing security instruction as the source of truth for `--full`, `--path`, parent-branch inference, the 500-LOC delegation cutover, the eight-call explorer cap, SAST/SCA conditions, and evidence requirements. Copilot remains inline by deliberate adapter asymmetry, not by weakening its security behavior.
