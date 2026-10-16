# explore-route-choice Specification

## Purpose
TBD - created by archiving change defer-explore-route-until-visible-crystallization. Update Purpose after archive.

## Requirements

### Requirement: Route choice waits for a complete crystallization inventory

The Explore route-choice capability SHALL accept route input only after the shared crystallization close has displayed the complete ordered `Ready to Propose` block set, successfully recorded its inventory, and entered `waiting`. When no slice is active, the successful inventory result SHALL return `next.follow: sai/commands/explore/steps/route-selector.md`, and the selector SHALL start the optional question rounds in that same assistant turn and present its native picker as round 3 only after rounds 1 and 2 have finished or been skipped. Picker presentation SHALL not emit `intent: route-choice`, a route intent, or dispatch work. Only a valid picker answer returned in a later turn SHALL emit `intent: route-choice` and expose route processing. If a slice remains active, its own pointer SHALL remain authoritative and the new picker SHALL wait until that slice closes.

#### Scenario: Later reply opens route interpretation

- **WHEN** the complete block set is visible, ordered inventory recording succeeds, and the native picker later returns exactly one fixed route label
- **THEN** Explore emits `intent: route-choice`, follows the selector pointer, and interprets only that recorded picker identity before dispatching the matching route

#### Scenario: Premature route input is rejected

- **WHEN** a Plan or Direct Build intent arrives before complete inventory recording or before the valid picker answer has unlocked route-choice
- **THEN** the machine rejects it with the applicable closed rejection and starts no route

#### Scenario: Picker follows the optional rounds

- **WHEN** inventory recording succeeds with no active slice and the user accepted backlog capture in round 1
- **THEN** the route picker is presented only after round 2 and its authorized actions finish

### Requirement: Later route replies recognize exactly one fixed route

The route-choice capability SHALL present exactly one native single-select route question with the fixed English labels `Plan - Unattended`, `Direct Build - Unattended`, and `Manual`, in that order, as round 3 under `sai/policies/question-rounds.md`; the conditional Direct Build continuation question MAY join the same native call as a separate question. Claude Code SHALL use `AskUserQuestion` and opencode SHALL use the `question` tool. Their stable identities SHALL remain `plan-unattended`, `direct-build-unattended`, and `manual`. Only an exact returned fixed label SHALL map to an identity. A cancelled, absent, `Other` or free-text, ambiguous, or multi-route response SHALL select no route and SHALL preserve the waiting inventory.

#### Scenario: Clear Plan reply

- **WHEN** the native picker returns exactly `Plan - Unattended`
- **THEN** Explore records `plan-unattended` and emits only the Plan route intent after route-choice activation

#### Scenario: Ambiguous reply

- **WHEN** the picker is cancelled, absent, returns free text, or does not map to exactly one fixed label
- **THEN** Explore keeps `route_choice_reply_pending` true, emits no route intent, and presents no delegated work

#### Scenario: Continuation question shares the round 3 call

- **WHEN** round 3 is presented for a set with more than one pending slice
- **THEN** the route question stays one single-select question with the fixed labels, and the continuation question is a separate question in the same native call

### Requirement: Explicit route choice remains the delegated-write gate

A valid native picker answer SHALL remain the sole route-selection authorization. A valid Plan answer SHALL authorize the existing supervised Plan dispatch, and a valid Direct Build answer SHALL authorize the existing Direct Build dispatch and exactly one local commit within its closed order. A valid Manual answer SHALL dispatch no worker and SHALL authorize no delegated write. Fast-track SHALL not bypass the picker answer or auto-select a route.

#### Scenario: Manual reply does not dispatch

- **WHEN** the native picker returns exactly `Manual`
- **THEN** Explore emits the Manual handoff without a worker dispatch or delegated write

#### Scenario: Fast-track still waits

- **WHEN** fast-track is active after the crystallization close and the picker has only been presented
- **THEN** no route starts until a later valid picker answer is returned
