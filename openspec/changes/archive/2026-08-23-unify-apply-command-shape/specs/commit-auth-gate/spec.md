## REMOVED Requirements

### Requirement: Apply invocation defines session-scoped commit authorization

**Reason**: The `session_commit_authorized` lifecycle definition moved from the apply invocation shell to the apply coordinator card under change `unify-apply-command-shape`.

**Migration**: Consumers referencing the removed requirement find its replacement, `Apply coordinator defines session-scoped commit authorization`, in this same delta file; at archive it syncs into `openspec/specs/commit-auth-gate/spec.md` with identical lifecycle semantics bound to the new owner surface.

## ADDED Requirements

### Requirement: Apply coordinator defines session-scoped commit authorization

The routed apply coordinator card SHALL define the in-memory `session_commit_authorized` lifecycle, including activation from `Allow on this session`, fast-track pre-activation, reset at a new chat or `/sai-*` invocation, and scope limited to the per-Step STOP & COMMIT gate and the terminal documentation commit gate.

#### Scenario: Fast-track pre-activates the session flag

- **WHEN** apply starts with the fast-track signal active
- **THEN** the coordinator treats `session_commit_authorized` as active before either apply commit gate while still printing each required visibility report and proposed message

#### Scenario: Session flag does not bypass other gates

- **WHEN** the session flag is active and apply reaches a GREEN-conflict STOP or Human Verification gate
- **THEN** the workflow still stops at that gate
