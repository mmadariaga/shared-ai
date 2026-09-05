# crystallization-close Specification

## Purpose
TBD - created by archiving change fix-crystallization-close-selector. Update Purpose after archive.
## Requirements
### Requirement: Crystallization-close emission guarantee on every crystallization path
The crystallization-close SHALL emit exactly one native-picker selector after the keep-window-open recommendation on every single-change, sliced-feature, and inline-refusal crystallization turn, carrying exactly `Plan - Unattended`, `Direct Build - Unattended`, `Manual`, and SHALL never end the turn after the recommendation without that picker call.

#### Scenario: Single crystallization emits selector after recommendation
- **WHEN** a single-change crystallization turn emits its block and recommendation
- **THEN** it emits one native-picker selector with the three exact titles as the final emission

### Requirement: Only native-picker selector counts with fixed English titles
The selector SHALL count only as a harness-native picker call per remember.md, a plain-text list SHALL NOT count as the selector, and the three titles SHALL remain fixed English in fixed order.

#### Scenario: Plain-text list does not satisfy selector
- **WHEN** a crystallization turn renders a plain-text list of routes without a picker call
- **THEN** the turn remains without a valid selector and MUST still emit the native-picker selector

### Requirement: Language gate and fast-track never exempt selector
The item-8 crystallization language gate SHALL NOT exempt the selector, fast-track SHALL NOT exempt the selector, and fast-track SHALL NOT auto-select any route.

#### Scenario: Fast-track still asks selector
- **WHEN** fast-track is active at a crystallization close
- **THEN** the selector is still asked with no auto-selection

### Requirement: Missing-selector re-emission uses current chat set only
A selector re-emission after a missing-selector report SHALL use only the current chat `last_crystallization_set`, SHALL NOT re-emit the recommendation, and SHALL NOT dispatch a stale change.

#### Scenario: Re-emission reuses current set without recommendation
- **WHEN** a missing-selector report requests the selector again
- **THEN** the selector is re-emitted from the current chat set without re-emitting the recommendation and without dispatching a stale change

