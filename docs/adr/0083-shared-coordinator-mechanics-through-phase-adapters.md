# ADR 0083: Extract shared coordinator mechanics through phase adapters

<!-- adr-index: refs 0075; refs 0076; refs 0079; refs 0080 -->

## Status

Accepted

## Context

Routed design and implementation coordinators duplicate payload validation, changed-file aggregation, continuation-first handling, replacement fallback, and terminal reporting. Their envelopes, nonterminal extensions, reconstruction fields, and navigation remain phase-specific.

## Decision

Put the common lifecycle loop in `coordinator-contract.md`. Each phase supplies an adapter containing its original envelope, dispatch and continuation operations, allowed nonterminal extensions and handlers, replacement reconstruction fields, and terminal navigation. Adapters cannot reimplement validation, ordered union, continuation ordering, or fallback control flow.

## Alternatives Considered

- **Copy shared prose into both routed commands** - keeps files self-contained, but preserves drift risk.
- **Put phase conditionals in one coordinator** - removes copies, but turns the shared seam into an all-phase policy file.
- **Use a shared contract with bounded phase adapters** (chosen) - centralizes mechanics while keeping phase policy isolated.

## Consequences

- Lifecycle changes have one canonical source.
- Design-only notices, feedback, and navigation remain outside implementation policy.
- Implementation-only planning and verification rules remain outside design policy.

## Related

- `openspec/changes/extract-sai-orchestration-core/design.md` - Decision D3
- `docs/adr/0075-normalized-invocation-envelope-and-lifecycle-payload.md`
- `docs/adr/0076-resume-worker-before-durable-reconstruction.md`
- `docs/adr/0079-design-worker-notices-and-reconstruction-metadata.md`
- `docs/adr/0080-design-to-implementation-lifecycle-boundary.md`
