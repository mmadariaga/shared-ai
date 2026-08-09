# shared-readline-navigator Specification

## Purpose
TBD — shared raw-readline navigator engine backing the interactive tool-selection checklist and single-select prompts in `bin/install-flow.js`.

## Requirements

### Requirement: Shared raw-readline navigator engine

`bin/install-flow.js` SHALL back the interactive tool-selection checklist (`promptChecklist`) and a new navigable single-select `promptSelect` with ONE shared raw-readline keypress engine. The engine SHALL use only Node.js built-in modules (`readline`, `process.stdin` raw mode, keypress events) per ADR 0010, and SHALL NOT introduce a runtime npm dependency. `promptChecklist`'s externally observable interaction — arrow-key navigation, space toggling, Enter confirmation, the `>` cursor, and `[x]` selection markers — SHALL remain unchanged when moved onto the shared engine. The engine SHALL separate list selection from process-exit policy: non-interactive-stdin and cancellation outcomes SHALL be surfaced to the caller (e.g. a sentinel result) rather than embedded as `process.exit` calls, so the installer's hard-exit behavior stays caller-owned and no caller — in particular the configurator, whose TTY-only contract MUST NOT hard-exit — is forced to terminate the process through the shared functions.

#### Scenario: Checklist behavior is preserved on the shared engine

- **WHEN** the shared engine backs the tool-selection checklist
- **THEN** the checklist SHALL keep arrow-key navigation, space toggling, Enter confirmation, the `>` cursor, and `[x]` markers, with no new runtime dependency

#### Scenario: Both navigators run on built-in modules only

- **WHEN** `promptChecklist` or `promptSelect` handles keypresses
- **THEN** only Node.js built-in modules SHALL be used

#### Scenario: Engine reports cancellation without terminating the process

- **WHEN** a shared-engine navigator detects a non-interactive stdin or receives a cancellation key (`q` or Ctrl-C)
- **THEN** the engine SHALL surface the outcome to the caller without calling `process.exit`, leaving termination policy with the caller

### Requirement: promptSelect navigable single-select contract

`bin/install-flow.js` SHALL export `promptSelect(question, options)`, a navigable single-select menu resolving to the selected option string. Up/down arrows SHALL move the `>` cursor within the option range, and Enter (or space) SHALL confirm the highlighted option and resolve with that option's value. The signature SHALL be `(question, options) -> option`, so any injected selection function with that contract remains a drop-in replacement. Callers SHALL gate navigation on an interactive-stdin check before invoking `promptSelect`, because raw-mode input requires a TTY.

#### Scenario: Arrow keys move the cursor and Enter confirms

- **WHEN** the user presses the down arrow and then Enter
- **THEN** `promptSelect` SHALL resolve with the option highlighted at confirmation time

#### Scenario: promptSelect resolves a selected option string

- **WHEN** the user confirms a highlighted option
- **THEN** `promptSelect` SHALL resolve with that option's string value, not an index

#### Scenario: Space confirms the highlighted option

- **WHEN** the user presses space while a single option is highlighted
- **THEN** `promptSelect` SHALL confirm that option and resolve with its value

### Requirement: Machine-testable input seam

The shared engine SHALL accept an injectable input source (a DI'd stdin/keypress stream or an injected keypress emitter) so that navigation, confirmation, and cancellation scenarios are machine-testable without a TTY, mirroring the configurator's injectable `promptChoice` seam. The engine SHALL NOT require a real interactive terminal to be exercised in tests.

#### Scenario: Interaction scenarios run against an injected input source

- **WHEN** a test injects a keypress sequence through the engine's input seam
- **THEN** the engine SHALL process the injected keys exactly as it would process real raw-mode keypresses, without a TTY or user input
