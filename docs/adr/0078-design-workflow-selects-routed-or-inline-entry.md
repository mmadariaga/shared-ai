# ADR 0078: Design workflow selects routed or inline entry

<!-- adr-index: refs 0074; refs 0035 -->

## Status

Accepted

## Context

`sai-2-design` currently enters one shared inline command body for Claude Code, opencode, and GitHub Copilot. The design coordinator-worker pilot requires a resumable worker contract in Claude Code and opencode, but the approved portable contract is not available for Copilot. Selecting the path after entering the shared body would make the coordinator aware of harness differences and would still expose Copilot to coordinator-only instructions.

The repository's mirror discipline permits explicit harness-specific adapters when every harness is addressed and the asymmetry is documented (ADR 0035, ADR 0074).

## Decision

Select the design entry path at each harness wrapper. Claude Code and opencode enter the design coordinator and dispatch the design-planning worker. Copilot bypasses the coordinator and enters a preserved inline command body with the existing prerequisite, change-picker, approval, generation, and completion behavior.

Keep the detailed design contract shared through a caller-neutral invocation core. The routing asymmetry is limited to the wrapper entry seam and does not create separate design semantics.

## Alternatives Considered

- **Route every harness through the coordinator** - simpler topology, but it claims a portable Copilot continuation contract that this change does not provide.
- **Branch inside the shared coordinator** - centralizes selection, but makes Copilot consume coordinator instructions and weakens the coordinator's harness-neutral boundary.
- **Select coordinator or inline execution at the wrapper** (chosen) - keeps each entry point explicit while preserving one technical design core.

## Consequences

- Wrapper tests must prove that Claude Code and opencode select the coordinator while Copilot selects the inline body.
- Copilot remains behaviorally compatible but does not participate in coordinator-worker lifecycle messaging in this slice.
- Future lifecycle changes must check parity across both the routed and inline callers.

## Related

- `openspec/changes/introduce-design-coordinator-worker/design.md` - Decision D1
- `openspec/changes/introduce-design-coordinator-worker/specs/design-coordinator/spec.md`
- `docs/adr/0035-harness-specific-adapter-carve-out.md`
- `docs/adr/0074-harness-wrappers-select-coordinator-or-inline-implementation-planning.md`
