# ADR 0074: Harness wrappers select coordinator or inline implementation planning

<!-- adr-index: refs 0035 -->

## Status

Accepted

## Context

`/sai-3-implement` currently enters one shared inline command body for Claude Code, opencode, and GitHub Copilot. The coordinator-worker pilot requires a resumable worker contract in Claude Code and opencode, but the approved portable contract is not available for Copilot. Selecting the path after entering the shared body would make the coordinator aware of harness differences and would still expose Copilot to coordinator-only instructions.

The repository's mirror discipline permits explicit harness-specific adapters when every harness is addressed and the asymmetry is documented.

## Decision

Select the implementation-planning entry path at each harness wrapper. Claude Code and opencode enter the shared coordinator and dispatch the implementation-planning worker. Copilot bypasses the coordinator and enters a preserved inline command body with the existing prerequisite, change-picker, planning, and completion behavior.

Keep the detailed planning contract shared through a caller-neutral invocation core. The routing asymmetry is limited to the wrapper entry seam and does not create separate planning semantics.

## Alternatives Considered

- **Route every harness through the coordinator** - simpler topology, but it claims a portable Copilot continuation contract that this change does not provide.
- **Branch inside the shared coordinator** - centralizes selection, but makes Copilot consume coordinator instructions and weakens the coordinator's harness-neutral boundary.
- **Select coordinator or inline execution at the wrapper** (chosen) - keeps each entry point explicit while preserving one technical planning core.

## Consequences

- Wrapper tests must prove that Claude Code and opencode select the coordinator while Copilot selects the inline body.
- Copilot remains behaviorally compatible but does not participate in coordinator-worker lifecycle messaging in this slice.
- Future lifecycle changes must check parity across both the routed and inline callers.

## Related

- `openspec/changes/introduce-implement-coordinator-worker/design.md` - Decision D1
- `openspec/changes/introduce-implement-coordinator-worker/specs/implementation-coordinator/spec.md`
- `docs/adr/0035-harness-specific-adapter-carve-out.md`
