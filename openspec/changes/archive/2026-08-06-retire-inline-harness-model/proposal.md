**Complexity**: high

## Why

GitHub Copilot is the sole consumer of SAI's inline execution model, forcing each routed phase to carry a second coordinator contract and keeping the supported-harness roster split between two execution architectures. Retiring that consumer and its installation surface now removes the dual-design tax while leaving Claude Code and opencode's routed behavior unchanged.

## What Changes

- **BREAKING** Reduce the supported harness roster to Claude Code and opencode; remove GitHub Copilot (VS Code) from supported-harness detection, installation selection, documentation, and runtime projections.
- **BREAKING** Delete the Copilot command, agent, skill, and installation-guide assets, plus `sai/orchestration/inline-invocation.md`; do not replace them with an inline-compatibility abstraction.
- Remove `installCopilot`, Copilot base-path constants, Copilot install-picker branches, Copilot uninstall enumeration, and Copilot doctor path resolution and detection.
- Remove the Copilot manifest projections and the inline adapter projection; do not retain a cleanup-only Copilot uninstall path or new retirement sweeper.
- Strip Copilot-only and inline-vs-routed adapter clauses from shared instructions and policies, while preserving the surviving Claude Code/opencode picker, feedback, phase-boundary, and routed worker contracts.
- Publish an upgrade notice telling existing Copilot users to run uninstall before upgrading; users who skip that step may retain orphaned files because no cleanup path is provided.
- Update only mechanism-defining OpenSpec capabilities and their tests; leave incidental mentions and Copilot-specific capabilities that do not define the deleted adapter, assets, or installer/runtime mechanisms for the later prose-sweep slice.

## Capabilities

### New Capabilities

- `routed-harness-support`: SAI supports only the Claude Code and opencode routed harnesses, with no inline execution consumer.

### Modified Capabilities

- `inline-coordinator-adapter`: retire the obsolete Copilot-only inline coordinator capability and delete its canonical spec.
- `orchestration-source-layout`: remove Copilot source/runtime projections and the inline orchestration source from active installation inventories.
- `shared-ai-uninstall`: remove Copilot from symmetric uninstall enumeration without retaining a cleanup-only path.
- `harness-coordination-parity`: define the surviving two-harness routed execution boundary and remove Copilot inline branches.
- `artifact-feedback-gate`: preserve canonical gate semantics while removing the Copilot inline ownership branch.
- `status-picker`: retain identical native-picker behavior for Claude Code and opencode only.

## Impact

- Installer and manifest runtime: `bin/install-flow.js`, `bin/uninstall-flow.js`, `bin/doctor.js`, `bin/install-manifest.js`, `bin/orchestration-source-audit.js`, and `sai/install-manifest.json`.
- Deleted inline and Copilot assets: `sai/orchestration/inline-invocation.md`, `commands/copilot/`, `agents/copilot/`, `skills/copilot/`, and `INSTALL.copilot.md`.
- Shared contracts and documentation: `sai/instructions/explore.md`, `sai/instructions/design.md`, `sai/instructions/spec.propose.md`, `sai/policies/remember.md`, `sai/policies/artifact-feedback-gate.md`, `sai/policies/status-picker.md`, `AGENTS.md`, `README.md`, and `GLOSSARY.md`.
- Mechanism-specific routed/inline contracts and validation: the design, implementation, accessibility, orchestration-source-layout, harness-parity, instruction-loading, and adapter-related specifications and tests that directly assert Copilot or inline execution.
- No new dependency, runtime abstraction, compatibility shim, or cleanup-only migration path is introduced. Upgraded machines that skip uninstall may retain orphaned Copilot files as an accepted trade-off.

## Proposal Research Documentation

**Local files**: `bin/install-flow.js`; `bin/uninstall-flow.js`; `bin/doctor.js`; `bin/install-manifest.js`; `bin/orchestration-source-audit.js`; `sai/install-manifest.json`; `sai/orchestration/inline-invocation.md`; `commands/copilot/`; `agents/copilot/`; `skills/copilot/`; `INSTALL.copilot.md`; `sai/instructions/explore.md`; `sai/instructions/design.md`; `sai/instructions/spec.propose.md`; `sai/policies/remember.md`; `sai/policies/artifact-feedback-gate.md`; `sai/policies/status-picker.md`; `openspec/specs/inline-coordinator-adapter/spec.md`; `openspec/specs/orchestration-source-layout/spec.md`; `openspec/specs/harness-coordination-parity/spec.md`; `openspec/specs/shared-ai-uninstall/spec.md`; `GLOSSARY.md`; `AGENTS.md`; `README.md`; relevant installer, doctor, uninstall, and orchestration tests.

**External URLs**: None.

## Additional Notes

- The inline adapter is deleted rather than ported because it has exactly one consumer and no supported harness remains that needs its same-context lifecycle.
- `cleanupRetiredProjections('copilot', ...)` is reachable only from `installCopilot`; removing that installer branch removes the cleanup path as well.
- The release notice is the user-facing migration path: existing Copilot users are told to run uninstall before upgrading, while skipped uninstall remains an accepted source of orphaned files.
- Claude Code and opencode retain their existing routed coordinator/worker bindings, continuation behavior, model settings, artifact locations, and user-facing phase stops.
- Historical ADRs and unrelated specs that merely mention Copilot are not rewritten in this slice.
