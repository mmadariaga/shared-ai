# apply-step-delegation Specification

## MODIFIED Requirements

### Requirement: Coordinator dispatches each Step to a subagent

During `sai-4-apply`, the main thread SHALL act as a coordinator: for each Step in `implementation.md` it SHALL identify the next unchecked Step and dispatch a subagent to execute that Step. The number of dispatches depends on the Step's testability: a **non-testable** Step (no RED block) is dispatched to exactly one subagent, while a **testable** Step (with a RED block) is split into two ordered dispatches — a test-writer then an implementation subagent — per `apply-test-impl-split`. In all cases the coordinator itself SHALL NOT perform the read-before-write reads, RED-test runs, or GREEN iteration of the Step — those happen inside the subagent(s) so their output never enters the coordinator's context.

#### Scenario: Coordinator reaches the next unchecked Step

- **WHEN** the coordinator finishes one Step and looks for the next work
- **THEN** it locates the next Step in `implementation.md` whose checkboxes are not all `[x]` and dispatches a subagent to execute that Step: one subagent for a non-testable Step, or a test-writer followed by an implementation subagent for a testable Step

#### Scenario: Coordinator does not absorb execution noise

- **WHEN** a Step requires reading files before writing, running a RED test, or iterating on GREEN
- **THEN** those operations are performed by the subagent(s), and only the subagent's compact report (not the raw file dumps, tracebacks, or iteration logs) returns to the coordinator

### Requirement: Subagent receives the Step text plus execution rules

When dispatching a subagent, the coordinator SHALL provide the material that subagent needs and nothing that would reopen the mirroring channel:

- For a **non-testable** Step, the coordinator SHALL provide the full text of the Step, the read-before-write rule, and any technical learnings it deems relevant (per `apply-technical-learnings-memory`). The subagent SHALL execute the Step's implementation body.
- For a **testable** Step, the coordinator SHALL dispatch two subagents whose prompt contracts are defined by `apply-test-impl-split`: the test-writer receives that Step's `interfaces.md` section plus the injected testing context and NOT the GREEN body; the implementation subagent receives the GREEN implementation body and the read-before-write rule and is forbidden from modifying test files.

#### Scenario: Non-testable Step is dispatched

- **WHEN** the coordinator dispatches a non-testable Step
- **THEN** the subagent's instructions include the full Step text and the read-before-write rule, and the subagent executes the Step's implementation body

#### Scenario: Testable Step is dispatched

- **WHEN** the coordinator dispatches a testable Step
- **THEN** it issues a test-writer dispatch (interfaces.md Step N + injected testing context, no GREEN body) and, after a valid RED, a separate implementation dispatch (GREEN body, forbidden from editing test files), per `apply-test-impl-split`
