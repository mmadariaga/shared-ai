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

The shared navigator engine SHALL accept an optional header supplied as a string or an array of strings and render its visible lines inside the frame between the question and the option rows. When the complete frame fits the available height budget, all supplied header lines SHALL be rendered. In an oversized frame, header visibility SHALL follow the selected-option priority rule, allowing trailing header lines to be omitted and later restored as space changes.

Header lines SHALL be pure decoration: the cursor and selection index SHALL continue to address only options, so header lines MUST NOT consume arrow-key movement, space toggles, or Enter confirmation. Rendered header lines SHALL be included in physical-row accounting for height budgeting and redraw. promptChecklist SHALL forward a header supplied through its navigator options into the shared frame. When the input source is not interactive, the engine SHALL resolve non-interactive before painting anything, including the header.

#### Scenario: Header renders above the options without affecting selection

- **WHEN** a multi-select navigator has enough height for a two-line header and processes a down-arrow press followed by Enter
- **THEN** it SHALL render both header lines between the question and options, preserve the same selection outcome as without the header, and include rendered header rows in physical-row redraw accounting

#### Scenario: Checklist forwards the caller-supplied header

- **WHEN** promptChecklist is invoked with a header in its navigator options and the complete frame fits
- **THEN** the rendered frame SHALL contain those header lines between the question and option rows

#### Scenario: Short window temporarily omits header decoration

- **WHEN** supplied header lines prevent the highlighted option from fitting within the terminal-height budget
- **THEN** the navigator SHALL omit trailing header lines as needed without changing cursor movement, toggles, or confirmation values

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

### Requirement: Height-bounded scrolling navigator frames

The shared raw-readline navigator SHALL use a finite positive terminal height to limit the rendered frame to at most the terminal height minus one physical row, with a minimum frame budget of one row. When terminal height is unavailable or invalid, the navigator SHALL retain unbounded frame construction. It SHALL count wrapped lines and embedded newlines, excluding ANSI sequences from text-length accounting, when calculating the frame's physical rows.

When the complete frame fits the budget, the navigator SHALL render the question, supplied headers, all option rows, and supplied instructions in their existing order. Otherwise, it SHALL render a contiguous visible portion of the option list and adjust that portion as the highlighted option moves so the highlighted option remains visible.

Visible-area changes SHALL remain independent of the highlighted option and checkbox state. Separators SHALL remain non-selectable, offscreen checked options SHALL remain selected, and existing confirmation, cancellation, and bulk-toggle behavior SHALL remain unchanged.

#### Scenario: Complete menu fits

- **WHEN** the question, headers, options, and instructions fit within the physical-row budget
- **THEN** the navigator SHALL render the complete existing frame and use its physical row count for subsequent redraws

#### Scenario: Oversized menu scrolls with navigation

- **WHEN** arrow-key movement highlights an option beyond the current visible portion of an oversized menu
- **THEN** the navigator SHALL adjust the visible portion to include that option without changing checked options or making separators selectable

#### Scenario: Wrapping and embedded newlines consume physical rows

- **WHEN** frame content wraps at the terminal width or contains embedded newlines
- **THEN** the navigator SHALL include those physical rows in the height budget rather than treating every logical string as one row

#### Scenario: Redraw does not accumulate menu copies

- **WHEN** an oversized menu is repeatedly navigated without resizing
- **THEN** subsequent bounded redraws SHALL overwrite the previous visible frame without adding repeated menu copies to scrollback

#### Scenario: Offscreen selection remains part of confirmation

- **WHEN** a multi-select navigator scrolls away from a checked option and later confirms its selection
- **THEN** the confirmed items SHALL include that offscreen checked option unless a selection operation changed its state

#### Scenario: Bulk toggle includes offscreen options

- **WHEN** an oversized multi-select navigator with toggleAll enabled receives Ctrl+A
- **THEN** the existing bulk-toggle operation SHALL apply to all selectable options, including offscreen options, without confirming the menu

### Requirement: Selected-option priority in short terminal windows

When auxiliary content and the highlighted option cannot fit together, the shared navigator SHALL remove header lines from the end first, then remove instructions, and finally remove the question until the highlighted option can occupy the available budget. It SHALL restore omitted auxiliary content when a later render has sufficient space.

When the highlighted option itself exceeds the remaining budget, the navigator SHALL clip its trailing content to that budget while retaining its leading cursor and text. Clipping SHALL account for wrapped rows, embedded newlines, and ANSI sequences, and SHALL reset ANSI styling afterward.

In a one-row terminal, the navigator SHALL render at most one physical row and use carriage-return positioning without appending a newline.

#### Scenario: Auxiliary content is reduced in priority order

- **WHEN** a terminal is too short to display the auxiliary content and highlighted option together
- **THEN** the navigator SHALL reduce headers first, instructions second, and the question last while keeping the highlighted option visible

#### Scenario: Oversized highlighted option is clipped

- **WHEN** the highlighted option exceeds the available physical-row budget
- **THEN** the navigator SHALL display its leading cursor and text within that budget without rendering trailing content outside the visible frame

#### Scenario: Auxiliary content returns after enlargement

- **WHEN** a terminal becomes large enough to display previously omitted auxiliary content
- **THEN** the navigator SHALL restore that content without changing the highlighted option or checked items

#### Scenario: One-row terminal avoids newline scrolling

- **WHEN** the navigator renders in a terminal whose height is one row
- **THEN** it SHALL paint at most one physical row and SHALL use carriage returns rather than a trailing newline

### Requirement: Resize-aware navigator redraw and cleanup

When the output exposes event-listener registration, the shared navigator SHALL listen for resize events while the menu is pending. On resize, it SHALL recalculate terminal dimensions and the visible frame while preserving the highlighted option and checked items. It SHALL clear the visible screen and establish a new drawing origin rather than moving upward by the old frame's row count.

When the navigator confirms, cancels, returns back, or settles because terminal input ends, closes, or errors, it SHALL remove its resize listener when listener removal is available. A resize event after settlement SHALL NOT repaint the menu.

#### Scenario: Resize establishes a fresh drawing origin

- **WHEN** terminal dimensions change and the pending navigator receives a resize event
- **THEN** it SHALL clear the visible screen, establish a fresh origin, and render a recalculated bounded frame without seeking the previous frame's old rows

#### Scenario: Resize preserves logical selection

- **WHEN** a multi-select navigator is resized while an option is highlighted and multiple items are checked
- **THEN** the highlighted option and checked items SHALL remain unchanged while the visible frame adjusts

#### Scenario: Settlement removes resize handling

- **WHEN** the navigator confirms, cancels, returns back, or receives terminal input end, close, or error
- **THEN** its resize listener SHALL be removed and a subsequent resize SHALL not repaint the settled menu

### Requirement: Non-selectable group header rows

The shared raw-readline navigator SHALL accept an optional `groupHeaders` list of options that render as group header rows. A group header row SHALL show its visible text, SHALL be skipped by the cursor on start and on up/down movement like a separator, SHALL be ignored by space and Enter, and SHALL never join a selection or a bulk toggle. `promptSelect` SHALL accept an optional trailing `navigatorOptions` argument whose `groupHeaders` and `displayOptions` it forwards to the engine, where `displayOptions` gives each option's visible text, index-aligned with the options, and the resolved value stays the option string. Without `groupHeaders`, the navigator and `promptSelect` SHALL behave as before.

#### Scenario: Group headers are shown and skipped
- **WHEN** `promptSelect` runs with options whose first entry is listed in `groupHeaders` and the user presses Enter at start
- **THEN** the header text is rendered, the cursor starts on the first selectable option, and that option's value is resolved

#### Scenario: Headers never confirm
- **WHEN** the user moves up and down across a group header and confirms
- **THEN** the cursor never rests on the header and the header is never resolved

#### Scenario: Without group headers nothing changes
- **WHEN** `promptSelect` runs without `navigatorOptions`
- **THEN** it renders and resolves exactly as before
