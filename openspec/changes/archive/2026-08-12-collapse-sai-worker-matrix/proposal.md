**Complexity**: high (S5 > 8: 12 literal impacted paths)

## Why

The seven routed worker phases are represented by fourteen near-identical bindings and fourteen near-identical managed agent files, making routine lifecycle or contract changes expensive and prone to harness drift. A parameterized worker matrix now removes this duplication while preserving each phase's dispatch, continuation, model, and tuning behavior.

## What Changes

- Replace the per-phase Claude Code and opencode worker bindings with one parameterized binding template per harness.
- Replace the per-phase Claude Code and opencode managed worker agent files with one parameterized agent template per harness.
- Carry phase-specific `subagent_type`, model, continuation literals, and exceptional phase flags as explicit matrix parameters rather than duplicated file bodies.
- Update manifest expansion and installation projections so install, doctor, and uninstall continue to operate on deterministic materialized worker outputs.
- Retire every removed per-phase binding and worker-agent source destination with its complete historical `managedHashes` record in the same change.
- Add canonicalization, matrix-parameter, harness-parity, and install/doctor/uninstall integrity coverage.

## Capabilities

### New Capabilities

- `worker-matrix-collapse`: Generate the seven routed worker bindings and seven managed worker agents for each supported harness from parameterized templates while preserving phase behavior and lifecycle integrity.

### Modified Capabilities

- None.

## Impact

- `sai/orchestration/workers/bindings/claude/`
- `sai/orchestration/workers/bindings/opencode/`
- `sai/orchestration/workers/`
- `agents/claude/`
- `agents/opencode/`
- `sai/install-manifest.json`
- `bin/install-manifest.js`
- `bin/install-flow.js`
- `bin/doctor.js`
- `bin/uninstall-flow.js`
- `test/canonical-opencode-agent-behavior.test.js`
- `test/`

No application runtime, external dependency, or OpenSpec worker contract changes are intended.

## Proposal Research Documentation

**Local files**: `sai/orchestration/workers/bindings/opencode/spec-worker.md`; `sai/orchestration/workers/bindings/{claude,opencode}/{design,implementation,review,security,performance,accessibility}-worker.md`; `agents/{claude,opencode}/sai-{1,2,3,5,6,7,8}-*-worker.md`; `sai/orchestration/workers/sai-1-spec-proposal-worker.md`; `sai/install-manifest.json`; `bin/install-manifest.js`; `bin/install-flow.js`; `bin/doctor.js`; `bin/uninstall-flow.js`; `test/canonical-opencode-agent-behavior.test.js`; `test/doctor-fetch-resolution.test.js`; `package.json`; `AGENTS.md`; `GLOSSARY.md`.

**External URLs**: None.

## Additional Notes

- The seven routed phases are spec, design, implementation, review, security, performance, and accessibility; the separate `idea-list-render` binding is out of scope.
- Claude Code and opencode retain distinct dispatch primitives and frontmatter conventions. The templates share the worker contract and phase matrix, not a fake common harness syntax.
- Design-only allowances such as notice continuation and overview-generation options must remain unavailable to spec, implementation, and audit workers unless explicitly declared by the phase matrix.
- Existing retirement records are hash-based and must remain complete; active materialized destinations must remain deterministic so user tuning and drift detection keep their current semantics.
