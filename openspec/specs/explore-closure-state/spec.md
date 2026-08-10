# explore-closure-state Specification

## Purpose

TBD

## Requirements

### Requirement: Closure behavior follows the explored idea lifecycle

`sai-explore` SHALL maintain the current idea's Closure State in conversation only. The state SHALL be exactly one of `active-uncrystallized`, `crystallized`, or `discarded`, and only `active-uncrystallized` SHALL require the actionable closure defined by this change.

The Closure State begins only when the conversation contains a candidate idea under active exploration. Before a candidate idea exists, no Closure State is active and this change's closure requirement does not apply. Once a candidate idea exists, it starts as `active-uncrystallized`. Emitting the one-time readiness signal does not transition the state and does not bypass the closure requirement. An explicit crystallization request that emits the existing `Ready to Propose` block transitions the idea to `crystallized`. An explicit user decision to discard the idea transitions it to `discarded`. A materially changed idea is treated as a new active-uncrystallized idea. The existing explicit-request gate for producing `Ready to Propose` MUST remain unchanged.

#### Scenario: No candidate idea exists

- **WHEN** a successful `sai-explore` turn contains no candidate idea under active exploration
- **THEN** no Closure State is active
- **AND** this change does not require a question or crystallize reminder

#### Scenario: Readiness does not end active exploration

- **WHEN** the idea is solid enough for the existing one-time readiness signal but the user has not explicitly requested crystallization
- **THEN** the signal SHALL be emitted according to the existing once-per-stable-idea rule
- **AND** the Closure State remains `active-uncrystallized`
- **AND** the signal MAY also satisfy the actionable closure when it contains the literal `crystallize` and states that crystallization generates the paste-ready prompt for `/sai-1-spec`
- **AND** otherwise the response ends with the actionable closure required for that state

#### Scenario: Explicit crystallization ends pre-crystallization closure

- **WHEN** the user explicitly requests crystallization, the existing slicing and language gates complete, and a `Ready to Propose` block is emitted
- **THEN** the Closure State becomes `crystallized`
- **AND** the new question-or-reminder closure is not appended to that crystallization response
- **AND** the existing crystallization block closing behavior remains in force

#### Scenario: Explicit discard ends pre-crystallization closure

- **WHEN** the user explicitly discards the active idea
- **THEN** the Closure State becomes `discarded`
- **AND** subsequent successful responses about that discarded idea do not append the question-or-reminder closure

#### Scenario: A materially changed idea starts a new closure lifecycle

- **WHEN** exploration materially changes the current idea into a new stable idea after the prior idea's readiness tracking would otherwise apply
- **THEN** the new idea is classified as `active-uncrystallized`
- **AND** closure enforcement and the existing readiness-signal tracking are evaluated for the new idea independently
