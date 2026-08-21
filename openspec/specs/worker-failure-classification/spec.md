# worker-failure-classification Specification

## Purpose
TBD - created by archiving change bounded-worker-recovery. Update Purpose after archive.
## Requirements
### Requirement: Standalone planning workers apply the shared failure-class rule

The standalone spec-proposal and design-planning workers SHALL classify every post-resolution `failed` result using the shared closed worker-failure rule in `sai/orchestration/command-runner.md` § Bounded Recovery. `blocking-contradiction` SHALL identify conflicting authoritative inputs or an unsafe worker boundary; `validation-failed` a failed phase validation; `generation-error` an artifact-generation failure; `dispatch-failed` a failed nested dispatch; `envelope-contract-violation` an untrusted nested result shape; and `unclassified-worker-fault` an ordinary failure that cannot be placed more specifically. The worker SHALL include concrete non-raw evidence in `summary`, set `unrecoverable: true` only when its own evidence establishes that continuation is unsafe, and SHALL leave routing diagnosis and Cause Locus to the coordinator.

#### Scenario: Spec worker classifies a validation failure
- **WHEN** spec artifact verification fails after resolution
- **THEN** the spec worker SHALL return `failure_class: validation-failed` with `unrecoverable` and concrete non-raw evidence
- **AND** it SHALL not encode a routing diagnosis in the worker payload

#### Scenario: Design worker classifies a main-path contradiction
- **WHEN** design work cannot proceed because authoritative planning inputs contradict one another
- **THEN** the design worker SHALL return `failure_class: blocking-contradiction` with evidence naming the relevant boundary
- **AND** the coordinator SHALL still determine whether the cause is in-scope or out-of-scope

#### Scenario: Worker cannot safely continue
- **WHEN** worker-side evidence establishes that no same-worker continuation can safely repair the failure
- **THEN** the worker SHALL set `unrecoverable: true`
- **AND** the coordinator SHALL not override that veto

#### Scenario: Failure class does not decide recovery
- **WHEN** a worker returns any valid closed failure class
- **THEN** the coordinator SHALL inspect the applicable non-clean evidence before selecting recovery
- **AND** SHALL not infer Cause Locus from `failure_class` or summary prose alone

### Requirement: Planning failure evidence remains lifecycle-only

The worker-authored classification and evidence SHALL be returned only in the closed lifecycle result. The worker SHALL not persist `failure_class`, `unrecoverable`, routing diagnosis, Cause Locus, diagnosis keys, attempt counts, or repair history in proposal, spec, design, task, interface, overview, glossary, or `.openspec.yaml` artifacts.

#### Scenario: A failed planning result has no durable recovery trace
- **WHEN** a standalone planning worker returns a classified failure
- **THEN** only its existing artifact writes and ordered `changed_files` union SHALL be durable
- **AND** no failure or recovery metadata SHALL be added to project artifacts

### Requirement: Failed outcomes carry a closed classification channel

After change resolution, the protocol's closed worker failure-class vocabulary SHALL be `blocking-contradiction`, `validation-failed`, `generation-error`, `dispatch-failed`, `envelope-contract-violation`, and `unclassified-worker-fault`. A valid worker-authored `status: failed` outcome SHALL add exactly two machine-readable fields to the existing closed shape: `failure_class` and `unrecoverable`, with `failure_class` restricted to those six worker-authored values. The coordinator-authored `outer-envelope-violation` classification SHALL remain reserved for a pre-resolution outer-envelope failure or a worker result rejected by coordinator payload validation; it SHALL not become a worker class. Every failed outcome SHALL also carry worker-authored `emitted_on` in the required offset-bearing ISO-8601 form. The existing `summary`, ordered `changed_files`, and `resolved_change_name` fields remain required. A `completed`, `needs_input`, or `cancelled` outcome SHALL not carry these failure-only fields. The shared runner's three routing diagnoses and `Cause Locus` SHALL be coordinator routing metadata, not additional worker payload fields or new failure classes.

#### Scenario: A failed result is classified

- **WHEN** a resolved worker cannot complete its work
- **THEN** its failed outcome SHALL contain one worker-authored `failure_class`
- **AND** SHALL contain a boolean `unrecoverable`
- **AND** SHALL preserve the changed-file union data and resolved change name

#### Scenario: E12 and E13 unpassable apply STOPs use the closed class

- **WHEN** an apply RED or GREEN worker reaches its contract-defined unpassable STOP
- **THEN** it SHALL return `status: failed` with `failure_class: blocking-contradiction` and a boolean `unrecoverable`
- **AND** its summary SHALL carry concrete evidence while the coordinator supplies the routing diagnosis, Cause Locus, and recovery-eligibility decision when the worker veto is false

#### Scenario: Every post-resolution failed class enters diagnosis

- **WHEN** a resolved worker returns any valid failed outcome from the closed class vocabulary, including a class that was not ordinarily eligible under class-only routing
- **THEN** the coordinator SHALL create exactly one routing diagnosis before applying eligibility, veto, or locus rules
- **AND** the worker class SHALL remain unchanged even when the coordinator proves the cause is out of scope or unresolved

#### Scenario: Cancellation remains a clean stop

- **WHEN** a worker deliberately declines or stops at a user request
- **THEN** it SHALL return `status: cancelled` without being treated as a failure
- **AND** the coordinator SHALL not enter diagnosis or recovery for that result

#### Scenario: Post-resolution malformed result is coordinator-owned

- **WHEN** a resolved worker omits a required lifecycle field, supplies an invalid value, or returns an undeclared field
- **THEN** the coordinator SHALL close with coordinator-authored `failure_class: outer-envelope-violation` and routing diagnosis `coordinator rejection`
- **AND** SHALL spend zero recovery attempts while preserving the prior changed-file union

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

Workers SHALL classify failures by the worker-authored closed failure class that the coordinator needs as a diagnostic prior, not by free-form summary wording. `blocking-contradiction` SHALL identify conflicting authoritative sources, an unpassable worker boundary, or another condition that requires human judgment; `validation-failed` SHALL identify a failed phase validation; `generation-error` SHALL identify a generation operation failure; `dispatch-failed` SHALL identify a failed nested dispatch; `envelope-contract-violation` SHALL identify an untrusted nested result shape; and `unclassified-worker-fault` SHALL identify an ordinary routed-worker failure whose cause the worker cannot place in a more specific class. No class alone SHALL decide recovery eligibility: the coordinator SHALL use its independently established Cause Locus, safety evidence, veto, and diagnosis-key uniqueness to decide whether a new recovery slot may be spent. Workers SHALL set `unrecoverable: true` when worker-side evidence says continuation cannot safely repair the failure. The coordinator SHALL separately classify every non-clean closure as exactly one routing diagnosis and SHALL assign `Cause Locus` from coordinator evidence; neither value may be inferred from summary prose or used to add a worker class. Coordinator evidence is exactly the evidence admitted by `bounded-worker-recovery`'s dual inspection channels — independent verification evidence for verifying adapters, and phase-static authorized repair-surface matching over closed machine-readable worker fields for blind opted-in adapters — and never free-form `summary` text.

#### Scenario: Prose does not determine eligibility

- **WHEN** a failed summary uses ambiguous or contradictory prose
- **THEN** the coordinator SHALL route worker recovery from `failure_class`, `unrecoverable`, and its independently inspected cause locus
- **AND** SHALL not parse or infer a worker class, routing diagnosis, Cause Locus, or `diagnosis_key` field from the summary alone

#### Scenario: A worker can veto an unsafe repair

- **WHEN** the worker can see that the relevant artifacts or source inputs are contradictory in a way continuation cannot resolve
- **THEN** it SHALL return the applicable class with `unrecoverable: true`
- **AND** the coordinator SHALL stop recovery without overriding the veto

#### Scenario: E14 coordinator inspection stays independent

- **WHEN** an apply worker returns a result that the coordinator must verify
- **THEN** the coordinator SHALL use its own Verification Checklist and path evidence to determine clean versus non-clean closure and cause locus
- **AND** the worker's class and summary SHALL not replace coordinator verification

### Requirement: Overview generator failures propagate without collapsing envelope violations

When the design worker receives a valid five-field overview-generator result, it SHALL copy that result's `failure_kind` into the outer failed worker's `failure_class` without translating `blocking-contradiction`, `validation-failed`, `generation-error`, or `dispatch-failed`. When the parent detects that the dispatched generator result is malformed, empty, or otherwise violates the generator envelope contract, the design worker SHALL use `failure_class: envelope-contract-violation` rather than collapsing the route into `generation-error`. The existing durable overview state and diagnostic keys SHALL continue to use their current mapping rules for unrecovered failures; a recovery continuation that returns `completed` SHALL instead commit `overview.state: current` and clear both diagnostic keys. The shared non-clean-closure route SHALL not change this design-specific classification or require a direct edit to the design worker surface.

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

The worker SHALL own verification of a worker-side recovery repair and SHALL return `completed` only after the relevant artifact or lifecycle state satisfies the phase contract. The coordinator SHALL forward the worker's classification and summary verbatim for navigation and SHALL not pretend that a worker result is coordinator verification. A phase coordinator that owns independent verification — including Apply's Step Verification Checklist, baseline, allowed-file, and report comparison — SHALL perform that verification itself after the worker result or continuation and SHALL use its evidence to classify clean versus non-clean closure. The shared runner SHALL route the result and preserve both authorities without reading artifacts or inventing technical evidence itself.

#### Scenario: Valid nested-envelope failure is repaired in place

- **WHEN** an overview file is valid and the only failure is a nested generator envelope-contract violation
- **THEN** the same worker MAY repair the reporting boundary and verify the existing artifact
- **AND** it SHALL return `completed` only after that verification

#### Scenario: Coordinator remains independent without becoming a worker

- **WHEN** an apply recovery result is returned
- **THEN** the apply coordinator SHALL independently rerun its Verification Checklist and path comparison before marking a Step or committing
- **AND** the shared runner SHALL not re-derive the coordinator's evidence or changed files

#### Scenario: Coordinator remains artifact-blind

- **WHEN** a recovery result is returned
- **THEN** the coordinator SHALL use only the closed lifecycle metadata and binding result
- **AND** SHALL not independently inspect the change or design artifacts
