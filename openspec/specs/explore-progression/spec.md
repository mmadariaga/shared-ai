# explore-progression Specification

## Purpose
TBD - created by archiving change implicit-next-step-agreement. Update Purpose after archive.

## Requirements

### Requirement: Bare next-step records agreement at Review edge cases

The system SHALL treat a bare `next-step` turn at `Review edge cases` with a non-empty list as confirmation only when the presentation-currency check passes: it records the latest complete displayed ordered list as agreed and advances to `Implementation details` within the same turn with no separate confirmation. A bare token with a current presentation SHALL be confirmation, not an ambiguous response. A missing notice or stale presentation SHALL instead cause full redisplay and a new question without recording or advancement.

#### Scenario: Bare token advances from edge-case review

- **WHEN** the turn at `Review edge cases` is a bare `next-step` with a non-empty list and, for user-confirmed lists, the latest complete displayed list includes all agreed semantic changes and the complete confirmation notice
- **THEN** the current ordered list is recorded as agreed and the stage advances to `Implementation details` in the same turn

#### Scenario: Bare token is never treated as ambiguous

- **WHEN** the turn at `Review edge cases` with a non-empty list is a bare `next-step` and, for user-confirmed lists, the latest complete displayed list includes all agreed semantic changes and the complete confirmation notice
- **THEN** it is classified as confirmation rather than as an ambiguous response, and the gate question is not re-asked

### Requirement: Bare next-step records agreement at Implementation details

The system SHALL treat a bare `next-step` turn at `Implementation details` with a non-empty list as confirmation only when the presentation-currency check passes: it records the latest complete displayed ordered list as agreed and advances to `Crystallize` within the same turn with no separate confirmation. A bare token with a current presentation SHALL be confirmation, not an ambiguous response. A missing notice or stale presentation SHALL instead cause full redisplay and a new question without recording or advancement.

#### Scenario: Bare token advances from implementation details

- **WHEN** the turn at `Implementation details` is a bare `next-step` with a non-empty list and, for user-confirmed lists, the latest complete displayed list includes all agreed semantic changes and the complete confirmation notice
- **THEN** the current ordered list is recorded as agreed and the stage advances into `Crystallize` in the same turn

#### Scenario: Bare token is never treated as ambiguous

- **WHEN** the turn at `Implementation details` with a non-empty list is a bare `next-step` and, for user-confirmed lists, the latest complete displayed list includes all agreed semantic changes and the complete confirmation notice
- **THEN** it is classified as confirmation rather than as an ambiguous response, and the confirmation question is not re-asked

### Requirement: Same-turn revision dominates navigation

The system SHALL treat a same-turn revision paired with `next-step` as a revision, not navigation: it updates and renumbers the list, stays open, re-asks the gate question, and does not advance.

#### Scenario: Revision plus token stays open

- **WHEN** a turn at either list gate requests changes and also contains `next-step`
- **THEN** the list is updated and renumbered, the stage stays open, the question is re-asked, and no advancement occurs

### Requirement: Token hygiene and next-step-only scope

The system SHALL never fire or record agreement on mere containment of `next-step`, and SHALL never advance or record agreement on a negated, deferred, quoted, or discussed token; implicit agreement SHALL apply to `next-step` only, equally in all modes; `crystallize` SHALL carry no defined action and SHALL NOT be retained as a pending request, and a material idea change SHALL discard prior implicit agreements with prior proposals.

#### Scenario: Non-navigation token never records agreement

- **WHEN** a turn merely contains, negates, defers, quotes, or discusses `next-step`, or requests `crystallize` before agreement
- **THEN** no agreement is recorded and no advancement occurs on that token alone

### Requirement: List-stage agreement and advancement are two ordered events

The explore step instructions SHALL state that, at the `Review edge cases` and `Implementation details` stages, recording the agreed list and advancing the progression are two separate events to `explore-idea@1`, sent in that order within the same turn. The recording event SHALL leave the stage unchanged, and the advancement event SHALL return the `next.follow` pointer that names the next step. Every description of same-turn confirmation in those instructions SHALL be consistent with this two-event sequence.

For user-confirmed lists, agreement SHALL be accepted only when the latest complete displayed list, with current identifiers, incorporates every semantic change agreed since its presentation and includes the complete confirmation notice from **Display and question** in `sai/commands/explore/list-writing.md`. Otherwise the shared review, display, and question sequence SHALL run and wait for another confirmation; the earlier answer SHALL neither record agreement nor advance. The automatic empty-E recording remains exempt, while an I list containing `- None` remains subject to this check.

#### Scenario: Semantic confirmation sends two events in order

- **WHEN** the user semantically confirms the proposed list at a list stage and, for user-confirmed lists, the latest complete displayed list includes all agreed semantic changes and the complete confirmation notice
- **THEN** the session sends the event that records the agreed list and then the advancement event within the same turn

#### Scenario: Bare next-step sends the same two events

- **WHEN** the turn at a list stage with a non-empty list is a bare `next-step` and, for user-confirmed lists, the latest complete displayed list includes all agreed semantic changes and the complete confirmation notice
- **THEN** the session records the current ordered list as agreed and then advances, as the same two events within the same turn

#### Scenario: Recording alone does not advance

- **WHEN** only the event that records the agreed list has been sent
- **THEN** the stage is unchanged until the advancement event is sent

### Requirement: List confirmation applies only to the current informed presentation

In Claude Code and opencode, E/I list presentation SHALL have one authoritative **Display and question** contract in `sai/commands/explore/list-writing.md`, referenced by both stage files without partial restatements. It SHALL display the complete list and current identifiers, name the list and change, explain that agreement preserves scope boundaries in the handoff, and offer confirmation or additions, removals, or changes. The one plain conversational question SHALL use the ambient language, require no fixed agreement phrase, use no native yes/no picker, and explicitly explain that a bare `next-step` confirms this displayed list as written and advances in the same turn. The edge-case list, probes, and question SHALL retain their one-message order. An I list containing `- None` SHALL receive the same complete question; automatic empty-E recording needs no notice.

For user-confirmed lists, agreement SHALL be accepted only when the latest complete displayed list, with current identifiers, incorporates every semantic change agreed since its presentation and includes the complete confirmation notice from **Display and question** in `sai/commands/explore/list-writing.md`. Otherwise the shared review, display, and question sequence SHALL run and wait for another confirmation; the earlier answer SHALL neither record agreement nor advance. The automatic empty-E recording remains exempt, while an I list containing `- None` remains subject to this check.

A semantic change SHALL mean a change to an item's behavior or boundary, not style alone. Discussion changing no item's meaning SHALL leave presentation current without redisplay or extra confirmation. Currency SHALL be checked in conversation context without changing `explore-idea@1` or adding persisted fields. Same-turn revision plus `next-step` SHALL retain revision precedence: update and renumber, stay open, re-ask, and wait for another confirmation. Confirmation SHALL apply only to the latest complete displayed version, never an earlier version.

#### Scenario: Both list stages reach one presentation owner
- **WHEN** either list stage presents a user-confirmed E/I list
- **THEN** it follows the shared complete display and question contract, including the explicit next-step confirmation and advancement notice

#### Scenario: Missing notice invalidates attempted confirmation
- **WHEN** the user agrees or sends next-step after a list displayed without the complete confirmation notice
- **THEN** Explore repeats the shared review, complete display, and question sequence and waits for another confirmation without recording or advancement

#### Scenario: Side discussion changes an item before confirmation
- **WHEN** discussion changes an item's meaning after its last full display and the user then agrees or sends next-step
- **THEN** Explore presents the complete revised list with current identifiers through the shared sequence and waits for a new confirmation; the earlier answer neither confirms nor advances

#### Scenario: Discussion does not change meaning
- **WHEN** explanation or discussion changes no item's behavior or boundary and the latest display includes the complete notice
- **THEN** that presentation remains current and needs no redisplay or extra confirmation before accepting agreement

#### Scenario: Multiple revisions bind agreement to the latest display
- **WHEN** several revisions have occurred and the user confirms the current fully displayed list with the complete notice
- **THEN** only that latest complete list is recorded, followed by the advancement event in the same turn

#### Scenario: Automatic empty E recording is exempt
- **WHEN** no in-scope edge case exists and the edge-case stage records the empty E list automatically
- **THEN** no confirmation notice or user-confirmation currency check is required

#### Scenario: Empty I list is user confirmed
- **WHEN** no technical decision qualifies at Implementation details
- **THEN** Explore proposes - None with the complete question and accepts confirmation only after its presentation-currency check passes
