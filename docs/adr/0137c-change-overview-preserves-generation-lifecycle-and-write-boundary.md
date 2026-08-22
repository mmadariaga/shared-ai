# ADR 0137c: Change Overview preserves the generation lifecycle and write boundary

## Status

Accepted

## Context

The structural rewrite changes how the derived Change Overview is rendered, but the existing lifecycle, state transitions, localization transport, and single-file generator boundary are consumed by both supported harnesses and by status, archive, and review surfaces.

## Decision

Change only rendering and its structural contract. The generator continues to write only `openspec/changes/{change-name}/change-overview.md`, the design worker remains the owner of `.openspec.yaml` overview-state transitions, the five-field generator result envelope remains unchanged, and lifecycle behavior remains shared across Claude Code and opencode.

## Alternatives Considered

- **Refactor lifecycle behavior together with rendering** — rejected: it expands risk beyond the approval-structure change.
- **Move lifecycle ownership to the generator or coordinator** — rejected: it would split the existing authority boundary and threaten harness parity.

## Consequences

The change remains reversible as one rendering-and-contract update, while lifecycle and write-boundary compatibility continue to be tested independently. Future rendering work must not infer permission to alter lifecycle ownership from this structural rewrite. This is an ADR because it records how the pipeline is built rather than a domain invariant.

## Related

- `docs/ddr/0125a-overview-generation-lifecycle-and-result-envelope.md`
