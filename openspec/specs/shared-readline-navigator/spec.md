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

`bin/install-flow.js` SHALL export `promptSelect(question, options)`, a navigable single-select menu resolving to the selected option string. Up/down arrows SHALL move the `>` cursor within the option range, and Enter (or space) SHALL confirm the highlighted option and resolve with that option's value. The signature SHALL remain callable as `(question, options) -> option`, so any injected selection function with that contract remains a drop-in replacement; an optional trailing `distinguishClosedInput` flag defaulting to false SHALL select closed-input behavior without changing the default call shape. When the flag is true and the engine reports `input-closed`, `promptSelect` SHALL resolve with the `INPUT_CLOSED` sentinel; when the flag is false it SHALL resolve with null. Callers SHALL gate navigation on an interactive-stdin check before invoking `promptSelect`, because raw-mode input requires a TTY.

#### Scenario: Arrow keys move the cursor and Enter confirms

- **WHEN** the user presses the down arrow and then Enter
- **THEN** `promptSelect` SHALL resolve with the option highlighted at confirmation time

#### Scenario: promptSelect resolves a selected option string

- **WHEN** the user confirms a highlighted option
- **THEN** `promptSelect` SHALL resolve with that option's string value, not an index

#### Scenario: Space confirms the highlighted option

- **WHEN** the user presses space while a single option is highlighted
- **THEN** `promptSelect` SHALL confirm that option and resolve with its value

#### Scenario: Optional closed-input distinction preserves the default contract

- **WHEN** `promptSelect` is called without the trailing distinction flag and terminal input closes
- **THEN** it SHALL resolve with null exactly as before, and only a call with the flag enabled SHALL resolve with the `INPUT_CLOSED` sentinel

### Requirement: Machine-testable input seam

The shared engine SHALL accept an injectable input source (a DI'd stdin/keypress stream or an injected keypress emitter) so that navigation, confirmation, and cancellation scenarios are machine-testable without a TTY, mirroring the configurator's injectable `promptChoice` seam. The engine SHALL NOT require a real interactive terminal to be exercised in tests.

#### Scenario: Interaction scenarios run against an injected input source

- **WHEN** a test injects a keypress sequence through the engine's input seam
- **THEN** the engine SHALL process the injected keys exactly as it would process real raw-mode keypresses, without a TTY or user input

### Requirement: Optional non-selectable frame header
The shared navigator engine SHALL accept an optional header supplied as a string or an array of strings and render its lines inside the frame between the question and the option rows. Header lines SHALL be pure decoration: the cursor and selection index SHALL continue to address only `options`, so header lines MUST NOT consume arrow-key movement, space toggles, or Enter confirmation. Header lines SHALL be included in the redraw cursor-up accounting so multi-line repaint stays correct. `promptChecklist` SHALL forward a header supplied through its navigator options into the shared frame. When the input source is not interactive, the engine SHALL resolve non-interactive before painting anything, including the header.

#### Scenario: Header renders above the options without affecting selection
- **WHEN** a multi-select navigator runs with a two-line header, a default-selected item, a down-arrow press, and Enter confirmation
- **THEN** the outcome SHALL match the same interaction without a header, the cursor arrow SHALL land on the second option skipping the non-selectable header rows, and the redraw SHALL move up by the full physical row count including the header lines

#### Scenario: Checklist forwards the caller-supplied header
- **WHEN** `promptChecklist` is invoked with a header in its navigator options
- **THEN** the rendered frame SHALL contain those header lines between the question and the option rows

#### Scenario: Non-TTY input paints nothing
- **WHEN** the input source is not a TTY and a header is supplied
- **THEN** the navigator SHALL resolve non-interactive with no frame content painted, header included

### Requirement: Closed terminal input settles the navigator

The shared navigator engine SHALL settle a pending menu when terminal input ends, closes, or errors. On `end`, `close`, or `error` it SHALL resolve with status `input-closed`, SHALL remove every `keypress`, `end`, `close`, and `error` listener, SHALL settle at most once through a settled guard so a later terminal event cannot change the result, and SHALL NOT let a closed output writer throw out of cleanup.

#### Scenario: Terminal input closure settles and detaches

- **WHEN** terminal input emits `end`, `close`, or `error` while a navigator is pending
- **THEN** the navigator SHALL resolve with status `input-closed` and zero listeners SHALL remain on the input source

### Requirement: Closed-input sentinel export

`bin/install-flow.js` SHALL export an `INPUT_CLOSED` sentinel distinct from every selectable option string, from null cancellation, and from `BACK`. The sentinel SHALL be returned only for closed terminal input when the caller opts into closed-input distinction and SHALL never be produced for `q`, Ctrl-C, back navigation, or normal confirmation.

#### Scenario: Sentinel is reserved for distinguished closed input

- **WHEN** a caller enables closed-input distinction and terminal input closes while a single-select menu is pending
- **THEN** the menu SHALL resolve with the `INPUT_CLOSED` sentinel and SHALL NOT resolve with an option string, null cancellation, or `BACK`

### Requirement: Opt-in bulk toggle for the multi-select navigator
The shared raw-readline navigator SHALL accept an opt-in `toggleAll` setting for multi-select checklists. When enabled, `Ctrl+A` SHALL use the first non-separator option's checkbox state as the reference, set every non-separator checkbox to the opposite state, leave separators unchanged, preserve the cursor, redraw the frame, and return without confirming. `promptChecklist` SHALL forward this option, while navigators without the option and single-select menus SHALL retain their existing behavior.

#### Scenario: Enabled bulk toggle uses the first non-separator option
- **WHEN** a multi-select checklist with separators receives `Ctrl+A` while `toggleAll` is enabled
- **THEN** all selectable rows SHALL receive the state opposite the first selectable row, separators SHALL remain untouched, and the cursor SHALL remain in place

#### Scenario: Bulk toggle does not confirm the checklist
- **WHEN** `Ctrl+A` changes a checklist selection
- **THEN** the navigator SHALL redraw the checklist and SHALL wait for a later confirmation key

#### Scenario: Disabled and single-select navigators ignore bulk toggle
- **WHEN** a checklist without `toggleAll` or a single-select menu receives `Ctrl+A`
- **THEN** the navigator SHALL not apply toggle-all behavior or alter the selected result
