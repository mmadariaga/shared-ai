# explore-progression Specification

## Purpose
TBD - created by archiving change implicit-next-step-agreement. Update Purpose after archive.

## Requirements

### Requirement: Bare next-step records agreement at Review edge cases

The system SHALL treat a bare `next-step` turn at the `Review edge cases` gate with a non-empty list as confirmation: it records the current ordered list as agreed and advances to `Implementation details` within the same turn with no separate confirmation. A bare `next-step` turn SHALL NOT be classified as an ambiguous response and SHALL NOT be routed to the clarify-and-re-ask branch.

#### Scenario: Bare token advances from edge-case review

- **WHEN** the turn at `Review edge cases` is a bare `next-step` with a non-empty list
- **THEN** the current ordered list is recorded as agreed and the stage advances to `Implementation details` in the same turn

#### Scenario: Bare token is never treated as ambiguous

- **WHEN** the turn at `Review edge cases` with a non-empty list is a bare `next-step`
- **THEN** it is classified as confirmation rather than as an ambiguous response, and the gate question is not re-asked

### Requirement: Bare next-step records agreement at Implementation details

The system SHALL treat a bare `next-step` turn at the `Implementation details` gate with a non-empty list as confirmation: it records the current ordered list as agreed, completes the stage, and advances into `Crystallize` within the same turn with no separate confirmation. A bare `next-step` turn SHALL NOT be classified as an ambiguous response and SHALL NOT be routed to the clarify-and-re-ask branch.

#### Scenario: Bare token advances from implementation details

- **WHEN** the turn at `Implementation details` is a bare `next-step` with a non-empty list
- **THEN** the current ordered list is recorded as agreed and the stage advances into `Crystallize` in the same turn

#### Scenario: Bare token is never treated as ambiguous

- **WHEN** the turn at `Implementation details` with a non-empty list is a bare `next-step`
- **THEN** it is classified as confirmation rather than as an ambiguous response, and the confirmation question is not re-asked

### Requirement: Same-turn revision dominates navigation

The system SHALL treat a same-turn revision paired with `next-step` as a revision, not navigation: it updates and renumbers the list, stays open, re-asks the gate question, and does not advance.

#### Scenario: Revision plus token stays open

- **WHEN** a turn at either list gate requests changes and also contains `next-step`
- **THEN** the list is updated and renumbered, the stage stays open, the question is re-asked, and no advancement occurs

### Requirement: Token hygiene and next-step-only scope

The system SHALL never fire or record agreement on mere containment of `next-step`, and SHALL never advance or record agreement on a negated, deferred, quoted, or discussed token; implicit agreement SHALL apply to `next-step` only so a premature `crystallize` before agreement stays pending with no skip path, equally in all modes, and a material idea change SHALL discard prior implicit agreements with prior proposals and pending requests.

#### Scenario: Non-navigation token never records agreement

- **WHEN** a turn merely contains, negates, defers, quotes, or discusses `next-step`, or requests `crystallize` before agreement
- **THEN** no agreement is recorded and no advancement occurs on that token alone

### Requirement: List-stage agreement and advancement are two ordered events

The explore step instructions SHALL state that, at the `Review edge cases` and `Implementation details` stages, recording the agreed list and advancing the progression are two separate events to `explore-idea@1`, sent in that order within the same turn. The recording event SHALL leave the stage unchanged, and the advancement event SHALL return the `next.follow` pointer that names the next step. Every description of same-turn confirmation in those instructions SHALL be consistent with this two-event sequence.

#### Scenario: Semantic confirmation sends two events in order

- **WHEN** the user semantically confirms the proposed list at a list stage
- **THEN** the session sends the event that records the agreed list and then the advancement event within the same turn

#### Scenario: Bare next-step sends the same two events

- **WHEN** the turn at a list stage with a non-empty list is a bare `next-step`
- **THEN** the session records the current ordered list as agreed and then advances, as the same two events within the same turn

#### Scenario: Recording alone does not advance

- **WHEN** only the event that records the agreed list has been sent
- **THEN** the stage is unchanged until the advancement event is sent
