# explore-progression Specification

## Purpose
TBD - created by archiving change implicit-next-step-agreement. Update Purpose after archive.

## Requirements

### Requirement: Bare next-step records agreement at Review edge cases

The system SHALL treat a bare `next-step` turn at the `Review edge cases` gate with a non-empty list as confirmation: it records the current ordered list as agreed and advances to `Implementation details` within the same turn with no separate confirmation.

#### Scenario: Bare token advances from edge-case review

- **WHEN** the turn at `Review edge cases` is a bare `next-step` with a non-empty list
- **THEN** the current ordered list is recorded as agreed and the stage advances to `Implementation details` in the same turn

### Requirement: Bare next-step records agreement at Implementation details

The system SHALL treat a bare `next-step` turn at the `Implementation details` gate with a non-empty list as confirmation: it records the current ordered list as agreed, completes the stage, and advances into `Crystallize` within the same turn with no separate confirmation.

#### Scenario: Bare token advances from implementation details

- **WHEN** the turn at `Implementation details` is a bare `next-step` with a non-empty list
- **THEN** the current ordered list is recorded as agreed and the stage advances into `Crystallize` in the same turn

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
