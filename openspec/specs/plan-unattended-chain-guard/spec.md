# plan-unattended-chain-guard Specification

## Purpose
TBD - created by archiving change plan-unattended-chain-guard. Update Purpose after archive.
## Requirements
### Requirement: Chain authority mandates complete emit before design dispatch

The Plan-Unattended supervision SHALL treat explore-slice@1 as the authority for the spec-to-design chain. After spec convergence and the artifact gate proceed, the complete emit (sai-1 to sai-2) SHALL be mandatory before the chained design dispatch and before turn close. The supervision SHALL validate stage before every dispatch, consume the returned stage as current, and SHALL NOT close the turn after Supervised sai-1 done while stage is still sai-1.

#### Scenario: Spec convergence chains design instead of closing

- **WHEN** the spec phase converges and the artifact gate proceeds with stage still sai-1
- **THEN** the supervision emits complete and dispatches the design worker for the same change instead of presenting the next slice

### Requirement: Active chain blocks new selections and next-slice

While stage is sai-1 or sai-2, the supervision SHALL block the next-slice selector and any new route dispatch. A concurrent Plan selection while active_change is set SHALL be acknowledged as already running with no dispatch and no queue. Supervision state SHALL stay conversation-only and SHALL never be persisted to the repo.

#### Scenario: Concurrent Plan selection is acknowledged as already running

- **WHEN** a Plan selection arrives while active_change is set and stage is sai-1 or sai-2
- **THEN** the supervision acknowledges already running and dispatches nothing

### Requirement: Degraded store holds stage and waits for instruction

On store failure, rejected emit, or degraded store, the supervision SHALL hold the current stage, present no next-slice selector, close nothing as complete, report the degradation, and wait for explicit instruction without deriving the transition in prose.

#### Scenario: Corrupt store pauses instead of advancing

- **WHEN** a complete emit is rejected or the store reports degradation during the spec-to-design transition
- **THEN** the supervision holds the current stage and waits for explicit instruction

### Requirement: Chain guard preserves terminal and routing invariants

The chain guard SHALL preserve existing invariants: a failed, cancelled, or STOP-bearing sai-1 result SHALL never dispatch sai-2; spec cap exhaustion after three rounds with High findings SHALL continue to sai-2; a sai-2 failure after spec convergence SHALL keep specs_converged_changes with design-only retry over existing proposal.md and specs; multi-slice completion SHALL occur only via next-slice on implement; sai-3-implement SHALL never be dispatched; no overview-language question SHALL run at emission; and fast-track SHALL never auto-select the close selector.

#### Scenario: Failed spec phase guides retry without dispatching design

- **WHEN** the sai-1 worker returns failed, cancelled, or STOP-bearing completed
- **THEN** the supervision guides with Next step: run /sai-1-spec and leaves the change retryable without dispatching sai-2

