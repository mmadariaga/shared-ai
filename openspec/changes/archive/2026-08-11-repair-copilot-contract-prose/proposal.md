**Complexity**: high

## Why

The normative invocation and routed-harness prose still presents retired GitHub Copilot inline callers and the deleted inline adapter as active contract parties, producing false architectural readings. This change rewrites those live references against the current Claude Code/opencode routed file tree while leaving archived material untouched.

## What Changes

- Rewrite the seven shared invocation-core headers so each names its actual routed phase worker consumer rather than a retired inline caller.
- Correct live design, implementation, coordinator-loading, review, security, accessibility, installation, and deduplication capability prose that assigns behavior to Copilot or the deleted inline adapter.
- Add a verification-only prose guard over the seven invocation cores and this change's live contract targets, modelled on the existing retired-source assertions; it changes no runtime behavior.
- Preserve the existing routed coordinator/worker, lifecycle, installation, and audit semantics; this is a normative-prose correction with a verification guard, not a behavior change.
- Explicitly defer references to other retired command/compatibility bodies to the separately named `repair-retired-body-contract-prose` slice; this slice handles only Copilot/inline-adapter prose.
- Leave `openspec/specs/_archived/copilot-harness-instructions/spec.md` and `openspec/specs/_archived/model-variant-wrappers/spec.md` unchanged.

## Capabilities

### New Capabilities

- `invocation-core-provenance`: Shared invocation cores describe their actual routed phase-worker consumers and retain their existing ownership and load contracts.
- `routed-contract-truth`: Live capability specifications describe only the supported routed harness contract and no longer treat Copilot or its deleted inline adapter as active.

### Modified Capabilities

- None.

## Impact

- Shared invocation cores: `sai/commands/{spec,design,review,security,performance,implement,accessibility}/invocation.md`.
- Live capability specifications: `openspec/specs/design-coordinator/spec.md`, `openspec/specs/implementation-harness-bindings/spec.md`, `openspec/specs/implementation-coordinator/spec.md`, `openspec/specs/coordinator-instruction-loading/spec.md`, `openspec/specs/review-phase-worker/spec.md`, `openspec/specs/security-phase-worker/spec.md`, `openspec/specs/accessibility-phase-worker/spec.md`, `openspec/specs/accessibility-worker-bindings/spec.md`, `openspec/specs/accessibility-worker-installation/spec.md`, and `openspec/specs/deduplicate-sai-2-design/spec.md`.
- Verification guard surfaces: `test/design-coordinator-worker.test.js` and `bin/orchestration-source-audit.js`.
- No application code, configuration, installer behavior, dependency, or external system is changed.

## Proposal Research Documentation

**Local files**: `sai/commands/spec/invocation.md`, `sai/commands/design/invocation.md`, `sai/commands/review/invocation.md`, `sai/commands/security/invocation.md`, `sai/commands/performance/invocation.md`, `sai/commands/implement/invocation.md`, `sai/commands/accessibility/invocation.md`, `openspec/specs/design-coordinator/spec.md`, `openspec/specs/implementation-harness-bindings/spec.md`, `openspec/specs/implementation-coordinator/spec.md`, `openspec/specs/coordinator-instruction-loading/spec.md`, `openspec/specs/routed-harness-support/spec.md`, `openspec/specs/review-phase-worker/spec.md`, `openspec/specs/security-phase-worker/spec.md`, `openspec/specs/accessibility-phase-worker/spec.md`, `openspec/specs/accessibility-worker-bindings/spec.md`, `openspec/specs/accessibility-worker-installation/spec.md`, `openspec/specs/deduplicate-sai-2-design/spec.md`, `openspec/specs/orchestration-source-layout/spec.md`, `test/design-coordinator-worker.test.js`, `bin/orchestration-source-audit.js`, and `GLOSSARY.md`.

**External URLs**: None.

## Additional Notes

- `routed-harness-support/spec.md` and `orchestration-source-layout/spec.md` provide the current routed-only baseline; their already-correct retirement assertions are evidence, not targets for rewriting.
- Existing source requirement and scenario structure remains recognizable and no source requirement is added, removed, or renumbered. Edits replace stale caller/adapter wording with the active routed contract and preserve the archived-spec boundary.
- The two new capability specs state the supported-harness and retired-party invariants; `routed-contract-truth` also defines the durable audited inventory and archived exclusion set normatively so the guard remains verifiable after proposal archival.
- The guard's ten-file live contract inventory is deliberately fixed for this slice; any future routed contract specification addition or move must extend the inventory and guard in that same change, which is an accepted maintenance trade-off.
- `repair-retired-body-contract-prose` is the named destination for the eight live specifications still referring to the other deleted bodies, including the fifteen references identified during review.
