# implementation-coordinator — Spec

## Purpose

TBD - this spec was authored as a change delta and never merged into the main tree, so its requirements were invisible to validate, list, and archive. Summarize the capability here.

## Requirements

### Requirement: Shared lifecycle adapter integration

The implementation coordinator SHALL retain shared closed-payload validation, ready handshakes, answer transport, ordered changed-file aggregation, continuation-first recovery, and replacement limits. It SHALL bind those fields separately per category worker and use a parallel result loop instead of single-worker scheduling and immediate failure close. Child adapters SHALL have no progress plan or nonterminal extensions. Reconstruction SHALL contain the original complete task, resolved name, exact opaque_input_history, current run identity, assignment, and a durable instruction naming run.json and the assigned part. It SHALL not contain artifact contents, another worker's journal, design-only feedback state, or binding identifiers. A child's completed payload SHALL not complete the phase; verified coordinator publication SHALL control positional terminal navigation.

#### Scenario: Implementation lifecycle result is processed

- **WHEN** a category worker returns a lifecycle payload under Claude Code or opencode
- **THEN** shared validation and aggregation process it while the implementation coordinator's parallel loop records the child's outcome separately from phase completion.

#### Scenario: Design-only event reaches implementation

- **WHEN** the implementation coordinator receives a design notice, artifact-feedback event, or continue-now transition
- **THEN** it rejects the unsupported event rather than adding a design-only extension.

#### Scenario: Continuation cannot resume the original worker

- **WHEN** same-worker continuation fails
- **THEN** the coordinator preserves its changed-file union and uses at most one bounded replacement with complete original-task and reconstruction evidence, without cancelling siblings or passing artifact contents or an active-step pointer.

#### Scenario: Reconstruction metadata is incomplete

- **WHEN** an exact required reconstruction field is unavailable
- **THEN** replacement is not dispatched with inferred or partial state and the affected worker's restart failure is reported.

### Requirement: Lifecycle-only implementation coordinator

The routed implementation coordinator SHALL now own technical common preparation, category routing, integration, verification, and the sole final implementation.md write, as well as lifecycle routing and presentation. It SHALL execute shared preparation once, preserve existing authorization and rerun contracts, and run no production implementation Step. After all required zero-task worker handles and ready returns are captured, it SHALL open one no-commit guard window immediately before task disclosure when no window is running. It SHALL reuse an existing window and verify it at human, mutation, and run-close boundaries, including failure close, rather than create independent child baselines. Only the guard's authorized remediation permits a mutating git command.

#### Scenario: Coordinator processes a worker result

- **WHEN** a category worker returns a lifecycle result
- **THEN** the coordinator validates it, collects siblings, and performs complete-plan integration and verification only on valid parts.

#### Scenario: the guard's two tool invocations are the only clean-route git access

- **WHEN** category-worker task disclosure follows validated ready returns and captured handles
- **THEN** a single snapshot opens the shared guard window if needed and a single verify closes it at the next required boundary, without deriving separate per-child baselines or granting workers git-mutation authority.
