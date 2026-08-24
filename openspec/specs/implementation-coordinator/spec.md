# implementation-coordinator — Spec

## MODIFIED Requirements

### Requirement: Shared lifecycle adapter integration

The routed `/sai-3-implement` coordinator SHALL consume the canonical shared coordinator contract through an implementation phase adapter. The adapter SHALL provide the original `arguments_value` request, harness binding dispatch and continuation operations, progress events as the sole allowed nonterminal extension, no extension handlers, the enumerated implementation replacement-reconstruction fields below, and parameterized implementation terminal navigation that selects standalone completion or the composition-owned authorized transition by adapter position. The adapter SHALL NOT duplicate lifecycle payload validation, ordered changed-file aggregation, continuation-first recovery, replacement-worker limits, or terminal routing, and SHALL NOT import design feedback, notice, or continue-now behavior.

The replacement-reconstruction fields SHALL be exactly:

- `resolved_change_name` when resolution already occurred;
- `opaque_input_history`, an ordered list whose entries contain only one prior worker-authored `question`, its ordered `options`, and the exact selected `answer_value`;
- `durable_artifact_reconstruction_instruction`, a fixed instruction requiring the replacement worker to rerun prerequisites and independently reread current change artifacts, audit artifacts, and `implementation.md` from disk; and
- `active_step_id`, the departing worker's active step identifier under the step-gated instruction delivery map.

The coordinator SHALL retain the accumulated `changed_files` union itself rather than seed the replacement worker's empty journal. It SHALL NOT pass artifact contents, inferred planning state, design `pending_feedback`, design notice acknowledgements, design fast-track presentation flags, or binding continuation identifiers as reconstruction fields.

#### Scenario: Implementation lifecycle result is processed

- **WHEN** the implementation-planning worker returns a lifecycle payload under Claude Code or opencode
- **THEN** the coordinator SHALL process it through the canonical shared coordinator contract
- **AND** implementation-specific behavior SHALL enter only through the declared phase-adapter fields

#### Scenario: Design-only event reaches implementation

- **WHEN** the implementation coordinator receives a design notice, artifact-feedback event, or continue-now transition
- **THEN** it SHALL reject that event as unsupported rather than adding a design-only extension or processing it as an implementation lifecycle status

#### Scenario: Continuation cannot resume the original worker

- **WHEN** same-worker implementation continuation fails
- **THEN** the shared lifecycle SHALL preserve the ordered changed-file union and dispatch at most one replacement worker only when the original envelope, `resolved_change_name` when applicable, complete `opaque_input_history`, `durable_artifact_reconstruction_instruction`, and `active_step_id` are available
- **AND** the replacement worker SHALL rebuild technical state from durable artifacts rather than receive artifact contents or the prior worker journal
- **AND** the replacement's first continuation SHALL carry the correct pointer line for the active step named by `active_step_id`

#### Scenario: Reconstruction metadata is incomplete

- **WHEN** the coordinator cannot provide an exact required reconstruction field
- **THEN** it SHALL return a failed restart request and SHALL NOT dispatch a replacement worker with inferred or partial state

### Requirement: Lifecycle-only implementation coordinator

The routed implementation coordinator SHALL own adapter routing, progress rendering, pointer delivery, result validation, and terminal navigation only. It SHALL NOT perform technical planning, read implementation artifacts, run git or OpenSpec checks, or write planning files.

#### Scenario: Coordinator processes a worker result

- **WHEN** the implementation worker returns a lifecycle result
- **THEN** the coordinator validates and routes the result without performing technical planning or artifact I/O.
