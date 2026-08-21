# ADR 0171: Single-string invocation envelope across active SAI surfaces

<!-- adr-index: supersedes 0166; reframes 0159; refs 0136; refs ddr:0114 -->

## Status

Accepted

## Context

The active invocation envelope duplicates one request in `wrapper_echo_value` and `arguments_value`. The duplicate field was retained as a transport workaround for earlier wrapper and card-resolution boundaries, but the current neutral adapters, cards, workers, and projections already treat the argument value as the request that must be preserved. Keeping both fields makes stale consumers appear valid and permits two representations of one invocation to diverge.

The migration crosses neutral contracts, Claude Code and opencode wrappers, routed workers, composition and utility cards, installer validation, tests, and active specifications. Historical records remain immutable context; the active surfaces need one explicit transport rule.

## Decision

1. The active `InvocationEnvelope` contains exactly `command_name` and `arguments_value`, in that order. `command_name` selects the card; `arguments_value` is the sole opaque request and is forwarded byte-for-byte.
2. Boot adapters do not parse flags, inspect transcripts, extract wrapper labels, or reconstruct a second request. Change and status resolution, phase-specific flag grammars, continuation answers, and lifecycle ownership remain with their existing cards, coordinators, and workers.
3. The rule applies symmetrically to Claude Code and opencode, including wrappers, worker bindings, composition, utility cards, installer validation, and structural tests. Harness-specific dispatch mechanics and binding metadata remain outside the worker request.
4. The prior envelope-only resolution decision is superseded for active transport by this record. The supervised marker decision is reframed: `--supervised` remains request content, but it travels only inside `arguments_value`.

## Alternatives Considered

- Retain `wrapper_echo_value` as an inert compatibility field — rejected because it preserves a retired protocol surface and lets stale consumers reconstruct duplicate input.
- Parse or normalize arguments in the boot adapters — rejected because it would move flag, picker, and lifecycle ownership across established boundaries.
- Add a third metadata field — rejected because it expands the closed request contract and mixes harness-owned metadata with the opaque request.

## Consequences

- The migration is coordinated across both supported harnesses; a stale active consumer must be updated rather than supported through a compatibility alias.
- Exact argument bytes, existing picker fallback, flag grammars, continuation payloads, lifecycle shapes, and binding identity remain verification obligations.
- Installed projections are updated through the repository's manifest-driven sources; the installer is not run during implementation.
- ADR 0166 remains an immutable historical record, and its active index entry moves to the superseded section.

## Related

- `openspec/changes/remove-wrapper-echo-envelope-field/design.md`
- `docs/adr/0166-envelope-only-change-name-resolution.md` — superseded for active transport
- `docs/adr/0159-marker-grammar-stays-on-two-string-envelope.md` — reframed for one request string
- `docs/adr/0136-opaque-boot-request-and-card-selection-contract.md`
- `docs/ddr/0114-progress-plan-never-transported-in-envelope.md`
