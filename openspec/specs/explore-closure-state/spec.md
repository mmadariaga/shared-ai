# explore-closure-state Specification

## Purpose

TBD

## Requirements

### Requirement: Closure behavior follows the explored idea lifecycle

`sai-explore` SHALL maintain the current idea's Closure State in conversation only. The state SHALL be exactly one of `active-uncrystallized`, `crystallized`, or `discarded`, and only `active-uncrystallized` SHALL require the actionable closure defined by this change.

The Closure State begins only when the conversation contains a candidate idea under active exploration. Before a candidate idea exists, no Closure State is active. Once a candidate idea exists, it starts as `active-uncrystallized`. Emitting the one-time readiness signal does not transition the state. Running a viability POC does not transition the state, and a viable POC followed by `Exit` leaves the idea `active-uncrystallized`. A viable POC followed by `Crystallize full` transitions the idea to `crystallized` only after the feature `Ready to Propose` block or blocks are emitted. A not-viable POC followed by `Exit, idea dead` transitions the idea to `discarded`. A not-viable POC followed by `Re-explore with feedback` returns to active exploration. An explicit discard likewise transitions the idea to `discarded`. A materially changed idea is treated as a new active-uncrystallized idea.

#### Scenario: no candidate idea exists

- **WHEN** a successful `sai-explore` turn contains no candidate idea under active exploration
- **THEN** no Closure State is active
- **AND** this change does not require a question or crystallize reminder

#### Scenario: readiness does not end active exploration

- **WHEN** the idea is solid enough for the existing one-time readiness signal but the user has not explicitly requested crystallization
- **THEN** the readiness statement is carried inside the closure reminder line when no genuine unresolved question remains
- **AND** when a genuine unresolved question remains, the response ends with that question and the Closure State remains `active-uncrystallized`

#### Scenario: explicit crystallization ends pre-crystallization closure

- **WHEN** the user explicitly requests crystallization, the existing assessments, any required uncertainty pause, and language gates complete, and a feature block is emitted
- **THEN** the Closure State becomes `crystallized`
- **AND** the question-or-reminder closure is not appended to that crystallization response

#### Scenario: explicit discard ends pre-crystallization closure

- **WHEN** the user explicitly discards the active idea
- **THEN** the Closure State becomes `discarded`
- **AND** subsequent successful responses about that discarded idea do not append the question-or-reminder closure

#### Scenario: a materially changed idea starts a new closure lifecycle

- **WHEN** exploration materially changes the current idea into a new stable idea after the prior idea's readiness tracking would otherwise apply
- **THEN** the new idea is classified as `active-uncrystallized`
- **AND** closure enforcement and readiness tracking are evaluated for the new idea independently

#### Scenario: viable POC exit preserves active-uncrystallized state

- **WHEN** a viability POC is viable and the user selects `Exit`
- **THEN** no feature block is emitted and Closure State remains `active-uncrystallized`
- **AND** the idea is not marked discarded

#### Scenario: not-viable exit marks the idea discarded

- **WHEN** a viability POC is not viable and the user selects `Exit, idea dead`
- **THEN** Closure State becomes `discarded`
- **AND** no feature block is emitted
