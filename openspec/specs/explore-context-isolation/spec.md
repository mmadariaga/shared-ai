# explore-context-isolation Specification

## Purpose
TBD - created by archiving change tasks-as-scaffold. Update Purpose after archive.
## Requirements
### Requirement: explore-no-inline-proposal

`sai-explore` SHALL NOT create or modify proposal/spec artifacts itself. When an idea becomes solid, it SHALL continue to emit the readiness signal and, only on explicit crystallization, the existing `Ready to Propose` block. If the user later sends `start-pipeline`, explore MAY coordinate an isolated routed `/sai-1-spec` worker on supported harnesses; this dispatch is not inline spec execution because the worker receives only the crystallized handoff and owns every write. Without the token, no spec worker SHALL be dispatched.

#### Scenario: idea crystallizes without pipeline consent

- **WHEN** explore emits a `Ready to Propose` block and the user has not sent `start-pipeline`
- **THEN** explore creates no proposal/spec artifact and dispatches no spec worker

#### Scenario: user explicitly starts the isolated pipeline

- **WHEN** the user sends `start-pipeline` for a change in the tracked crystallized set on a supported harness
- **THEN** explore coordinates an isolated spec-proposal worker using the crystallized block
- **AND** explore itself performs no file write

---

### Requirement: explore-context-preserved

The explore agent MUST remain a read-and-discuss coordinator and MUST NOT create, modify, or delete files directly. It MAY dispatch workers whose explicit phase contracts authorize writes, provided each worker writes only within the change directory it owns and explore neither expands that scope nor performs a write on the worker's behalf. Outside an explicitly user-triggered supervised pipeline, explore SHALL NOT invoke a write-producing phase.

#### Scenario: explore performs ordinary discussion or review

- **WHEN** no user-triggered supervised pipeline is active
- **THEN** explore invokes no write-producing phase and no file is written by explore

#### Scenario: dispatched worker writes within owned scope

- **WHEN** a user-triggered supervised pipeline dispatches the spec-proposal worker
- **THEN** only the worker may write `proposal.md`, `specs/**`, and permitted change metadata within its owned change directory
- **AND** explore performs no direct write

#### Scenario: write would escape the owned change directory

- **WHEN** a supervised operation would write outside the dispatched worker's owned change directory
- **THEN** the pipeline refuses that write
- **AND** explore does not perform or delegate the out-of-scope write
