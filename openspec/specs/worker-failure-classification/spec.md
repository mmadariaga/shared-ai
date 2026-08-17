# worker-failure-classification Specification

## Purpose
TBD - created by archiving change bounded-worker-recovery. Update Purpose after archive.
## Requirements
### Requirement: Failed outcomes carry a closed classification channel
After change resolution, the protocol's closed failure-class vocabulary SHALL be `blocking-contradiction`, `validation-failed`, `generation-error`, `dispatch-failed`, `envelope-contract-violation`, `outer-envelope-violation`, and `unclassified-worker-fault`. A valid worker-authored `status: failed` outcome SHALL add exactly two machine-readable fields to the existing closed shape: `failure_class` and `unrecoverable`, with `failure_class` restricted to the six worker-authored values other than `outer-envelope-violation`. Every failed outcome SHALL also carry worker-authored `emitted_on` in the required offset-bearing ISO-8601 form. `outer-envelope-violation` SHALL be coordinator-authored only when coordinator validation rejects a worker result. The existing `summary`, ordered `changed_files`, and `resolved_change_name` fields remain required. A `completed`, `needs_input`, or `cancelled` outcome SHALL not carry these failure-only fields.

#### Scenario: A failed result is classified
- **WHEN** a resolved worker cannot complete its work
- **THEN** its failed outcome SHALL contain one worker-authored `failure_class`
- **AND** SHALL contain a boolean `unrecoverable`
- **AND** SHALL preserve the changed-file union data and resolved change name

#### Scenario: Cancellation remains a clean stop
- **WHEN** a worker deliberately declines or stops at a user request
- **THEN** it SHALL return `status: cancelled` without being treated as a failure
- **AND** the coordinator SHALL not enter recovery for that result

#### Scenario: Unknown classification is not accepted
- **WHEN** a failed outcome omits `failure_class`, uses an unknown value, or supplies a non-boolean `unrecoverable`
- **THEN** the coordinator SHALL reject the outcome as an output-contract violation
- **AND** SHALL spend no recovery attempt and SHALL not dispatch a replacement worker for that invalid outcome
- **AND** SHALL preserve the changed-file union accumulated from prior valid results
- **AND** SHALL terminate through the existing failed hand-back, naming `outer-envelope-violation` and the offending value or missing field

#### Scenario: Worker cannot author the outer-envelope class
- **WHEN** a worker-authored failed outcome carries `failure_class: outer-envelope-violation`
- **THEN** the coordinator SHALL reject that worker outcome as an output-contract violation
- **AND** SHALL spend no recovery attempt and SHALL not dispatch a replacement worker for it
- **AND** SHALL author the terminal `outer-envelope-violation` classification itself, naming the offending worker-authored value

### Requirement: Classification reflects the repair boundary
Workers SHALL classify failures by the worker-authored closed failure class that the coordinator needs for repairability routing, not by free-form summary wording. `blocking-contradiction` SHALL identify conflicting authoritative sources that require human judgment; `validation-failed` SHALL identify a failed overview-generation validation; `generation-error` SHALL identify an overview-generation operation failure; `dispatch-failed` SHALL identify a failed nested overview-generation dispatch; `envelope-contract-violation` SHALL identify an untrusted nested generator result shape; and `unclassified-worker-fault` SHALL identify any ordinary routed-worker failure outside the overview-generation recovery scope. Only the coordinator may author `outer-envelope-violation` for a worker result rejected during validation. Workers SHALL set `unrecoverable: true` when the worker-side evidence says continuation cannot safely repair the failure.

#### Scenario: Prose does not determine eligibility
- **WHEN** a failed summary uses ambiguous or contradictory prose
- **THEN** the coordinator SHALL route from `failure_class` and `unrecoverable`
- **AND** SHALL not parse or infer a class from the summary

#### Scenario: A worker can veto an unsafe repair
- **WHEN** the worker can see that the relevant artifacts or source inputs are contradictory in a way continuation cannot resolve
- **THEN** it SHALL return the applicable class with `unrecoverable: true`
- **AND** the coordinator SHALL stop recovery without artifact inspection of its own

### Requirement: Overview generator failures propagate without collapsing envelope violations
When the design worker receives a valid five-field overview-generator result, it SHALL copy that result's `failure_kind` into the outer failed worker's `failure_class` without translating `blocking-contradiction`, `validation-failed`, `generation-error`, or `dispatch-failed`. When the parent detects that the dispatched generator result is malformed, empty, or otherwise violates the generator envelope contract, the design worker SHALL use `failure_class: envelope-contract-violation` rather than collapsing the route into `generation-error`. The existing durable overview state and diagnostic keys SHALL continue to use their current mapping rules for unrecovered failures; a recovery continuation that returns `completed` SHALL instead commit `overview.state: current` and clear both diagnostic keys.

#### Scenario: Generator failure kind reaches the worker result
- **WHEN** the overview generator returns a valid failed envelope with `failure_kind: validation-failed`
- **THEN** the design worker's failed lifecycle outcome SHALL carry `failure_class: validation-failed`
- **AND** SHALL preserve the generator's non-empty diagnostic in the worker-authored summary and existing durable carrier

#### Scenario: Malformed generator envelope gets its own class
- **WHEN** a dispatched generator emits an unknown field, missing field, empty result, or invalid five-field value
- **THEN** the design worker SHALL return `failure_class: envelope-contract-violation`
- **AND** SHALL not classify the outer worker failure as `generation-error`
- **AND** SHALL preserve the potentially affected overview path and current durable diagnostic behavior

#### Scenario: Dispatch failure keeps its generator class
- **WHEN** the parent cannot acknowledge the nested overview-generation dispatch
- **THEN** the parent-authored generator envelope SHALL retain `failure_kind: dispatch-failed`
- **AND** the outer failed worker outcome SHALL carry `failure_class: dispatch-failed`

### Requirement: Repair verification belongs to the worker
The worker SHALL own verification of any recovery repair and SHALL return `completed` only after the relevant artifact or lifecycle state satisfies the phase contract. The coordinator SHALL forward the worker's classification and summary verbatim for navigation and SHALL not read artifacts, resolve phase data, or reconstruct `changed_files` to decide whether the repair succeeded.

#### Scenario: Valid nested-envelope failure is repaired in place
- **WHEN** an overview file is valid and the only failure is a nested generator envelope-contract violation
- **THEN** the same worker MAY repair the reporting boundary and verify the existing artifact
- **AND** it SHALL return `completed` only after that verification

#### Scenario: Coordinator remains artifact-blind
- **WHEN** a recovery result is returned
- **THEN** the coordinator SHALL use only the closed lifecycle metadata and binding result
- **AND** SHALL not independently inspect the change or design artifacts
