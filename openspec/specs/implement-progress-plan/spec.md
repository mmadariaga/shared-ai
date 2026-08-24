# implement-progress-plan — Spec

## MODIFIED Requirements

### Requirement: implement-plan-steps-match-workflow

The implementation plan steps SHALL correspond one-to-one to the implementation-planning workflow: `collapse-implemented-steps` covers Step 1 (collapse every fully applied `#### Step N` of an existing `implementation.md` to `*(already applied)*`, skipped on a first run); `artifact-analysis` covers Steps 2–3 (parse the artifacts, classify audit findings, validate design decisions for ADR/DDR); `documentation-review` covers Step 4 (read required documentation one time only); `plan-generation` covers Step 5's write (first-run generation or re-run preservation plus the audit-derived step append); `validation` covers the worker's pre-delivery durable-artifact verification — the `implementation.md` invariants and the audit-derived step append check, which remains a non-completion blocker: any failed check returns a non-completed lifecycle result and never a `completed` claim. The plan SHALL NOT include a `specs-approval` step: the specs approval gate belongs to the design phase.

The workflow SHALL be executed from the step instruction files under `sai/commands/implement/steps/`: the worker executes only the step file named by the coordinator's `Active step:` pointer line on each progress-event continuation and never prefetches, opens, or follows any other step instruction file. `prereqs-resolution` runs from the worker contract plus `steps/common.md` before the first progress event, and the first delivered pointer targets `collapse-implemented-steps`. Step 1 executes from `collapse-implemented-steps.md`, Steps 2–3 from `artifact-analysis.md`, Step 4 from `documentation-review.md`, Step 5 from `plan-generation.md`, and the pre-delivery verification from `validation.md`.

#### Scenario: workflow steps map to plan steps

- **WHEN** the step instruction files under `sai/commands/implement/steps/` named by the coordinator's `Active step:` pointer lines are executed
- **THEN** each step's completion SHALL be reportable under exactly one of the declared plan step ids

#### Scenario: no approval step in the implementation plan

- **WHEN** the implementation plan is inspected
- **THEN** it SHALL contain exactly the six declared steps and SHALL NOT contain a `specs-approval` step

#### Scenario: validation step covers the durable verification

- **WHEN** the worker completes the pre-delivery durable-artifact verification of `implementation.md` and the audit-derived step append check
- **THEN** those acts SHALL be reported under `validation`
- **AND** a failed verification SHALL NOT emit a `completed` claim — the run closes with a non-completed lifecycle result instead

### Requirement: Validation owns durable implementation-plan verification

The implementation worker SHALL execute the canonical `validation` step as the sole technical source for pre-delivery verification of `implementation.md` invariants and the audit-derived step-append check. A failed validation SHALL produce a non-completed lifecycle result.

#### Scenario: Durable validation fails

- **WHEN** a required implementation-plan or audit-step check fails during `validation`
- **THEN** the worker returns a failed result and does not claim planning completion.
