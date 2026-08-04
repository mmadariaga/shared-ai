# ADR 0097: Route performance by continuation capability

<!-- adr-index: refs 0082; refs 0083; refs 0093 -->

## Status

Accepted

## Context

`/sai-7-performance` currently combines terminal lifecycle handling with repository research, diagnostics, findings, and `performance.md` production. The security audit provides a concrete routed-audit precedent, but GitHub Copilot still lacks the portable continuation and replacement-reconstruction contract used by the Claude Code and opencode bindings.

## Decision

Route the Claude Code and opencode performance entrypoints through a terminal-only coordinator and a managed `sai-7-performance-worker`. Keep GitHub Copilot on the inline performance path. Both execution shapes consume one caller-neutral performance invocation core so tier rules, evidence policy, scope parsing, and report semantics remain single-sourced.

The coordinator owns only lifecycle routing and terminal presentation. The worker owns prerequisites, change resolution, diff and tier research, authorized read-only diagnostics, `performance.md` writing, and artifact verification.

## Alternatives Considered

- **Route all three harnesses** - produces uniform topology but depends on a Copilot continuation contract that is not portable across supported surfaces.
- **Keep all three harnesses inline** - avoids adapter asymmetry but preserves the lifecycle and technical-work coupling.
- **Route capable harnesses and preserve one shared invocation core** (chosen) - accepts an explicit adapter difference while keeping performance behavior aligned.

## Consequences

- Claude Code and opencode gain same-worker continuation and one bounded replacement recovery for performance audits.
- GitHub Copilot remains intentionally inline and receives no routed performance assets.
- The worker becomes the sole writer of `performance.md`; the coordinator performs no technical audit I/O.
- Structural tests must prove argument preservation, technical-policy parity, and the routed-versus-inline installation boundary.

## Related

- `docs/adr/0082-canonical-phase-workers-and-mirrored-bindings.md`
- `docs/adr/0083-shared-coordinator-mechanics-through-phase-adapters.md`
- `docs/adr/0093-route-spec-through-workers-while-copilot-remains-inline.md`
- `openspec/changes/sai-7-performance-coordinator-worker-split/design.md`
