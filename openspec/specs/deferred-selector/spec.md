# deferred-selector Specification

## Purpose
TBD - created by archiving change explore-deferred-route-todo. Update Purpose after archive.

## Requirements

### Requirement: Deferred route choice served by idle via next follow

After a successful inventory emit, the machine SHALL enter `waiting` and, when no slice is active, return `next.follow: sai/commands/explore/steps/route-selector.md`. The route selector SHALL present its native picker at the end of the same assistant turn after the complete block set and ordered inventory are recorded. Presentation SHALL not select or start a route. Only a valid picker answer in a later turn SHALL emit `intent: route-choice` and expose route processing. Fast-track SHALL never auto-select it.

#### Scenario: Idle with pending presents choice before dispatch

- **WHEN** crystallization concludes with same-turn block emission, at least one pending slice, and no active route running
- **THEN** the machine records the inventory, returns the selector pointer, presents the native picker, and requires a later valid picker answer before route dispatch

### Requirement: Deferred choice presentation with fixed titles and identities

The deferred choice SHALL be presented as one native single-select picker with exactly three fixed English labels: `Plan - Unattended`, `Direct Build - Unattended`, and `Manual`. Their stable machine-readable identities SHALL remain `plan-unattended`, `direct-build-unattended`, and `manual`. Claude Code SHALL use `AskUserQuestion` and opencode SHALL use the `question` tool. Only the exact returned fixed label SHALL map to an identity. A typed route name outside the picker, cancelled picker, absent response, `Other` or free-text answer, or response that maps to zero or multiple labels SHALL be ambiguous and SHALL not be treated as Manual.

#### Scenario: Choice presents three fixed routes via picker

- **WHEN** the selector is reached after successful inventory recording with a pending slice
- **THEN** it presents the three fixed options in order and starts no route until one exact picker label is returned later

### Requirement: Deterministic choice over pending set with retryable failure

Deterministic route selection SHALL use only the first pending slice in crystallization order and SHALL not present a slice-name picker or Cancel. It SHALL never re-run a completed slice, and SHALL leave a failed, cancelled, or otherwise unrecovered active step pending and retryable by parking the first slice in `explore-slice@1` waiting state. After a route finishes or is parked, a returned selector pointer SHALL present a fresh picker; it SHALL not reuse an earlier route answer. A material idea change before choice SHALL invalidate the crystallized set and restart at Explore change.

#### Scenario: Multi-slice set resolves one slice and preserves the rest

- **WHEN** multiple uncompleted slices remain after a route finishes cleanly
- **THEN** the next picker applies only to the first pending slice in emission order with no slice-name picker or Cancel and dispatches at most that one entry

#### Scenario: Ordered choice preserves remaining pending slices

- **WHEN** the first pending slice completes cleanly with others still pending
- **THEN** the remaining slices stay pending in crystallization order, and a fresh route choice waits for a later explicit picker answer
