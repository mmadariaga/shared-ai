## Purpose
TTY-only post-setup customization menu and isolated harness adapters that apply a selected model and optional effort or variant to project-local worker and command overrides for both supported harnesses, with an explicit scope screen and per-family checklist labeling.

## Requirements

### Requirement: Post-setup customization menu
The setup flow MUST present a post-setup menu only after all existing setup operations have completed. The menu MUST provide exactly two actions: `Customize models` and `Exit`. The menu MUST be presented as a navigable single-select list: up/down arrows move the `>` cursor and Enter (or space) confirms the highlighted action.

#### Scenario: User exits from the post-setup menu
- **WHEN** setup completes its existing work and the user selects `Exit`
- **THEN** the setup flow MUST finish without selecting a harness, scope, or any target

#### Scenario: User enters model customization
- **WHEN** setup completes its existing work and the user selects `Customize models`
- **THEN** the flow MUST continue to exclusive harness selection

#### Scenario: User navigates the post-setup menu with arrow keys
- **WHEN** the user moves the `>` cursor with the arrow keys and confirms with Enter
- **THEN** the flow MUST act on exactly the highlighted action

### Requirement: TTY-only interaction
The setup flow MUST determine whether interaction is available through its injectable TTY check before presenting the post-setup menu, the navigable harness picker, the customization scope screen, the target-selection checklist, the Claude Code combined model/effort frame, or any OpenCode provider, model, or variant screen. When no TTY is available, it MUST skip the menu and all customization adapters without adding menu-specific prompts, checklist renders, or output, and `runPostSetupMenu` MUST return 'skipped' so `setup.js` completes normally — the configurator MUST NOT hard-exit like the installer.

#### Scenario: Setup runs without a TTY
- **WHEN** the injectable TTY check reports that standard input is not interactive
- **THEN** setup MUST preserve its existing operations, complete without presenting the post-setup menu or any navigable surface, and MUST NOT hard-exit

#### Scenario: Setup runs with a TTY
- **WHEN** the injectable TTY check reports that standard input is interactive
- **THEN** setup MUST present the post-setup menu after the existing operations complete

### Requirement: Exclusive harness selection
After `Customize models` is selected, the flow MUST offer OpenCode and Claude Code as mutually exclusive harness choices in a navigable single-select list. It MUST dispatch customization to exactly one selected harness adapter and MUST NOT process both harnesses in a single selection.

#### Scenario: User selects OpenCode
- **WHEN** the user chooses OpenCode
- **THEN** the flow MUST dispatch only to the OpenCode adapter

#### Scenario: User selects Claude Code
- **WHEN** the user chooses Claude Code
- **THEN** the flow MUST dispatch only to the Claude Code adapter

### Requirement: Customization scope selection
After harness selection and before any target checklist, the flow MUST present a navigable single-select scope screen offering exactly `Workers`, `Agents`, `Commands`, `Utilities`, and `All`. Selecting a named family MUST confine the target checklist to that family; selecting `All` MUST present every family in the order Workers, Agents, Commands, Utilities. Stepping back from the scope screen MUST re-open the harness selector, and stepping back from the target checklist MUST re-open the scope screen.

#### Scenario: User chooses a single family
- **WHEN** the user selects one of `Workers`, `Agents`, `Commands`, or `Utilities` at the scope screen
- **THEN** the flow MUST present a target checklist of exactly that family's targets with stable family-prefixed identities

#### Scenario: User chooses All
- **WHEN** the user selects `All` at the scope screen
- **THEN** the flow MUST present the combined checklist with stable `worker:`, `agent:`, `command:`, and `utility:` identities

#### Scenario: Back from the scope screen reopens the harness selector
- **WHEN** the user presses the back key at the scope screen
- **THEN** the flow MUST re-present the harness selector and SHALL NOT persist any selection

#### Scenario: Back from the target checklist reopens the scope screen
- **WHEN** the user presses the back key at the target-selection checklist
- **THEN** the flow MUST re-present the customization scope screen and SHALL NOT persist any selection

### Requirement: Isolated harness adapter boundaries
OpenCode and Claude Code MUST be represented by independent adapters. Each adapter MUST expose separate operations for worker enumeration, command enumeration, settings selection, and local override creation, without requiring a shared normalized target-file format.

#### Scenario: OpenCode adapter is selected
- **WHEN** the OpenCode harness is selected
- **THEN** the flow MUST call the OpenCode adapter's operations and MUST NOT call Claude Code adapter operations

#### Scenario: Claude Code adapter is selected
- **WHEN** the Claude Code harness is selected
- **THEN** the flow MUST call the Claude Code adapter's operations and MUST NOT call OpenCode adapter operations

### Requirement: Complete OpenCode traversal
The OpenCode adapter MUST derive routed workers from Worker Matrix agent projections, generic delegation agents from non-matrix agent projections, and commands from the canonical commands-class projections in `sai/install-manifest.json`. The generic agents MUST be `budget`, `executor`, and `explore`; they MUST NOT be classified as workers. The utility commands MUST be `sai-commit`, `sai-pr`, `sai-status`, and `sai-worktree`; all remaining commands belong to Commands. Command enumeration MUST read the package sources declared by the manifest's commands-class projections rather than the installed global command directory. It MUST invoke the dependent OpenCode settings selection and local override creation as specified by the Shared settings selection requirement. For the current repository state, that derived set contains exactly 9 routed workers, 3 generic agents, 13 commands, and 4 utilities; these counts are fixture assertions of the current repository state, not hardcoded enumerations.

#### Scenario: OpenCode customization traverses the selected registry subset
- **WHEN** OpenCode customization is selected and the checklist is confirmed
- **THEN** the adapter MUST process exactly the selected stable identities from the manifest-derived families, with no early stop or representative-target shortcut

### Requirement: Complete Claude Code traversal
The Claude Code adapter MUST derive routed workers from Worker Matrix agent projections, generic delegation agents from non-matrix agent projections, and commands from the canonical commands-class projections in `sai/install-manifest.json`. The generic agents MUST be `budget-explorer`, `budget-executor`, and `budget-subagent`; they MUST NOT be classified as workers. The utility commands MUST be `sai-commit`, `sai-pr`, `sai-status`, and `sai-worktree`; all remaining commands belong to Commands. Command enumeration MUST read the package sources declared by the manifest's commands-class projections rather than the installed global command directory. It MUST invoke Claude Code settings selection and local override creation as specified by the Shared settings selection requirement. For the current repository state, that derived set contains exactly 9 routed workers, 3 generic agents, 13 commands, and 4 utilities; these counts are fixture assertions of the current repository state, not hardcoded enumerations.

#### Scenario: Claude Code customization traverses the selected registry subset
- **WHEN** Claude Code customization is selected and the checklist is confirmed
- **THEN** the adapter MUST process exactly the selected stable identities from the 9 routed workers, 3 generic agents, 13 commands, and 4 utilities derived from the canonical manifest projections, with no early stop or representative-target shortcut

### Requirement: Shared settings selection
After the target-selection checklist confirms a non-empty subset and before any local override is created, the flow SHALL invoke the selected harness's settings selector exactly once for the whole confirmed subset in that customization pass. The collected settings choices — a model and an optional effort choice for Claude Code, and a discovered model with an optional variant for OpenCode — SHALL be passed to the per-target local-override operation once for every selected target. A per-target skipped result means the operation was attempted but its source was unavailable; it SHALL not be treated as a settings-selector failure or prevent later targets from being attempted. In `All` scope, the selector SHALL run once and the same settings SHALL be passed to every marked target across all selected families, with no per-family differentiation within a pass. Because the model-customization checklist rejects empty confirmation, the settings selector SHALL never be invoked for an empty selection.

#### Scenario: Settings selector runs exactly once per customization pass
- **WHEN** the target-selection checklist confirms a non-empty subset
- **THEN** the flow SHALL invoke the settings selector exactly once for that customization pass

#### Scenario: Local overrides run exactly once per selected target
- **WHEN** the settings selector has returned the shared settings choices for the confirmed subset
- **THEN** the local-override operation SHALL be attempted exactly once per selected target, including targets that ultimately report a non-fatal skip

#### Scenario: Same settings applied to every selected target
- **WHEN** the settings selector returns its settings choices for a confirmed subset of two or more targets
- **THEN** every selected target's local override SHALL carry those identical settings choices, including the absence of `effort` when the chosen Claude model has no effort selector

#### Scenario: All scope applies one settings pass across all families
- **WHEN** the confirmed subset in `All` scope contains targets from multiple families and the settings selector returns its choices
- **THEN** every marked target SHALL receive those identical settings choices in the single pass, with no per-family differentiation

#### Scenario: Empty confirmation never reaches settings
- **WHEN** the user attempts to confirm an empty model-customization checklist
- **THEN** the checklist SHALL remain open and the settings selector SHALL NOT be invoked

### Requirement: Stable target identities and effective model annotations
The target checklist SHALL keep stable family-prefixed selection values separate from display labels. Each display label SHALL retain its `worker:`, `agent:`, `command:`, or `utility:` family identity and SHALL append the target's effective setting in subdued styling. The setting SHALL use `provider/model (effort)` formatting, with Claude Code's `effort` and OpenCode's `variant` occupying the tuning position. Project-local overrides SHALL take precedence over installed or global sources; malformed or missing frontmatter SHALL produce a safe unavailable annotation without breaking selection.

#### Scenario: Checklist displays stable identities and current settings
- **WHEN** a target checklist is rendered for either supported harness
- **THEN** each row SHALL display its family-prefixed identity and effective model annotation while the confirmed selection value remains the stable identity without the annotation

#### Scenario: Local settings override installed settings
- **WHEN** a project-local target override exists with valid tunable frontmatter
- **THEN** the checklist SHALL annotate that local model and tuning value instead of the installed or global source

#### Scenario: Invalid settings do not break selection
- **WHEN** a target source is missing or its frontmatter is malformed
- **THEN** the checklist SHALL show an unavailable annotation and SHALL remain selectable

### Requirement: Claude settings selection
For every Claude Code customization run with a non-empty confirmed subset, the Claude Code adapter MUST invoke exactly one navigable single-select frame whose options are derived from the adapter-owned static Claude settings catalog. An entry with an `efforts` array MUST be displayed as a concrete model and effort choice together, using the `<model> | <effort>` form; an entry without an `efforts` array MUST be displayed as the model alone. The catalog MUST be the authoritative source for the available model identifiers and each model's effort values, MUST contain at least one valid model entry, and MUST contain no placeholder values such as `<model>` or `<effort>`. The selected result MUST contain only catalog members: `{ model, effort }` for an effort-bearing entry or `{ model }` with no `effort` property for a model-only entry. If the catalog is unavailable or contains no valid model entries, the selector MUST return no settings and MUST allow customization to complete without writing a target. The selector MUST NOT perform Claude live model discovery, claim that end-to-end customization is fake, or perform OpenCode provider, model, or variant discovery. The collected values MUST be forwarded to the persistent local-override operation. The OpenCode adapter MUST continue to use its dependent provider-to-model-to-variant selection instead of this combined frame.

#### Scenario: Static Claude catalog contains the current model and effort set
- **WHEN** the Claude adapter loads its built-in settings catalog
- **THEN** the catalog SHALL contain `opus` with efforts `low`, `medium`, `high`, `xhigh`, and `max`; `sonnet` with the same five efforts; `fable` with the same five efforts; and `haiku` with no `efforts` array

#### Scenario: Claude selection returns concrete model and effort
- **WHEN** a non-empty Claude Code subset reaches settings selection and the user confirms an effort-bearing catalog option such as `sonnet | medium`
- **THEN** the selector SHALL return exactly the concrete catalog values `{ model: 'sonnet', effort: 'medium' }`

#### Scenario: Claude selection returns a model without effort
- **WHEN** a non-empty Claude Code subset reaches settings selection and the user confirms the `haiku` catalog entry, whose entry has no `efforts` array
- **THEN** the frame SHALL display `haiku` alone, and the selector SHALL return exactly `{ model: 'haiku' }` without a top-level `effort` property

#### Scenario: Claude selection does not use placeholders
- **WHEN** the Claude Code settings frame is rendered
- **THEN** no selectable option SHALL use `<model>` or `<effort>` placeholder values, and a model-only option SHALL NOT fabricate an effort label

#### Scenario: Claude selection is bounded by per-model catalog entries
- **WHEN** the Claude adapter-owned catalog contains model entries with model-specific effort arrays or no effort array
- **THEN** every displayed and returned Claude setting SHALL be derived from one catalog entry, with no effort accepted for a model-only entry and no effort borrowed from another model

#### Scenario: Missing Claude settings catalog produces no settings
- **WHEN** the Claude settings catalog is unavailable or contains no valid model entries
- **THEN** the selector SHALL return no settings and customization SHALL perform no target write

#### Scenario: OpenCode does not use the Claude frame
- **WHEN** OpenCode customization reaches settings selection
- **THEN** the flow SHALL use the dependent provider, model, and optional variant screens and SHALL not present the Claude combined frame or use the Claude static catalog

### Requirement: Cyclic post-setup customization passes
After a customization pass has selected settings and invoked the local-override operation once for every selected target, without any operation reporting a persistence failure, the post-setup flow SHALL return to the `Post-setup customization:` menu instead of terminating. A customization pass is the completed path from choosing `Customize models` through a confirmed target set, one settings-selection result, and one operation attempt for every selected target; navigating back before those operations does not complete a pass. `completed` is the per-pass outcome used for this successful re-entry transition, not the final `runPostSetupMenu` result after the user later selects `Exit`. A per-target skipped result is non-fatal: it means that target was attempted but no override was written, and the pass may still re-enter the menu. Before re-entering that menu, the flow SHALL reset the adapter, harness, scope, selected targets, settings, pass outcome, and pass diagnostics to their initial empty state; each newly rendered single-select navigator SHALL start with cursor index 0 and no selected items, and the target checklist SHALL start with cursor index 0 and all enumerated targets selected, so the next pass re-creates all pass-specific choices. Only a pass with no persistence failure SHALL create this re-entry transition; cancellation, settings unavailability, and persistence failure SHALL terminate the loop. Selecting `Exit` at the menu SHALL return the final normal cancelled outcome after zero or more successful passes; prior pass outcomes SHALL not be aggregated into a failure.

#### Scenario: Successful customization returns to the menu
- **WHEN** the local-override operation has been attempted once for every selected target and any non-fatal per-target skips are the only non-persisted results
- **THEN** the flow SHALL finish that pass and present the `Post-setup customization:` menu again

#### Scenario: A later pass starts with no selections from the prior pass
- **WHEN** the flow re-enters the post-setup menu after a successful pass
- **THEN** the adapter, harness, scope, selected-target, settings, outcome, and diagnostics state SHALL have been reset before the menu is shown, each single-select screen SHALL start at its first row, and the target checklist SHALL start at its first row with every enumerated target selected rather than carrying any prior choice forward

#### Scenario: Non-interactive setup does not enter the cycle
- **WHEN** the injectable TTY check reports that standard input is not interactive
- **THEN** `runPostSetupMenu` SHALL return its existing non-TTY skipped outcome without presenting the menu or entering any pass

#### Scenario: Cancellation terminates the current cycle without rollback
- **WHEN** the user presses `q` or Ctrl-C at the post-setup menu, harness selector, scope screen, target checklist, or settings screen during the first or a later pass
- **THEN** the customization loop SHALL stop without presenting another screen, return its normal cancelled outcome, and preserve overrides written by any earlier successful pass without rollback

#### Scenario: Back navigation abandons only the current unmaterialized path
- **WHEN** the user presses left-arrow, Backspace, or Esc on a harness, scope, target, or settings screen before the selected-target operations run
- **THEN** the flow SHALL reopen that screen's predecessor without creating an override or completing a pass, and later choices on the revisited path SHALL determine the eventual pass

### Requirement: Post-setup pass diagnostics and exit status
When a persistence-failed pass also contains skipped targets, their names SHALL intentionally remain omitted from the `persistence-failed` record because the ordered diagnostics already convey those skips; this preserves the existing outcome asymmetry. The customization flow SHALL retain these observable outcomes: `completed` for a pass whose selected-target operations have no persistence failure, including passes with skipped targets, with skipped-target names and diagnostics when applicable; `skipped` with reason `cancelled`, `settings-unavailable`, or `non-tty` for normal cancellation, unavailable settings, or no TTY; and `persistence-failed` with failure diagnostics when any selected-target operation fails to persist. A successful pass record SHALL contain `status: completed`, `skippedAgents: string[]`, and `diagnostics: string[]`; a persistence-failed pass record SHALL contain `status: persistence-failed`, `failedAgents: string[]`, and `diagnostics: string[]`; a terminal skipped result SHALL contain `status: skipped` and one of the stated reasons. The diagnostics array SHALL retain confirmed target operation order. Each selected target SHALL contribute at most one diagnostic string: persisted targets contribute none, skipped targets contribute `Skipped <name>: installed source is unavailable.`, and failed targets contribute the operation's returned diagnostic string. The local-override operation SHALL classify its result as `persisted`, `skipped`, or `persistence-failed` with a diagnostic string for the latter; an unexpected exception SHALL stop the current flow and propagate through the existing setup catch as `post-setup-failure`, with a non-zero process exit code and no requirement to attempt later targets or render a per-pass diagnostic list. When one selected-target operation reports a persistence failure, the remaining selected-target operations SHALL still be attempted once, after which the pass SHALL report `persistence-failed` and SHALL NOT re-enter the menu. `runPostSetupMenu` SHALL print each materialization pass's produced diagnostic string exactly once at the end of that pass, in selected-target operation order, using the existing `Post-setup customization: <diagnostic>` presentation; `bin/setup.js` SHALL not duplicate those diagnostics.

#### Scenario: Diagnostics are emitted once for a completed pass
- **WHEN** a pass completes with one or more per-target diagnostics
- **THEN** the flow SHALL print each diagnostic once, in selected-target operation order, before showing the next menu, and `bin/setup.js` SHALL not duplicate them

#### Scenario: Diagnostics remain separated across passes
- **WHEN** two successful passes each produce diagnostics
- **THEN** the flow SHALL print each pass's diagnostics once before that pass's next menu or termination transition, SHALL print no diagnostics for a pass with none, and SHALL not reprint an earlier pass's diagnostics

#### Scenario: Persistence-failure diagnostics are emitted before termination
- **WHEN** a selected-target operation reports a persistence failure with a diagnostic
- **THEN** the flow SHALL print that diagnostic once before returning the `persistence-failed` outcome, and setup SHALL not print it again

#### Scenario: Exit after successful passes is successful
- **WHEN** the user completes one or more successful passes and then selects `Exit`
- **THEN** the setup process SHALL terminate with exit code 0

#### Scenario: Exit before any pass is a normal cancellation
- **WHEN** the user selects `Exit` from the post-setup menu before completing a customization pass
- **THEN** `runPostSetupMenu` SHALL return `skipped` with reason `cancelled` and setup SHALL terminate with exit code 0

#### Scenario: Cancellation preserves earlier passes
- **WHEN** an earlier pass has persisted overrides and the user presses `q` or Ctrl-C on a later menu, selector, checklist, or settings screen
- **THEN** the flow SHALL terminate normally with exit code 0 and SHALL preserve the earlier persisted overrides without rollback

#### Scenario: Persistence failure is non-zero
- **WHEN** a materialization pass reports `persistence-failed`
- **THEN** the customization loop SHALL terminate after the selected-target attempts for that pass and setup SHALL terminate with a non-zero exit code, even if an earlier pass completed successfully

#### Scenario: Remaining targets are attempted after a persistence failure
- **WHEN** one selected target reports a persistence failure before the final selected target
- **THEN** every remaining selected target SHALL still be attempted once, the pass SHALL emit its collected diagnostics once, and the loop SHALL then terminate without opening another menu

#### Scenario: Mixed target outcomes keep diagnostic order and omission
- **WHEN** one pass contains a persisted target, a skipped target, and a failed target in that confirmed order
- **THEN** the persisted target SHALL contribute no diagnostic, the skipped and failed targets SHALL contribute their diagnostics in that order, each SHALL be rendered once before termination, and the pass SHALL return `persistence-failed`

#### Scenario: Settings unavailability is a normal exit
- **WHEN** a settings selector returns no usable settings because the catalog or dependent settings source is unavailable
- **THEN** the customization loop SHALL terminate with its existing settings-unavailable outcome and setup SHALL terminate with exit code 0

### Requirement: Opt-in empty-confirm protection
The navigator SHALL expose an opt-in guard for multi-select confirmation with no marked items, defaulting to disabled when the option is omitted. When enabled, Enter SHALL refuse confirmation and keep the checklist open; when disabled, the navigator SHALL preserve its existing empty-confirm behavior. The sole enabling call SHALL be the model-customization target checklist in `runPostSetupMenu`; the installer's first screen is inside `main()` in `bin/install-flow.js` at its `promptChecklist` call and SHALL omit the option, preserving its existing empty-confirm branch. Regression coverage SHALL statically assert these two production `promptChecklist` call sites and the enabled/omitted option at each call site.

#### Scenario: Model checklist refuses an empty confirmation
- **WHEN** targets are available, the user deselects every target, and presses Enter in the model-customization checklist
- **THEN** the checklist SHALL remain open without returning a confirmed empty selection

#### Scenario: Installer first screen keeps its empty-confirm exit
- **WHEN** the installer first screen has no selected item and the user presses Enter
- **THEN** the installer SHALL preserve its existing `Nothing selected. Exiting.` branch and exit behavior

### Requirement: Visible selection-screen back affordance
Every model-customization harness, scope, target, and settings selection screen SHALL render a key legend that announces left-arrow/Esc back navigation and q/Ctrl-C cancellation. Single-select screens SHALL use the default legend `Up/Down move · Space/Enter confirm · ←/Esc back · q/Ctrl-C cancel`; the multi-select target screen SHALL retain the existing `Up/Down move · Space toggle · Enter confirm · ←/Esc back · q/Ctrl-C cancel` legend. The post-setup menu SHALL call through the `promptSelect` path with an explicit no-footer override and SHALL not announce back navigation because back at that first screen only redraws the menu. `promptSelect` SHALL unconditionally forward the default single-select legend to `runNavigator` whenever no footer override is supplied. The seven production `promptChoice` invocations are the post-setup menu, harness selector, scope selector, Claude settings selector, and OpenCode provider, model, and variant selectors; `promptChoice` SHALL default to `promptSelect` at the Claude adapter, OpenCode adapter, and post-setup menu binding sites. The installer first screen uses `promptChecklist`, not `promptSelect`, and SHALL retain its existing footer behavior. Regression coverage SHALL statically assert the seven `promptChoice` invocations, the three `promptSelect` default bindings, and the explicit menu override.

#### Scenario: Single-select screens announce back
- **WHEN** the harness, scope, Claude settings, or any OpenCode provider, model, or variant screen is rendered
- **THEN** its footer SHALL announce left-arrow/Esc back, q/Ctrl-C cancellation, and Space confirmation

#### Scenario: The checklist announces back and toggle behavior
- **WHEN** the model-customization target checklist is rendered
- **THEN** its footer SHALL announce left-arrow/Esc back, q/Ctrl-C cancellation, and Space toggling without changing its existing multi-select legend semantics

#### Scenario: The first menu does not announce back
- **WHEN** the post-setup customization menu is rendered
- **THEN** its footer SHALL not claim that left-arrow/Esc leaves the menu

### Requirement: Persistent local override
For every traversed target, the selected harness adapter MUST invoke a local-override operation after settings selection, passing the collected settings for that target — the selected model and optional effort for Claude Code, and the selected model with optional variant for opencode. The operation MUST materialize the result as the target's project-local file and MUST report the result as persistent only after that file has been written successfully. Worker overrides MUST write under `.claude/agents/<worker>.md` and `.opencode/agents/<worker>.md` and MUST apply the project-local source, preservation, path, and failure rules defined by the `project-local-agent-overrides` capability. Command overrides MUST write under `.claude/commands/<command>.md` and `.opencode/commands/<command>.md`; when the project-local destination is absent, the operation MUST use the same-named installed global command as its source (`~/.claude/commands/<command>.md` for Claude Code or `~/.config/opencode/commands/<command>.md` for opencode), and MUST NOT substitute a repository-bundled command source or write the override into the global command directory. For commands, the operation MUST apply the same preservation, missing-source, and failure rules as the worker path: an existing project-local command is the file that is read and patched in place, preserving its body and non-tunable frontmatter; a selected command that is missing from the installed global root and has no project-local destination SHALL be reported as skipped with a diagnostic while the remaining targets continue; a target whose source file has no valid frontmatter block SHALL report a persistence failure without aborting the other targets. When a selected target's frontmatter lacks a tunable key that the settings selected (for example a command that ships with no `model` line), the operation SHALL add that key with the selected value; when the chosen Claude model has no effort list, the operation SHALL remove any existing top-level `effort` line from the target's frontmatter. When a command declares a model absent from the settings catalog, the operation SHALL replace that declared model with the selected catalog value.

#### Scenario: Selected Claude Code worker override is persisted
- **WHEN** Claude Code settings have been selected for a traversed worker, with or without an effort value
- **THEN** the local-override operation SHALL write the selected worker under `.claude/agents/<worker>.md` with the selected `model` and, only when selected, `effort`, and SHALL report a persistent result only after the write succeeds

#### Scenario: Selected opencode worker override is persisted
- **WHEN** opencode settings have been selected for a traversed worker
- **THEN** the local-override operation SHALL write the selected worker under `.opencode/agents/<worker>.md` with the selected `model` and optional `variant`, and SHALL report a persistent result only after the write succeeds

#### Scenario: Selected Claude Code command override is persisted
- **WHEN** Claude Code settings have been selected for a traversed command, with or without an effort value
- **THEN** the local-override operation SHALL write the selected command under `.claude/commands/<command>.md` with the selected `model` and, only when selected, `effort`, and SHALL report a persistent result only after the write succeeds

#### Scenario: Selected opencode command override is persisted
- **WHEN** opencode settings have been selected for a traversed command
- **THEN** the local-override operation SHALL write the selected command under `.opencode/commands/<command>.md` with the selected `model` and optional `variant`, and SHALL report a persistent result only after the write succeeds

#### Scenario: Command without tunable keys gains the selected ones
- **WHEN** a selected command's frontmatter declares no `model` line (or no effort or variant line) and the settings selector returns a model (with effort or variant)
- **THEN** the operation SHALL add the missing keys with the selected values, so a command that previously inherited the session's model becomes pinned

#### Scenario: Existing project-local command is patched in place
- **WHEN** a project-local command override exists from an earlier run and the user selects different settings
- **THEN** the operation SHALL read and patch that file, updating only the selected tunable lines and preserving the earlier body and non-tunable frontmatter

#### Scenario: Out-of-catalog command model is normalized
- **WHEN** a selected Claude Code command declares a `model` value absent from the settings catalog and the user confirms a catalog option
- **THEN** the operation SHALL replace the declared model with the selected catalog value and SHALL report the override as persisted

#### Scenario: Haiku removes an existing effort line
- **WHEN** a selected target has an existing top-level `effort` line and the user confirms the `haiku` catalog entry, which has no effort list
- **THEN** the operation SHALL remove that top-level `effort` line while preserving all non-tunable content

#### Scenario: Missing installed command source is a soft per-target failure
- **WHEN** a selected command has no project-local destination and its installed global source is unavailable
- **THEN** the operation SHALL report that command as skipped with a diagnostic, SHALL NOT create its project-local destination, and SHALL continue processing the remaining targets

#### Scenario: Invalid frontmatter block fails without aborting other targets
- **WHEN** a selected target's source file has no valid frontmatter block
- **THEN** the operation SHALL report a persistence failure with a diagnostic for that target and SHALL continue processing the remaining targets

### Requirement: Navigable target-selection checklist
The empty-enumeration notice SHALL read `No customization targets are available for the selected scope.` After scope selection and before per-target configuration, the flow SHALL present a navigable multi-select checklist listing every target of the chosen family — or every family in `All` scope — derived from the canonical manifest projections and Worker Matrix metadata in `sai/install-manifest.json` for the chosen harness, with every target selected by default when at least one target exists. Up/down arrows SHALL move the `>` cursor, space SHALL toggle the highlighted target's selection, and Enter SHALL confirm the selection only when at least one target is marked. Rows SHALL retain stable family-prefixed identities (`worker:`, `agent:`, `command:`, or `utility:`) and append the current effective model annotation in subdued styling; display labels SHALL remain separate from the confirmed stable values. Rows SHALL be grouped in Workers, Agents, Commands, Utilities order, with each family in alphabetical order by name. The flow SHALL run per-target configuration exactly for the selected targets in checklist order, and SHALL preserve that order for diagnostics. If the adapter enumerates no targets, it SHALL show a notice and return to the scope screen instead of presenting a zero-row checklist.

#### Scenario: Checklist defaults to all targets selected
- **WHEN** the user enters the target-selection checklist for a harness and scope
- **THEN** every target of that scope SHALL be pre-selected when at least one target exists

#### Scenario: User narrows the customization subset
- **WHEN** the user deselects one or more targets and confirms with Enter
- **THEN** per-target configuration SHALL run only for the targets remaining selected

#### Scenario: All mode keeps same-named targets and families distinct
- **WHEN** the user enters the `All` checklist for the OpenCode harness, whose worker and command sets both contain a target named `budget`
- **THEN** the checklist SHALL present `worker:budget` and `command:budget` as two distinct rows, each independently selectable, and confirmation SHALL return both as separate stable identities

#### Scenario: All mode groups rows by family
- **WHEN** the user enters the `All` checklist for a harness
- **THEN** Workers SHALL precede Agents, Agents SHALL precede Commands, Commands SHALL precede Utilities, and rows within each family SHALL appear in alphabetical order by name

#### Scenario: Empty selection remains on the checklist
- **WHEN** the user deselects every target and presses Enter
- **THEN** the navigator SHALL refuse confirmation, the checklist SHALL remain open, and no settings or target configuration SHALL run until the user marks a target or navigates back or cancels

#### Scenario: Empty target enumeration returns to scope
- **WHEN** the selected adapter enumerates no targets for the chosen scope
- **THEN** the flow SHALL show a notice and return to the scope screen without rendering a zero-row checklist or waiting for an Enter that cannot confirm

### Requirement: Navigable cancellation aborts customization
When the user presses `q` or Ctrl-C at any navigable surface — the post-setup menu, the harness picker, the customization scope screen, the target-selection checklist, the Claude Code combined model/effort frame, or any OpenCode provider, model, or variant screen — the flow SHALL cancel the entire customization run: no target SHALL be configured, no further navigable surface SHALL be presented, and the flow SHALL complete normally without hard-exiting the process (the configurator's non-exit contract, in contrast to the installer's caller-owned exit policy).

#### Scenario: Cancel from the post-setup menu
- **WHEN** the user presses `q` or Ctrl-C at the post-setup menu
- **THEN** customization SHALL be cancelled with no target configured and the flow SHALL complete normally

#### Scenario: Cancel from the harness picker
- **WHEN** the user presses `q` or Ctrl-C at the harness picker
- **THEN** customization SHALL be cancelled with no target configured and the flow SHALL complete normally

#### Scenario: Cancel from the scope screen or target-selection checklist
- **WHEN** the user presses `q` or Ctrl-C at the customization scope screen or at the target-selection checklist
- **THEN** customization SHALL be cancelled with no target configured and the flow SHALL complete normally

#### Scenario: Cancel during settings selection
- **WHEN** the user presses `q` or Ctrl-C at the Claude Code combined model/effort frame or at any OpenCode provider, model, or variant screen, or the settings selector returns no selection
- **THEN** customization SHALL be cancelled — no target SHALL be configured — and the flow SHALL complete normally

### Requirement: Capability rename and archival
The `agent-customization-menu` capability SHALL be retired: its main spec SHALL move from `openspec/specs/agent-customization-menu/spec.md` to `openspec/specs/_archived/agent-customization-menu/spec.md` with its historical content preserved, and `model-customization-menu` SHALL be the active capability home for the restated requirements. The active spec tree SHALL NOT retain a capability named `agent-customization-menu`, and no content under `openspec/specs/_archived/` other than this move SHALL be created, modified, or removed. Descriptive references to the retired name inside other active specs SHALL remain unchanged and do not constitute a retained capability.

#### Scenario: Retired spec lands in the archive
- **WHEN** the change is implemented
- **THEN** `openspec/specs/agent-customization-menu/spec.md` no longer exists under the active spec tree and its historical content is preserved at `openspec/specs/_archived/agent-customization-menu/spec.md`

#### Scenario: Active home is the renamed capability
- **WHEN** the change is implemented
- **THEN** the restated requirements are active under `openspec/specs/model-customization-menu/spec.md` and under no other capability
