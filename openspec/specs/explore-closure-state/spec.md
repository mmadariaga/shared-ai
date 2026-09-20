# explore-closure-state Specification

## Purpose

TBD

## Requirements

### Requirement: Closure behavior follows the explored idea lifecycle

`sai-explore` SHALL maintain the current idea's Closure State in conversation only. The state SHALL be exactly one of `active-uncrystallized`, `crystallized`, or `discarded`, and only `active-uncrystallized` SHALL require the actionable closure defined by this change.

The Closure State begins only when the conversation contains a candidate idea under active exploration. Before a candidate idea exists, no Closure State is active. Once a candidate idea exists, it starts as `active-uncrystallized`. Emitting the one-time readiness signal does not transition the state. Running the POC lane SHALL NOT transition the state on any branch: neither a `<Cn> wins` verdict nor a `none` verdict SHALL mark the idea `crystallized` or `discarded`, and the automatic advancement out of the lane SHALL NOT start a new lifecycle. The idea becomes `crystallized` only after the feature `Ready to Propose` block or blocks are emitted, and `discarded` only on an explicit discard. A materially changed idea is treated as a new active-uncrystallized idea.

#### Scenario: no candidate idea exists

- **WHEN** a successful `sai-explore` turn contains no candidate idea under active exploration
- **THEN** no Closure State is active

#### Scenario: readiness does not end active exploration

- **WHEN** the idea is solid enough for the existing one-time readiness signal but the user has not explicitly requested crystallization
- **THEN** the Closure State remains `active-uncrystallized`

#### Scenario: explicit crystallization ends pre-crystallization closure

- **WHEN** the user explicitly requests crystallization, the assessments and language gates complete, and a feature block is emitted
- **THEN** the Closure State becomes `crystallized`

#### Scenario: explicit discard ends pre-crystallization closure

- **WHEN** the user explicitly discards the active idea
- **THEN** the Closure State becomes `discarded`

#### Scenario: a materially changed idea starts a new closure lifecycle

- **WHEN** exploration materially changes the current idea into a new stable idea
- **THEN** the new idea is classified as `active-uncrystallized` and closure enforcement is evaluated for it independently

#### Scenario: viable POC exit preserves active-uncrystallized state

- **WHEN** the POC lane reaches a `<Cn> wins` verdict and the user selects `Stay here` instead of advancing
- **THEN** no feature block is emitted, the Closure State remains `active-uncrystallized`, and the idea is not marked discarded

#### Scenario: a none verdict does not mark the idea discarded

- **WHEN** the POC lane reaches a `none` verdict and stops
- **THEN** the idea is not marked discarded and the Closure State remains `active-uncrystallized`, because only an explicit discard transitions it to `discarded`

#### Scenario: the POC lane never transitions the Closure State

- **WHEN** the POC lane runs and reaches either a `<Cn> wins` or a `none` verdict
- **THEN** the Closure State remains `active-uncrystallized` and the idea is neither crystallized nor discarded
