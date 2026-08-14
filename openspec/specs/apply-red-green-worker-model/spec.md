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

The matrix builder and its validation SHALL accept the two apply worker identities and their contract paths. `bin/worker-matrix.js` and `bin/install-manifest.js` SHALL extend the phase-order model, the worker identity regex, and the worker contract path regex to admit `sai-4-red-worker` / `sai-4-green-worker` and their contracts under `sai/commands/apply/` without relaxing validation for the existing seven phases. The installed-worker roster and binding validators in `bin/install-flow.js` SHALL accept nine workers instead of seven.

#### Scenario: builder accepts the new identities

- **WHEN** the manifest is validated with the two apply entries
- **THEN** the builder and install validators accept `sai-4-red-worker` and `sai-4-green-worker` with their contract paths, and the existing seven-phase validation rules still pass

#### Scenario: roster validation counts nine

- **WHEN** install-time worker roster validation runs
- **THEN** it accepts the seven phase workers plus the two apply workers

### Requirement: red-worker-contract

The RED worker contract (`sai/commands/apply/red-worker.md`) SHALL define the test-authoring worker: it writes the tests and RED/interface stubs for a RED-carrying Step and verifies a valid RED (an assertion failure attributable to the behavior under test). In the split flow it SHALL be blind to the GREEN implementation body — given only the Step's `interfaces.md` section, the injected testing context, and its allowed-file list. In the green-exception flow (a production-free Step — testable or non-testable — whose scope holds no production file) it SHALL author or execute the test-scoped body so the tests end green, SHALL be terminal, and SHALL report GREEN = pass. The RED worker SHALL be the only worker that authors tests; it SHALL never be terminal with broken tests.

#### Scenario: RED worker authors tests in the split flow

- **WHEN** a Split-Routed Step is dispatched to the RED worker
- **THEN** the RED worker writes tests and RED stubs from the `interfaces.md` Step N contract plus injected testing context, verifies a valid RED, and leaves the tests red for the GREEN worker

#### Scenario: RED worker authors tests in the green-exception flow

- **WHEN** a production-free Step with a RED block is dispatched to the RED worker
- **THEN** the RED worker authors the tests, makes them green, is terminal, and reports GREEN = pass

#### Scenario: RED worker executes a non-testable production-free body

- **WHEN** a non-testable production-free Step (test-only, interfaces-only, or other production-free scope) is dispatched to the RED worker under the green-exception
- **THEN** the RED worker executes the test-scoped body, leaves the tests green, is terminal, and reports GREEN = pass

### Requirement: green-worker-contract

The GREEN worker contract (`sai/commands/apply/green-worker.md`) SHALL define the implementation worker: it executes a Step's implementation body (or the GREEN side of a split Step) and verifies GREEN, for Steps whose plan-level file scope contains at least one production file. It SHALL be FORBIDDEN from creating or modifying any test file — an absolute prohibition. It SHALL iterate on GREEN within bounded attempts confined to non-test files and SHALL STOP with a GREEN-conflict report when passing would require editing a test file or the declared interface, or when iteration makes no progress. A non-testable Step with no production surface SHALL NOT be dispatched to the GREEN worker; it routes to the RED worker under the green-exception.

#### Scenario: GREEN worker implements a Step

- **WHEN** a Step without a RED block and with at least one production file is dispatched to the GREEN worker
- **THEN** the GREEN worker runs the body without authoring tests and reports the GREEN result

#### Scenario: GREEN worker never touches tests

- **WHEN** the GREEN worker iterates to satisfy a failing assertion
- **THEN** it modifies only non-test files and reports a GREEN conflict instead of editing the test or interface

#### Scenario: production-free Steps never reach the GREEN worker

- **WHEN** a Step's plan-level file scope contains no production file
- **THEN** it is never dispatched to the GREEN worker; it routes to the RED worker under the green-exception

### Requirement: apply-worker-lifecycle

Both apply workers SHALL follow the shared worker lifecycle: each returns exactly one terminal lifecycle status (`completed`, `needs_input`, `failed`, or `cancelled`) with a string `summary` and a string-list `changed_files`; each post-resolution payload SHALL include `resolved_change_name`. Workers SHALL NOT run git operations, create commits, or edit `implementation.md`. The `changed_files` payload SHALL exclude every path below the declared scratch path `.tmp/{change-name}/` — the same scratch-free rule that governs report field 8 — so scratch never enters the coordinator's `changed_files` union or the pre-commit add-list.

Because change resolution is coordinator-owned (`apply-coordinator-centric-execution`), the apply workers never resolve the change themselves. The coordinator SHALL inject the resolved change name into each worker dispatch envelope (`arguments_value` carries the resolved change name), and each worker SHALL echo that injected value as `resolved_change_name` in every post-resolution payload. A worker SHALL NOT derive `resolved_change_name` by parsing or re-resolving.

The apply phase adapter SHALL declare the apply progress plan per `apply-routed-card-set` — the static ordered per-dispatch milestone plan (e.g. a RED dispatch's `test-authoring` and `red-verification`, or a GREEN dispatch's `implementation` and `green-verification`) — and the dispatched worker SHALL emit progress events marking the milestones it completes, per the shared progress-event contract. The run-start step projection (the `implementation.md` Step list) is NOT this plan and is never marked from worker progress events, per `apply-step-projection`.

#### Scenario: apply worker returns closed lifecycle payloads

- **WHEN** an apply worker finishes a dispatch
- **THEN** it returns a closed lifecycle payload with status, summary, and changed_files — never artifact contents, continuation identifiers, or binding metadata

#### Scenario: apply worker never touches git or the plan

- **WHEN** an apply worker executes a Step
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
