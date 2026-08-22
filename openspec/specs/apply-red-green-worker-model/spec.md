# apply-red-green-worker-model Specification

## Purpose

Defines the two managed Step-execution workers for `/sai-4-apply` — `sai-4-red-worker` (test authoring, blind in the split flow, green-exception in the production-free flow) and `sai-4-green-worker` (implementation with an absolute test-file prohibition) — projected through the worker-matrix on the budget tier.
## Requirements
### Requirement: apply-worker-matrix-entries

The worker-matrix SHALL contain exactly two apply entries: `sai-4-red-worker` and `sai-4-green-worker`. Each entry SHALL declare its phase, worker identity, worker contract path under `sai/commands/apply/`, binding stem, dispatch primitive, initial dispatch and continuation literals, replacement fields, helper permissions, progress declaration, and the per-harness agent parameters. Both entries SHALL be on the budget tier — the first worker-matrix entries whose model tier is the budget tier rather than the standard routed model tier. The existing seven routed phase entries SHALL remain unchanged in identity and order.

#### Scenario: matrix materializes both apply workers

- **WHEN** the worker-matrix is expanded for either supported harness
- **THEN** it materializes a binding and an agent file for `sai-4-red-worker` and for `sai-4-green-worker`, alongside the seven phase workers

#### Scenario: apply workers run the budget tier

- **WHEN** the apply worker matrix entries are inspected
- **THEN** their declared model tier is the budget tier, not the standard routed model tier

#### Scenario: existing phase entries are undisturbed

- **WHEN** the matrix is expanded after adding the apply entries
- **THEN** the seven existing phase entries keep their identities, order, and destinations

### Requirement: matrix-builder-accepts-apply-workers

The matrix builder and its validation SHALL accept the two apply worker identities and their contract paths. `bin/worker-matrix.js` and `bin/install-manifest.js` SHALL extend the phase-order model, the worker identity regex, and the worker contract path regex to admit `sai-4-red-worker` / `sai-4-green-worker` and their contracts under `sai/commands/apply/` without relaxing validation for the existing seven phases. The installed-worker roster and binding validators in `bin/install-flow.js` SHALL accept ten workers instead of seven, admitting the later-added `sai-commit-worker` alongside the seven phase workers and the two apply workers.

#### Scenario: builder accepts the new identities

- **WHEN** the manifest is validated with the two apply entries
- **THEN** the builder and install validators accept `sai-4-red-worker` and `sai-4-green-worker` with their contract paths, and the existing seven-phase validation rules still pass

#### Scenario: roster validation counts ten

- **WHEN** install-time worker roster validation runs
- **THEN** it accepts the seven phase workers, the two apply workers, and `sai-commit-worker`

### Requirement: red-worker-contract

The RED worker contract (`sai/commands/apply/red-worker.md`) SHALL define the test-authoring worker: it writes the tests and RED/interface stubs for a RED-carrying Step and verifies a valid RED (an assertion failure attributable to the behavior under test). In the split flow it SHALL be blind to the GREEN implementation body — given only the Step's `interfaces.md` section, the injected testing context, and its allowed-file list. In the green-exception flow (a production-free Step — testable or non-testable — whose scope holds no production file) it SHALL author or execute the test-scoped body so the tests end green, SHALL be terminal after the ordinary dispatch, and SHALL report GREEN = pass. If that ordinary dispatch has an eligible non-clean closure, the coordinator SHALL reopen the same RED session for the bounded recovery continuation; terminality still applies when the continuation closes. In the split flow, a valid RED is an expected intermediate completion: the RED worker SHALL return its normal completed report while the authored tests remain red for the following GREEN dispatch. Only a green-exception terminal outcome may not leave tests broken, and an unpassable RED STOP is a failed outcome rather than a completed report. The RED worker SHALL be the only worker that authors tests.

When the coordinator selects an eligible in-scope RED diagnosis, the RED worker SHALL receive `continue_after_recovery` and SHALL resume the same session with the original blind prompt restrictions. It MAY modify only plan-authorized tests and RED/interface stubs during that continuation; it SHALL never modify production files, the GREEN implementation body, or `implementation.md`. If it reaches an unpassable RED STOP — including a contradiction that cannot be repaired within the authorized test/stub boundary or a bounded failure to produce a valid RED — it SHALL return a worker-core `status: failed` outcome with `failure_class: blocking-contradiction` and a boolean `unrecoverable`. The worker SHALL set `unrecoverable: true` only when its own concrete evidence establishes that continuation is unsafe; otherwise it SHALL return `unrecoverable: false` so the coordinator can apply the shared Cause Locus eligibility rule. The failed summary SHALL contain concrete, non-raw evidence naming the Step, the relevant artifact and concrete point, the injected command or assertion involved, and the observed failure boundary. Its apply report SHALL set `STOP reached?` to `yes` with the exact existing STOP marker and SHALL not imply that GREEN may be dispatched.

#### Scenario: RED worker authors tests in the split flow

- **WHEN** a Split-Routed Step is dispatched to the RED worker
- **THEN** the RED worker writes tests and RED stubs from the `interfaces.md` Step N contract plus injected testing context, verifies a valid RED, and leaves the tests red for the GREEN worker

#### Scenario: RED worker authors tests in the green-exception flow

- **WHEN** a production-free Step with a RED block is dispatched to the RED worker
- **THEN** the RED worker authors the tests, makes them green, is terminal, and reports GREEN = pass

#### Scenario: RED worker executes a non-testable production-free body

- **WHEN** a non-testable production-free Step (test-only, interfaces-only, or other production-free scope) is dispatched to the RED worker under the green-exception
- **THEN** the RED worker executes the test-scoped body, leaves the tests green, is terminal, and reports GREEN = pass

#### Scenario: RED recovery stays within the RED boundary

- **WHEN** the coordinator supplies `continue_after_recovery` with an in-scope RED correction
- **THEN** the RED worker resumes the same session and may change only authorized tests or RED/interface stubs
- **AND** it remains blind to the GREEN implementation body

#### Scenario: E12 unpassable RED returns a blocking contradiction

- **WHEN** the RED worker cannot produce a valid RED without crossing its authorized boundary or after bounded authorized recovery the source, test, interface, or injected command remains contradictory
- **THEN** it returns `status: failed`, `failure_class: blocking-contradiction`, and a boolean `unrecoverable`
- **AND** its summary and report carry concrete evidence and `STOP reached? = yes`
- **AND** it does not dispatch or authorize GREEN

#### Scenario: RED out-of-scope claims are evidence-backed

- **WHEN** a RED worker or coordinator claims that a RED discrepancy lies outside the worker's authorized test or RED-stub scope
- **THEN** the claim SHALL name the relevant artifact, concrete point, injected command or assertion, and observed boundary
- **AND** an unsupported claim SHALL remain unresolved and SHALL spend zero recovery attempts

### Requirement: green-worker-contract

The GREEN worker contract (`sai/commands/apply/green-worker.md`) SHALL define the implementation worker: it executes a Step's implementation body (or the GREEN side of a split Step) and verifies GREEN, for Steps whose plan-level file scope contains at least one production file. It SHALL be FORBIDDEN from creating or modifying any test file — an absolute prohibition. It SHALL iterate on GREEN within bounded attempts confined to non-test files and SHALL STOP with a GREEN-conflict report when passing would require editing a test file or the declared interface, or when iteration makes no progress. A non-testable Step with no production surface SHALL NOT be dispatched to the GREEN worker; it routes to the RED worker under the green-exception.

On `continue_after_recovery`, the GREEN worker SHALL resume the same session and apply only the authorized correction within its existing production-file boundary. It SHALL never treat a coordinator-owned `implementation.md` plan-artifact repair as permission to edit production or test files. If it reaches an unpassable GREEN STOP — because passing would require a test/interface edit, because the implementation and test/interface sources are contradictory, or because bounded implementation-only iteration makes no progress — it SHALL return `status: failed` with `failure_class: blocking-contradiction` and a boolean `unrecoverable`. The worker SHALL set `unrecoverable: true` only when its own concrete evidence establishes that continuation is unsafe; otherwise it SHALL return `unrecoverable: false` so the coordinator can apply the shared Cause Locus eligibility rule. The failed summary SHALL contain concrete, non-raw evidence naming the Step, relevant artifact and concrete point, verification command or assertion, and observed failure boundary. Its apply report SHALL set `GREEN result = fail` and `STOP reached? = yes` with the exact existing STOP marker. The worker SHALL leave all test and interface files untouched and SHALL not claim a recoverable GREEN result for this STOP.

#### Scenario: GREEN worker implements a Step

- **WHEN** a Step without a RED block and with at least one production file is dispatched to the GREEN worker
- **THEN** the GREEN worker runs the body without authoring tests and reports the GREEN result

#### Scenario: GREEN worker never touches tests

- **WHEN** the GREEN worker iterates to satisfy a failing assertion or resumes a recovery continuation
- **THEN** it modifies only non-test files and reports a GREEN conflict instead of editing the test or interface

#### Scenario: E13 unpassable GREEN returns a blocking contradiction

- **WHEN** the GREEN worker determines that a test or interface edit, an out-of-bound production edit, or further no-progress iteration is required to pass
- **THEN** it returns `status: failed`, `failure_class: blocking-contradiction`, and a boolean `unrecoverable`
- **AND** its summary and report carry concrete evidence, `GREEN result = fail`, and `STOP reached? = yes`
- **AND** no test or interface file is created or modified

#### Scenario: GREEN out-of-scope claims are evidence-backed

- **WHEN** a GREEN worker or coordinator claims that passing would require an out-of-scope production, test, or interface change
- **THEN** the claim SHALL name the relevant artifact, concrete point, verification assertion or command, and observed boundary
- **AND** an unsupported claim SHALL remain unresolved and SHALL spend zero recovery attempts

#### Scenario: production-free Steps never reach the GREEN worker

- **WHEN** a Step's plan-level file scope contains no production file
- **THEN** it is never dispatched to the GREEN worker; it routes to the RED worker under the green-exception

### Requirement: Apply worker lifecycle payloads carry emission time

RED and GREEN workers SHALL include worker-authored `emitted_on` in every progress and terminal payload while preserving their scope boundaries, test-file prohibition, green-exception routing, and worker-core failure metadata. A failed unpassable STOP SHALL carry `failure_class: blocking-contradiction` and boolean `unrecoverable` in the lifecycle envelope; the worker sets the veto only from concrete worker-side evidence, while the coordinator's Cause Locus decides eligibility when the veto is false. The fixed nine-field apply report remains the only report extension and carries evidence through its existing summary, learning, STOP, and file fields rather than adding a tenth field.

#### Scenario: Apply worker reports a milestone

- **WHEN** a RED or GREEN worker completes a declared milestone
- **THEN** its lifecycle result includes `emitted_on` and the existing changed-file data

#### Scenario: Apply worker reports an unpassable STOP

- **WHEN** a RED or GREEN worker returns its contract-defined unpassable STOP
- **THEN** the terminal lifecycle envelope includes `status: failed`, `failure_class: blocking-contradiction`, a boolean `unrecoverable`, and worker-authored evidence in `summary`
- **AND** the report extension remains within the existing nine-field contract

### Requirement: apply-worker-lifecycle

Both apply workers SHALL follow the shared worker lifecycle: each returns exactly one terminal lifecycle status (`completed`, `needs_input`, `failed`, or `cancelled`) with a string `summary` and a string-list `changed_files`; each post-resolution payload SHALL include `resolved_change_name`. A failed result SHALL use the worker-core closed `failure_class` and boolean `unrecoverable` fields, and a cancelled result SHALL omit them. Workers SHALL NOT run git operations, create commits, or edit `implementation.md`. The `changed_files` payload SHALL exclude every path below the declared scratch path `.tmp/{change-name}/` — the same scratch-free rule that governs report field 8 — so scratch never enters the coordinator's `changed_files` union or the pre-commit add-list.

Because change resolution is coordinator-owned (`apply-coordinator-centric-execution`), the apply workers never resolve the change themselves. The coordinator SHALL inject the resolved change name into each worker dispatch envelope (`arguments_value` carries the resolved change name), and each worker SHALL echo that injected value as `resolved_change_name` in every post-resolution payload. A worker SHALL NOT derive `resolved_change_name` by parsing or re-resolving.

The apply phase adapter SHALL declare the apply progress plan per `apply-routed-card-set` — the static ordered per-dispatch milestone plan (e.g. a RED dispatch's `test-authoring` and `red-verification`, or a GREEN dispatch's `implementation` and `green-verification`) — and the dispatched worker SHALL emit progress events marking the milestones it completes, per the shared progress-event contract. The run-start step projection (the `implementation.md` Step list) is NOT this plan and is never marked from worker progress events, per `apply-step-projection`. A recovery continuation SHALL preserve the active worker's lifecycle, progress plan, scope, and report extension; it SHALL not let a worker mark plan checkboxes or author a coordinator diagnosis.

#### Scenario: apply worker returns closed lifecycle payloads

- **WHEN** an apply worker finishes a dispatch
- **THEN** it returns a closed lifecycle payload with status, summary, and changed_files — never artifact contents, continuation identifiers, or binding metadata

#### Scenario: apply worker never touches git or the plan

- **WHEN** an apply worker executes a Step or recovery continuation
- **THEN** it performs no git operation, creates no commit, and does not modify `implementation.md`

#### Scenario: scratch paths never enter the changed_files payload

- **WHEN** an apply worker creates files under `.tmp/{change-name}/` during a dispatch
- **THEN** its `changed_files` payload does not list those paths, matching the field-8 exclusion rule

#### Scenario: apply worker marks its declared milestone plan

- **WHEN** a RED or GREEN worker completes an execution milestone
- **THEN** it emits a progress event carrying that milestone's step id from the apply progress plan, and the coordinator marks it in the declared plan — the run-start step projection is never marked from these events

#### Scenario: coordinator injects the resolved change name

- **WHEN** the coordinator dispatches a RED or GREEN worker
- **THEN** the dispatch envelope carries the resolved change name in `arguments_value`, and the worker echoes it as `resolved_change_name` in every post-resolution payload without re-resolving it

