# Implement Coordinator Worker Tests Specification

## Purpose

Pin the implementation coordinator and implementation-planning worker to the canonical six-step implementation progress plan through focused structural contract tests in `test/implement-coordinator-worker.test.js`.

## Requirements

### Requirement: implement-coordinator-worker-tests-assert-the-six-step-plan

`test/implement-coordinator-worker.test.js` SHALL assert the implementation progress plan exactly as `implement-progress-plan` specifies: the six step ids `prereqs-resolution`, `collapse-implemented-steps`, `artifact-analysis`, `documentation-review`, `plan-generation`, and `validation` declared in order by the implementation coordinator with the exact imperative labels `Check prerequisites`, `Collapse implemented steps`, `Analyze artifacts and validate decisions`, `Review required documentation`, `Write implementation.md`, and `Validate implementation.md and the audit append`, and the implementation-planning worker contract enumerating the same ids in the same order with the same labels. The tests SHALL fail when a retired `plan-simplification` id remains on either surface, when a label is not imperative, when an id is missing, or when the order changes. The tests SHALL also assert that the declared plan block contains no step id equal to the literal id `review` — scoped to the plan's declared step-id set, never a whole-file substring match, which `documentation-review`, its `Review required documentation` label, and the coordinator's MANDATORY STOP text would falsely trip — and no evidence-marked designation, and that the reconciliation clause carries no carve-out, and SHALL keep asserting the first-run skip-fold behavior under the renamed `collapse-implemented-steps` id.

#### Scenario: ids, labels, and order are asserted

- **WHEN** `node --test test/implement-coordinator-worker.test.js` runs
- **THEN** the coordinator declaration and the worker enumeration assertions SHALL cover exactly the six ids in order with the exact labels above

#### Scenario: declaration parity is asserted across the two surfaces

- **WHEN** the tests extract the coordinator declaration and the worker enumeration `id — "label"` list entries
- **THEN** they SHALL assert the two extracted lists are equal — same ids, same labels, same order, per-line indentation normalized — and SHALL fail on any divergence between the coordinator block and the worker enumeration

#### Scenario: retired id is rejected

- **WHEN** `plan-simplification` appears in the implementation coordinator or the implementation-planning worker contract
- **THEN** the Step 6 plan assertions fail

#### Scenario: no review step and no carve-out

- **WHEN** the tests inspect the implementation plan
- **THEN** they SHALL assert that the declared plan block contains no step id equal to the literal id `review` — a whole-file substring match on `review` is insufficient, because `documentation-review`, its `Review required documentation` label, and the coordinator's MANDATORY STOP text legitimately contain that substring — and no evidence-marked designation
- **AND** they SHALL assert the run-closing `completed` reconciliation clause renders every unmarked step `completed`, with no carve-out

#### Scenario: skip-fold stays asserted under the renamed id

- **WHEN** the tests inspect the implementation-planning worker contract
- **THEN** they SHALL keep asserting the first-run skip-fold — the skipped `collapse-implemented-steps` id folds into the next completed batch in plan order with no separate `skipped` field
