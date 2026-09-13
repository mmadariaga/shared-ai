# crystallization-close Specification

## Purpose
TBD - created by archiving change fix-crystallization-close-selector. Update Purpose after archive.
## Requirements
### Requirement: Crystallization-close emission guarantee on every crystallization path
The crystallization-close SHALL emit exactly one native-picker selector directly after the `Ready to Propose` block(s) ending at `---` on every single-change and sliced-feature crystallization turn, carrying exactly `Plan - Unattended`, `Direct Build - Unattended`, `Manual`, with no path-specific handoff and no keep-window-open recommendation before selection, and SHALL never end the turn after the block without that picker call. The inline-refusal path SHALL stay outside the shared close and SHALL emit its immediate handoff with no selector.

#### Scenario: Single crystallization emits selector after recommendation
- **WHEN** a single-change crystallization turn emits its block
- **THEN** it emits one native-picker selector with the three exact titles as the final emission with no prior handoff and no prior recommendation

### Requirement: Only native-picker selector counts with fixed English titles
The selector SHALL count only as a harness-native picker call per remember.md, a plain-text list SHALL NOT count as the selector, and the three titles `Plan - Unattended`, `Direct Build - Unattended`, `Manual` SHALL remain fixed English in fixed order.

#### Scenario: Plain-text list does not satisfy selector
- **WHEN** a crystallization turn renders a plain-text list of routes without a picker call
- **THEN** the turn remains without a valid selector and MUST still emit the native-picker selector

### Requirement: Language gate and fast-track never exempt selector
The item-8 crystallization language gate SHALL NOT exempt the selector, fast-track SHALL NOT exempt the selector, and fast-track SHALL NOT auto-select any route. The selector SHALL always be asked with no auto-selection.

#### Scenario: Fast-track still asks selector
- **WHEN** fast-track is active at a crystallization close
- **THEN** the selector is still asked with no auto-selection and no prior handoff

### Requirement: Missing-selector re-emission uses current chat set only
A selector re-emission after a missing-selector report SHALL use only the current chat `last_crystallization_set`, SHALL NOT re-emit the recommendation, SHALL carry no prior handoff, and SHALL NOT dispatch a stale change.

#### Scenario: Re-emission reuses current set without recommendation
- **WHEN** a missing-selector report requests the selector again
- **THEN** the selector is re-emitted from the current chat set without re-emitting the recommendation and without dispatching a stale change

### Requirement: Same-turn block guard blocks premature selector
The crystallization close SHALL invoke the native-picker selector only when one or more blocks ending at `---` were emitted in the same turn for items 5 and 6. Item 7 stays outside the shared close and emits no selector. When no block with `---` was emitted in the turn, it SHALL emit no selector.

#### Scenario: Close without same-turn block emits no selector
- **WHEN** a crystallization turn reaches its close without a same-turn block ending at `---`
- **THEN** no native-picker selector is emitted in that turn

### Requirement: Language-gate continuation resumes at block emission
The crystallization close SHALL resume at Ready to Propose block emission after a language-gate answer and SHALL never jump directly to the selector. It SHALL ask no overview-language question at emission, reserving the overview-language decision for supervised Plan - Unattended activation, and fast-track SHALL skip only the language question without skipping or auto-selecting the selector.

#### Scenario: Gate answer leads to block emission
- **WHEN** the user answers the crystallization language gate
- **THEN** the flow emits the Ready to Propose block next and does not emit the selector first

### Requirement: Premature selector discard with single-selector correction
The crystallization close SHALL discard a premature selector from a prior turn that carried no block and SHALL carry no selection from it. The correction turn SHALL emit the block plus the shared close plus a single selector in block-then-selector order with no handoff and no recommendation before selection, and the user SHALL re-select from `last_crystallization_set`.

#### Scenario: Correction after premature selector
- **WHEN** a prior turn emitted a selector without a block
- **THEN** the correction turn discards that selection and emits one block plus close plus single selector for re-selection in block-then-selector order

