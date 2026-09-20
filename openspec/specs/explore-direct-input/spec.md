# explore-direct-input Specification

## Purpose
TBD - created by archiving change explore-direct-input-maturation. Update Purpose after archive.

## Requirements

### Requirement: Direct-looking request classification

The `sai-explore` instruction SHALL treat an input phrased as a direct implementation command as the initial content of a candidate idea and SHALL NOT treat imperative wording as authorization to implement, dispatch, or leave Explore.

#### Scenario: Imperative opening treated as idea

- **WHEN** the user input opens with imperative implementation wording such as Implement, Fix, Add, or Apply
- **THEN** Explore records it as idea content and continues maturation instead of dispatching implementation

### Requirement: Maturation gate preservation

The `sai-explore` flow SHALL require `Explore change`, `Review edge cases`, `Implementation details`, and `Crystallize` including final route selection for direct-looking requests, and SHALL NOT provide a skip path based on imperative wording.

#### Scenario: Mandatory gates for direct requests

- **WHEN** a direct-looking request has supplied detailed objectives and constraints
- **THEN** Explore still requires edge-case review, implementation details, and crystallization before route selection

### Requirement: Context preservation without redundant discovery

The `sai-explore` flow SHALL preserve stated objectives, constraints, and acceptance criteria from a direct-looking request as the idea starting content and SHALL ask only the unresolved substantive questions.

#### Scenario: Detailed request confirmation

- **WHEN** a direct-looking request already supplies objectives, constraints, and acceptance criteria
- **THEN** Explore confirms concisely and asks only unresolved substantive questions without re-running full discovery

### Requirement: Read-only handoff boundary

The `sai-explore` instruction SHALL prohibit handoff to `/sai-4-apply` or `/sai-build`, advice to exit Explore, or implementation dispatch before the crystallization-close route selector based only on imperative wording, while keeping the explicit artifact-review deliverable on its existing review path.

#### Scenario: No early handoff from imperative wording

- **WHEN** the idea content uses imperative implementation phrasing without reaching the crystallization-close selector
- **THEN** Explore performs no implementation dispatch and offers no early exit or handoff
