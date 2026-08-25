# ADR 0093: Route spec through workers while Copilot remains inline

<!-- adr-index: refs 0082; refs 0083; refs 0090; refs 0092 -->

## Status

Accepted

## Context

`/sai-1-spec` currently combines prerequisite handling, proposal and spec authoring, summary derivation, feedback, and terminal navigation in one inline body. Design and implementation planning already separate lifecycle-only coordinators from technical workers through the shared Orchestration Core. The spec phase needs the same supervised execution seam, but GitHub Copilot has no portable continuation and replacement-reconstruction contract equivalent to the Claude Code and opencode routed bindings.

## Decision

Extract caller-neutral technical spec behavior into `sai/commands/spec/invocation.md`. Route the Claude Code and opencode wrappers through a lifecycle-only spec coordinator and their mirrored `sai-1-spec-proposal-worker` bindings. Keep GitHub Copilot on the inline `sai/commands/sai-1-spec.md` path, which consumes the same invocation core.

Preserve the existing proposal/spec artifact scope, decision summary, feedback gate, and terminal message across both execution shapes. Keep lifecycle payloads metadata-only and reuse the existing coordinator and worker lifecycle contracts without adding spec-specific fields.

## Alternatives Considered

- **Route all three harnesses through workers** - produces a uniform topology but requires a Copilot continuation contract that is not portable across its supported surfaces.
- **Keep all three harnesses inline** - avoids adapter asymmetry but provides no supervised spec-phase dispatch seam for Claude Code or opencode.
- **Duplicate technical spec behavior in routed and inline bodies** - avoids extraction but creates two sources of truth for proposal and spec generation.

## Consequences

- Claude Code and opencode gain supervised spec execution with same-worker continuation and bounded replacement recovery.
- GitHub Copilot remains intentionally inline while sharing the same technical invocation core.
- Installer projections and documentation must make the routed and inline boundaries explicit.
- Same-harness, same-model parity evidence is required before the change is complete.

## Related

- `docs/adr/0082-canonical-phase-workers-and-mirrored-bindings.md`
- `docs/adr/0083-shared-coordinator-mechanics-through-phase-adapters.md`
- `docs/adr/0090-centralize-copilot-inline-planning-lifecycle.md`
- `docs/adr/0092-group-planning-assets-by-phase-without-changing-harness-routing.md`
