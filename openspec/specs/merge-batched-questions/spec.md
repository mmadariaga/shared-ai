# merge-batched-questions Specification

## Purpose
Defines how `/sai-merge` groups its closed decisions into batched user trips (Batch 1 before the launch, Batch 2 on the first conflict) and the batch shape the worker-report validator accepts.

## Requirements

### Requirement: Batch v1 shape keeps singular valid
A needs_input carrying questions:[{id, question, options}] SHALL be treated as a batch with stable ordered ids and closed questions only with no conditional items, while absence of questions SHALL keep the singular question/options form valid for backward compatibility.
#### Scenario: Singular still validates
- **WHEN** a worker returns singular question/options with no questions field
- **THEN** validation accepts it as before

### Requirement: Validator dually validates singular and batch v1
The worker-report validator SHALL accept the singular form and the batch v1 form, SHALL reject duplicate ids, empty questions arrays, and empty options arrays (batch v1 carries closed questions only), and SHALL preserve order and exact values.
#### Scenario: Duplicate batch ids rejected
- **WHEN** a batch carries duplicated scope ids
- **THEN** validation fails with a duplicated-id error
