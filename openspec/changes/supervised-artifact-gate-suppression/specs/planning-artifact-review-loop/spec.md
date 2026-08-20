## MODIFIED Requirements

### Requirement: coexistence-with-existing-review-surfaces

The worker-owned review loop SHALL coexist with, and SHALL NOT replace, the coordinator-owned prose feedback gate or the supervised pipeline's own in-session review rounds.

In the selector-dispatched supervised flow, explore's in-session review rounds (`supervised-review-in-session`, `supervised-review-rounds`, `supervised-review-reporting`) run in the explore session itself through the Review Engine, and the worker-owned pass SHALL run in addition to them. Because the supervised flow declares no progress plan, no list renders there and step marking has no application, while the worker still emits its progress event per the coordinator contract's plan-independent obligations.

This duplication is an explicitly accepted trade-off. Per phase, the worst case is the worker-owned layer dispatching 6 total attempts to obtain at most 3 completed passes, plus the supervised layer running at most 3 in-session rounds over that phase's artifacts. Because design chaining now proceeds on every non-`failed`/`cancelled` spec ending — convergence and cap exhaustion alike — a full supervised run spanning both phases carries that worst case twice, once for the spec phase's artifacts and once for the design phase's; the supervised layer itself dispatches no reviewer subagents in either phase.

The worker-owned loop SHALL NOT use, alter, or depend on the `MachineFeedbackAdapter` of `sai/policies/artifact-feedback-gate.md`, which remains owned by the supervised pipeline.

When the worker-owned automatic loop ends by convergence, completed-pass-cap exhaustion, or total-attempt-cap exhaustion under an interactive fetch site (standalone `/sai-1-spec` or `/sai-2-design`, `mode` omitted or `interactive`), the coordinator SHALL still present the prose feedback gate at iteration 0, unchanged. When that loop ends under a supervised fetch site (`mode = supervised`), the coordinator SHALL NOT present the prose feedback gate at iteration 0; the supervised gate application point SHALL auto-proceed per `artifact-feedback-gate` instead.

#### Scenario: the prose feedback gate still runs interactively

- **WHEN** the worker-owned automatic loop ends by convergence, completed-pass-cap exhaustion, or total-attempt-cap exhaustion under an interactive fetch site
- **THEN** the coordinator SHALL still present the prose feedback gate at iteration 0, unchanged

#### Scenario: supervised ending auto-proceeds without iteration-0 presentation

- **WHEN** the worker-owned automatic loop ends by convergence, completed-pass-cap exhaustion, or total-attempt-cap exhaustion under a supervised fetch site (`mode = supervised`)
- **THEN** the coordinator SHALL NOT present the prose feedback gate at iteration 0
- **AND** the supervised gate application point auto-proceeds per the shared gate's supervised rules

#### Scenario: the supervised pipeline keeps its own rounds

- **WHEN** the spec worker runs under selector-dispatched supervision
- **THEN** explore's in-session review rounds SHALL run in the explore session through the Review Engine
- **AND** the worker-owned pass SHALL run in addition to them

#### Scenario: marking has no application under supervision

- **WHEN** the worker emits a progress event carrying `review` in the supervised flow
- **THEN** the event's `changed_files` SHALL still join the supervision report and the worker SHALL still be continued with `continue_after_progress`
- **AND** no list SHALL render and no step SHALL be marked, because no adapter-declared plan is in force
