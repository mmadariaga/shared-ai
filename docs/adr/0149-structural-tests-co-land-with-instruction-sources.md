# ADR 0149: Structural tests co-land with the instruction sources they pin

<!-- adr-index: refs 0070 -->

## Status

Accepted

## Context

This change edits shared instruction prose and explore orchestration wording. Structural node:test suites already pin gate parameters and coordinator/worker contracts. Deferring suite updates to a trailing test-only step would leave `npm test` red across intermediate commits and block per-step bisect/revert.

This is change `supervised-artifact-gate-suppression`, Decision D4.

## Decision

Extend existing structural suites (`test/explore-pipeline-selector.test.js`, `test/spec-coordinator-worker.test.js`, `test/design-coordinator-worker.test.js`) in the same step as each instruction edit they assert, so every step is a green commit boundary. No deferred broken-suite step; no new behavioral LLM integration tests.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Co-land suite pins with instruction edits (chosen) | Every step builds and tests green; matches repo convention | Slightly larger per-step diffs |
| Install/projection-only assertions | Install-focused | Does not pin the prose contracts this change actually edits |
| Behavioral LLM integration tests | End-to-end confidence | Out of scope and non-deterministic |
| Single trailing test-only step | Smaller early commits | Leaves `npm test` red mid-change |

## Consequences

- Each implementation step's Testing Strategy must exit 0 before the step is done.
- Implementers write RED structural assertions before or with GREEN instruction edits in the same step boundary.
- Harness parity remains via shared `sai/` sources consumed by both harnesses.

## Related

- `openspec/changes/supervised-artifact-gate-suppression/design.md` — Decision D4
- ADR 0070 — Test Command carries parameterised scoping idiom
- `test/explore-pipeline-selector.test.js`, `test/spec-coordinator-worker.test.js`, `test/design-coordinator-worker.test.js`
