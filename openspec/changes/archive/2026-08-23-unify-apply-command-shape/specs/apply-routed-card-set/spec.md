## ADDED Requirements

### Requirement: Apply irreducible differences documented as deliberate design

AGENTS.md SHALL document exactly three irreducible apply differences as deliberate design rather than debt: (1) dynamic Step projection from `implementation.md` instead of a static phase-declared progress plan, (2) fresh blind workers per Step with immutable dispatch-local plans, and (3) coordinator-owned git operations at the two commit-authorization gates.

#### Scenario: Reader finds the exception list

- **WHEN** a contributor reads the Apply coordinator-and-worker section of AGENTS.md
- **THEN** the three irreducible differences appear together as an intentional-design block with the coordinator-card ownership note for the runner fetch and relocated behaviors

## MODIFIED Requirements

### Requirement: apply-invocation-core-preserves-loading

The apply `invocation.md` SHALL preserve the utility body's loading behavior minus its retired isolation block: the change picker, the prerequisite checks (including the `implementation.md` existence check), the fast-track parse of `$ARGUMENTS`, the `budget` skill, the `safe-operations` skill, the `sai-learnings-format` policy, and the `remember` policy. The apply coordinator card SHALL own the single fetch of the `runner.md` loop contract, and `invocation.md` MUST NOT fetch `runner.md`. The invocation core SHALL be shared by both harnesses, SHALL NOT re-implement coordinator lifecycle mechanics, and SHALL NOT carry a `# Isolation Mode` block: inherited context is discarded by the session-start boot preamble, which is also the cited rationale for the per-invocation reset of `session_commit_authorized`.

#### Scenario: invocation core loads the phase content

- **WHEN** the apply entry paths load the routed card set
- **THEN** the invocation core loads the change picker, prerequisites, fast-track parse, budget and safe-operations skills, learnings format, and remember policy, while only the coordinator card loads the runner contract

#### Scenario: fast-track parse survives the re-architecture

- **WHEN** `--fast-track` appears in `$ARGUMENTS`
- **THEN** the invocation shell parses it as sole authority (not the wrappers), prints the exact `> FAST-TRACK MODE ACTIVE` line, and behaves identically across Claude Code and opencode

#### Scenario: runner fetch has a single owner

- **WHEN** either entry path activates the apply phase
- **THEN** only the coordinator card fetches `sai/commands/apply/runner.md` and the invocation shell contains no runner fetch line

### Requirement: Apply invocation preserves fast-track gate contracts

The routed `sai/commands/apply/coordinator.md` SHALL contain the apply-time session commit authorization and fast-track branch auto-stay contracts so that both entry paths — the standalone wrapper boot and the `/sai-build` chained segment — load them. Cross-file references SHALL point to the current implementation plan template.

#### Scenario: Both entry paths load the relocated behaviors

- **WHEN** apply activates through the standalone wrapper boot or the chained composition segment
- **THEN** the coordinator card supplies session flag activation, reset, scope, and reporting, plus non-detached branch auto-stay and detached-HEAD fallback
