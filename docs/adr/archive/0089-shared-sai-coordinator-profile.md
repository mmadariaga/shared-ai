# ADR 0089: Share one routed SAI coordinator profile across planning phases

<!-- adr-index: refs 0083; refs 0074; refs 0078 -->

## Status

Superseded by openspec/changes/simplify-routed-phase-coordination

## Context

Opencode routed design and implementation planning use the same primary model, reasoning variant, lifecycle mechanics, and control-plane role, but configure separate coordinator profiles. The duplicate profiles increase configuration and installation drift even though phase-specific adapters already constrain lifecycle behavior and worker selection for `/sai-2-design` and `/sai-3-implement`.

## Decision

Use one opencode primary profile named `sai-coordinator` for routed design and implementation planning. Give that profile the union of permissions required to launch `sai-2-design-worker` and `sai-3-implementation-worker`, retain `subagent_depth: 2`, and keep technical I/O prohibited at the coordinator layer. Each phase adapter remains responsible for dispatching only its own worker and for enforcing its phase-specific lifecycle extensions and terminal behavior.

Claude Code retains the established model and effort settings in each wrapper session and aligns only its managed worker identities. Copilot remains on the inline compatibility path and receives no routed coordinator profile.

## Alternatives Considered

- **Retain two phase coordinator profiles** - keeps permissions narrow by configuration, but duplicates an otherwise identical control-plane profile.
- **Create a shared base plus two thin phase profiles** - centralizes some settings, but preserves two installed identities and adapter configuration without adding behavioral isolation.
- **Use one shared profile with phase-restricted adapters** (chosen) - removes duplicate configuration while preserving phase-specific dispatch and lifecycle policy.

## Consequences

- Opencode installation and doctor logic manage one coordinator profile instead of two.
- The shared profile can launch either numbered worker, so structural tests must prove each command dispatches only its phase worker.
- Worker models, permissions, artifacts, and phase policies remain separate.
- Harness-specific adapter boundaries remain explicit across Claude Code, opencode, and Copilot.

## Related

- `openspec/changes/consolidate-routed-sai-coordinators/design.md` - Decision D1
- `docs/adr/0074-harness-wrappers-select-coordinator-or-inline-implementation-planning.md`
- `docs/adr/0078-design-workflow-selects-routed-or-inline-entry.md`
- `docs/adr/0083-shared-coordinator-mechanics-through-phase-adapters.md`
