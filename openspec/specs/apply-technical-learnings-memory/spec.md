# apply-technical-learnings-memory Specification

## MODIFIED Requirements

### Requirement: Coordinator accumulates technical learnings across Steps

The coordinator SHALL maintain an accumulated technical-learnings memory built from the technical-learnings field of each subagent report. This memory SHALL be held only by the coordinator; subagents SHALL NOT communicate with each other directly. The coordinator SHALL incorporate a dispatch's learnings as soon as that dispatch returns — not only after the whole Step is verified — so a learning is available to the next dispatch even within the same Step.

#### Scenario: Subagent reports reusable friction

- **WHEN** a subagent's report includes one or more technical-learnings entries
- **THEN** the coordinator incorporates those entries into its accumulated memory when the dispatch returns, before the next dispatch is issued

#### Scenario: No cross-subagent channel exists

- **WHEN** two dispatches are executed by two different subagents
- **THEN** the only path for a learning from the first to reach the second is through the coordinator's memory and selective re-injection — the subagents never exchange information directly

### Requirement: Intra-Step handoff from the test-writer to the implementation dispatch

For a testable Step split into a test-writer dispatch then an implementation dispatch, the coordinator SHALL incorporate the test-writer's technical-learnings when that dispatch returns and, before issuing the implementation dispatch, re-inject the relevant subset into it. The test-writer frequently discovers exactly what the implementation dispatch needs (a real API signature, a missing symbol); the handoff SHALL happen within the same Step — not deferred until after Step verification, which would be too late for the implementation dispatch of the same Step.

#### Scenario: Test-writer discovers a real signature the implementation needs

- **WHEN** the test-writer for a testable Step records a learning (e.g. the real signature of a collaborator) and returns
- **THEN** the coordinator incorporates that learning and injects it into the immediately-following implementation dispatch for the same Step, rather than holding it until after the Step is verified

### Requirement: Coordinator re-injects only relevant learnings, never a full dump

When dispatching a subagent, the coordinator SHALL select and inject only the accumulated learnings it deems relevant to that dispatch. It SHALL NOT dump the entire learnings memory into the dispatch, because that would reintroduce the execution noise the delegation is designed to avoid. Learnings MAY be injected into a blind test-writer dispatch, subject to the blindness constraint: the coordinator SHALL NOT inject any learning that reveals the current Step's GREEN implementation body (per `apply-test-impl-split`). Prior-Step environmental facts (missing symbols, real API signatures) do not violate blindness and MAY be injected.

#### Scenario: Dispatching a Step that touches a previously-troublesome API

- **WHEN** the coordinator dispatches a Step whose work involves an API a prior subagent already characterized
- **THEN** the dispatch includes that specific learning (and other relevant ones) but not the unrelated remainder of the memory

#### Scenario: Injecting learnings into a blind test-writer

- **WHEN** the coordinator dispatches a test-writer for a testable Step and holds an accumulated learning relevant to authoring the test
- **THEN** it injects that learning only if doing so does not reveal the current Step's implementation body, preserving the test-writer's blindness

#### Scenario: Dispatching a Step unrelated to prior friction

- **WHEN** none of the accumulated learnings are relevant to the dispatch being issued
- **THEN** the coordinator injects no learnings for that dispatch rather than dumping the full memory
