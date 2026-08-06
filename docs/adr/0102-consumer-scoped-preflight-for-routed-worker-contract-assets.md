# ADR 0102: Consumer-scoped preflight for routed worker contract assets

<!-- adr-index: refs 0100 -->

## Status

Accepted

## Context

The installer has three harness consumers with different worker-registration boundaries. Claude Code projects managed worker agents, opencode derives routed worker registrations from binding declarations, and GitHub Copilot remains on its inline path. Binding prompts and opencode registration prompts are static repository assets, but malformed assets must not prevent unrelated harness operations from loading.

The opencode census also supplies data to configuration merge, installer guidance, and doctor. Those consumers need the same validated worker-specific prompt records, while user-owned opencode configuration must remain untouched when the installer cannot safely parse or validate it.

## Decision

Keep routed-worker declaration and prompt validation lazy and consumer-scoped. Shared installer module loading must not derive the opencode census. Opencode installation and configuration consumers validate the complete binding census, worker-specific dispatch templates, and explicit registration defaults before mutating an opencode destination. Claude installation validates all seven Claude initial-dispatch templates before cleanup, projection, or managed-agent activation. Doctor consumes the same lazy prompt-bearing census and reports derivation failures without mutating any harness.

Validation failures are fail-before-mutation errors for the affected consumer. Claude and Copilot imports and operations remain usable when opencode assets are malformed, and Copilot receives no routed worker registration or binding projection. The canonical neutral installed binding destinations remain the projection boundary defined by ADR 0100.

## Alternatives Considered

- **Validate at module load** - gives earlier feedback, but malformed opencode assets would break unrelated Claude and Copilot operations.
- **Validate after projection** - keeps the parser simple, but can leave a partial global installation after a failure.
- **Infer registration prompts from binding text** - reduces one declaration, but creates an implicit second source of registration ownership.
- **Use consumer-scoped preflight with explicit defaults** (chosen) - preserves harness isolation, ownership boundaries, and atomic affected-consumer writes.

## Consequences

- `getOpencodeManagedAgents()` remains the lazy validation boundary for opencode consumers.
- The opencode census and Claude binding validator must provide actionable binding-specific diagnostics before writes.
- Installer and doctor tests must cover malformed declarations, prompt-template drift, destination preservation, and cross-harness isolation.
- User-owned non-empty opencode prompts and unrelated JSONC fields remain preserved; canonical expected prompts are metadata, not drift instructions.

## Related

- `docs/adr/0100-neutral-installed-worker-binding-destinations.md`
- `openspec/changes/deterministic-worker-contract-delivery/design.md`
