## Purpose
TTY-only post-setup customization menu and isolated harness adapters that apply a selected model and optional effort or variant to project-local worker and command overrides for both supported harnesses, with an explicit scope screen and per-family checklist labeling.

## Requirements

### Requirement: Post-setup customization menu

The setup flow MUST present a post-setup menu only after all existing setup operations have completed. The menu MUST provide exactly five actions: `Customize models`, `Reset to default models`, `Save preset`, `Load preset`, and `Exit`. The menu MUST be presented as a navigable single-select list: up/down arrows move the `>` cursor and Enter (or space) confirms the highlighted action. Selecting `Save preset` or `Load preset` MUST route harness selection to the save-preset or load-preset screen with no scope screen.

#### Scenario: User exits from the post-setup menu

- **WHEN** setup completes its existing work and the user selects `Exit`
- **THEN** the setup flow MUST finish without selecting a harness, scope, or any target

#### Scenario: User enters model customization

- **WHEN** setup completes its existing work and the user selects `Customize models`
- **THEN** the flow MUST continue to exclusive harness selection

#### Scenario: User navigates the post-setup menu with arrow keys

- **WHEN** the user moves the `>` cursor with the arrow keys and confirms with Enter
- **THEN** the flow MUST act on exactly the highlighted action

#### Scenario: User enters save preset from the post-setup menu

- **WHEN** the user selects `Save preset` at the post-setup menu and chooses a harness
- **THEN** the flow MUST route to the save-preset screen without presenting scope or settings screens

#### Scenario: User enters load preset from the post-setup menu

- **WHEN** the user selects `Load preset` at the post-setup menu and chooses a harness
- **THEN** the flow MUST route to the load-preset screen without presenting scope or settings screens

### Requirement: TTY-only interaction

The setup flow MUST determine whether interaction is available through its injectable TTY check before presenting the post-setup menu, the navigable harness picker, the customization scope screen, the target-selection checklist, either Claude Code model or effort screen, or any OpenCode provider, model, or variant screen. When no TTY is available, it MUST skip the menu and all customization adapters without adding menu-specific prompts, checklist renders, or output, and `runPostSetupMenu` MUST return 'skipped' so `setup.js` completes normally — the configurator MUST NOT hard-exit like the installer.

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

### Requirement: Derived target families

The model-customization menu SHALL derive target families from the canonical worker matrix and current wrapper inventory. The command family MUST include the active `sai-*` wrappers only and MUST exclude `budget` after the standalone wrapper is removed. Worker and agent families remain independently derived, so an available `budget` agent remains an agent target. `sai-merge-worker` SHALL remain a routed worker and `sai-merge` SHALL remain a command on both adapters. `sai-commit-worker` SHALL remain a routed worker and `sai-commit` SHALL remain a command on both adapters, with `utility:sai-commit` absent. An existing project-local override for sai-commit SHALL keep resolving without migration because both families resolve to the same commands directory.

Both Claude Code and opencode adapters SHALL restrict their shared command enumeration to manifest-projected Markdown wrappers whose names begin with `sai-`, before command-versus-utility classification. Non-SAI wrappers, including `from-backlog`, `from-next-backlog-item`, `to-backlog`, and `to-pr`, MUST NOT become customization command targets in Orchestrators or All scopes. Enumeration SHALL leave wrapper contents unchanged. Supported SAI command targets, independently derived worker and agent targets, and separate utility classification SHALL remain available. A missing target profile or unavailable effective setting MUST NOT exclude an otherwise eligible SAI target.

#### Scenario: Merge targets appear in the menu

- **WHEN** the customization menu enumerates configurable targets on either adapter
- **THEN** the merge worker and command are present in their routed/command families with the updated counts asserted by the suite

#### Scenario: Budget remains an agent but not a command

- **WHEN** the All scope enumerates targets for a harness with a budget agent
- **THEN** it includes `agent:budget` and excludes `command:budget`

#### Scenario: Commit appears as an orchestrator with its worker

- **WHEN** the menu enumerates targets for either harness
- **THEN** sai-commit SHALL appear as command:sai-commit in the command family and sai-commit-worker SHALL remain a routed worker, with utility:sai-commit absent

#### Scenario: Shared enumeration excludes every non-SAI wrapper

- **WHEN** either harness adapter enumerates manifest-projected command wrappers containing supported `sai-*` names, the four reported non-SAI wrappers, and another wrapper without the `sai-` prefix
- **THEN** enumeration SHALL return only supported `sai-*` wrapper names and SHALL leave every wrapper's contents unchanged

#### Scenario: Orchestrators excludes non-SAI commands in both harnesses

- **WHEN** a user opens the Orchestrators customization scope in Claude Code or opencode
- **THEN** the checklist and its default selection SHALL exclude non-SAI command wrappers while retaining supported SAI command targets

#### Scenario: All retains independent families and utilities

- **WHEN** a user opens the All customization scope in Claude Code or opencode
- **THEN** the checklist and its default selection SHALL exclude non-SAI command wrappers while retaining supported SAI commands, independently derived workers and agents, and separately classified utilities

#### Scenario: Unknown or unavailable does not determine eligibility

- **WHEN** an eligible `sai-*` command has no mapped target profile and its effective setting is unavailable on either harness
- **THEN** it SHALL remain in the Orchestrators and All checklists with Unknown profile columns and an unavailable setting

### Requirement: Checklist rows expose context and difficulty
The model-customization checklist and the reset and save/load preset previews SHALL render columns in the order `TYPE`, `TARGET`, `CONTEXT`, `DIFFICULTY`, and `SETTING` for every target in both OpenCode and Claude Code flows, with headers, separators, and rows aligned and setting text preserved.
#### Scenario: Display context and difficulty in both harnesses

- **WHEN** a user opens a customization checklist in either supported harness
- **THEN** each target row displays a context estimate followed by an arrow-based difficulty value between its target name and setting text while preserving the existing selection identity
#### Scenario: Previews share the checklist column order
- **WHEN** a user opens a reset checklist or a save/load preset preview in either harness
- **THEN** its header and rows SHALL show `CONTEXT` before `DIFFICULTY` with the same widths as the customization checklist

### Requirement: Target profiles use family-qualified identities
The customization logic SHALL resolve each target's `CONTEXT` and `DIFFICULTY` from one shared static profile mapping keyed by complete family-qualified identity, including the `worker:`, `agent:`, `command:`, or `utility:` prefix, for both supported harnesses. Configured context values MUST be `Small`, `Medium`, or `Large`; configured difficulty values MUST be `↑`, `↑↑`, or `↑↑↑`. An unmapped identity SHALL display `Unknown` in both columns so that a missing entry never reads as a small or easy task. `CONTEXT` estimates the typical task context — instructions, documents, results, and accumulated continuations: `Small` for isolated tasks with few inputs and little history, `Medium` for several documents or continuations, and `Large` for substantial documents, results, and accumulated state. It describes the task, independent of the selected model's context-window capacity and of live token counts. `DIFFICULTY` estimates the task's reasoning demand. Profiles are display-only: selection identities, family grouping, ordering, effective settings, and preset file contents SHALL be independent of them. `command:sai-commit` SHALL resolve to a single up-arrow and `worker:sai-4-green-worker` SHALL resolve to a double up-arrow, with `utility:sai-commit` absent.
#### Scenario: Prevent bare-name taxonomy collisions

- **WHEN** a profile is resolved for targets with family-qualified identities such as `agent:budget` and `command:sai-2-design`
- **THEN** each lookup uses its complete identity rather than a bare target name, and the resulting display values remain within the permitted sets
#### Scenario: Commit coordinator and green worker difficulty
- **WHEN** difficulty is resolved for command:sai-commit and worker:sai-4-green-worker
- **THEN** each lookup SHALL use its complete identity and return a single up-arrow and a double up-arrow respectively
#### Scenario: Low-difficulty coordinator still shows medium context
- **WHEN** the checklist displays `command:sai-6-security`
- **THEN** it SHALL show `Medium` under `CONTEXT` and a single arrow under `DIFFICULTY`
#### Scenario: Fresh Step workers carry less context than their supervisor
- **WHEN** the checklist displays `command:sai-4-apply` and its RED and GREEN workers
- **THEN** the coordinator SHALL show `Large` and each worker SHALL show `Medium` under `CONTEXT`
#### Scenario: Unmapped target shows Unknown
- **WHEN** a target has no profile entry
- **THEN** its row SHALL display `Unknown` under both `CONTEXT` and `DIFFICULTY` while retaining its stable selection identity and effective setting

### Requirement: Shared settings selection
After the target-selection checklist confirms a non-empty subset and before any local override is created, the flow SHALL invoke the selected harness's settings selector exactly once for the whole confirmed subset in that customization pass. The collected settings choices — a model followed by an effort or explicit no-effort confirmation for Claude Code, and a discovered model with an optional variant for OpenCode — SHALL be passed to the per-target local-override operation once for every selected target. A per-target skipped result means the operation was attempted but its source was unavailable; it SHALL not be treated as a settings-selector failure or prevent later targets from being attempted. In `All` scope, the selector SHALL run once and the same settings SHALL be passed to every marked target across all selected families, with no per-family differentiation within a pass. Injected Claude catalogs MAY continue to contain model-only entries and expose `Default (no effort)` for those entries; the built-in `haiku` catalog entry SHALL instead expose its five explicit efforts. Because the model-customization checklist rejects empty confirmation, the settings selector SHALL never be invoked for an empty selection.
#### Scenario: Settings selector runs exactly once per customization pass
- **WHEN** the target-selection checklist confirms a non-empty subset
- **THEN** the flow SHALL invoke the settings selector exactly once for that customization pass
#### Scenario: Local overrides run exactly once per selected target
- **WHEN** the settings selector has returned the shared settings choices for the confirmed subset
- **THEN** the local-override operation SHALL be attempted exactly once per selected target, including targets that ultimately report a non-fatal skip
#### Scenario: Same settings applied to every selected target
- **WHEN** the settings selector returns its settings choices for a confirmed subset of two or more targets
- **THEN** every selected target's local override SHALL carry those identical settings choices, including the absence of `effort` when the chosen Claude model has no effort values and the user confirms `Default (no effort)`
#### Scenario: All scope applies one settings pass across all families
- **WHEN** the confirmed subset in `All` scope contains targets from multiple families and the settings selector returns its choices
- **THEN** every marked target SHALL receive those identical settings choices in the single pass, with no per-family differentiation
#### Scenario: Empty confirmation never reaches settings
- **WHEN** the user attempts to confirm an empty model-customization checklist
- **THEN** the checklist SHALL remain open and the settings selector SHALL NOT be invoked
#### Scenario: Both Claude screens finish before persistence
- **WHEN** the user has selected a Claude model but has not completed its effort or no-effort confirmation
- **THEN** the selector SHALL NOT return completed settings or create or modify a local override for the current selection
#### Scenario: Built-in Haiku selection uses explicit effort
- **WHEN** the user selects the built-in Claude `haiku` entry and completes its effort screen
- **THEN** the shared settings result SHALL contain `model: haiku` and one of the five supported effort values

### Requirement: Stable target identities and effective model annotations
The target checklist SHALL keep stable family-prefixed selection values separate from display labels. Each display label SHALL render an aligned five-column table row separated by two-space gutters: TYPE SHALL carry the target's uppercase display family (`WORKER`, `AGENT`, `ORCHESTRATOR`, or `UTILITY`) padded to twelve characters; TARGET SHALL carry the target's name padded to the longest displayed target name of the current scope; CONTEXT and DIFFICULTY SHALL carry their respective estimates padded to their header widths; and SETTING SHALL carry the target's effective setting as plain text with no brackets and no ANSI styling. The setting SHALL use `provider/model (effort)` formatting, with Claude Code's `effort` and OpenCode's `variant` occupying the tuning position. Project-local overrides SHALL take precedence over installed or global sources; malformed or missing frontmatter SHALL produce a safe `unavailable` setting rendered as ordinary column text without breaking selection.

#### Scenario: Checklist displays stable identities and current settings
- **WHEN** a target checklist is rendered for either supported harness
- **THEN** each row SHALL display aligned TYPE, TARGET, CONTEXT, DIFFICULTY, and SETTING columns while the confirmed selection value remains the stable family-prefixed identity

#### Scenario: Local settings override installed settings
- **WHEN** a project-local target override exists with valid tunable frontmatter
- **THEN** the SETTING column SHALL show that local model and tuning value instead of the installed or global source

#### Scenario: Invalid settings do not break selection
- **WHEN** a target source is missing or its frontmatter is malformed
- **THEN** the SETTING column SHALL show `unavailable` as plain column text with no ANSI wrapper and the target SHALL remain selectable

### Requirement: Claude settings selection
For every Claude Code customization run with a non-empty confirmed subset, the Claude Code adapter MUST present dependent navigable single-select screens in this order: `Model for <subset>:` followed by `Effort for <subset>:`. Model options MUST be unique model identifiers derived from valid entries in the adapter-owned static Claude settings catalog. The effort screen MUST offer only effort values belonging to the selected model; for a model entry without an `efforts` array, it MUST offer exactly one display option, `Default (no effort)`. The built-in catalog MUST contain `haiku` with exactly `low`, `medium`, `high`, `xhigh`, and `max`, so the built-in Haiku selection MUST NOT offer a model-only row or `Default (no effort)`. The catalog MUST be the authoritative source for the available model identifiers and each model's effort values, MUST contain at least one valid model entry, and MUST contain no placeholder values such as `<model>` or `<effort>`. The selected result MUST contain only catalog members: `{ model, effort }` for an effort-bearing entry or `{ model }` with no `effort` property for a model-only injected catalog entry. Legacy `{ model: 'haiku' }` settings are accepted separately for loading existing configurations and are not produced by the built-in Haiku selector. `Default (no effort)` MUST NOT become an effort value, and Haiku MUST NOT return `effort: default`.
Back navigation from the effort screen MUST reopen the model screen. Selecting a model after navigating back MUST derive its effort options anew without retaining another model's effort selection. Back navigation from the model screen MUST return control to target selection. Cancellation on either screen MUST return the cancellation outcome without saving the current selection.
If the catalog is unavailable or contains no valid model entries, or the selector returns a null or invalid setting, the post-setup menu SHALL return status `failed` with a diagnostic naming the cause and SHALL configure no target on that path. The selector MUST NOT perform Claude live model discovery, claim that end-to-end customization is fake, or perform OpenCode provider, model, or variant discovery. The collected values MUST be forwarded to the persistent local-override operation only after both screens complete. The OpenCode adapter MUST continue to use its existing dependent provider-to-model-to-variant selection rather than the Claude static catalog.
#### Scenario: Static Claude catalog contains the current model and effort set
- **WHEN** the Claude adapter loads its built-in settings catalog
- **THEN** the catalog SHALL contain `opus`, `sonnet`, `fable`, and `haiku`, each with efforts `low`, `medium`, `high`, `xhigh`, and `max`
#### Scenario: Claude selection returns concrete model and effort
- **WHEN** a non-empty Claude Code subset reaches settings selection and the user confirms `sonnet` on the model screen followed by `medium` on the effort screen
- **THEN** the selector SHALL return exactly the concrete catalog values `{ model: 'sonnet', effort: 'medium' }`
#### Scenario: Claude selection returns a model without effort
- **WHEN** a non-empty Claude Code subset reaches settings selection with an injected catalog entry `plain` without an `efforts` array and the user confirms `plain` followed by `Default (no effort)`
- **THEN** the selector SHALL return exactly `{ model: 'plain' }` without a top-level `effort` property or an `effort: default` value
#### Scenario: Built-in Haiku selection returns concrete effort
- **WHEN** a non-empty Claude Code subset reaches settings selection and the user confirms `haiku` followed by `xhigh`
- **THEN** the selector SHALL return exactly `{ model: 'haiku', effort: 'xhigh' }`
#### Scenario: Claude selection does not use placeholders
- **WHEN** either Claude Code settings screen is rendered
- **THEN** no selectable option SHALL use `<model>` or `<effort>` placeholder values, and `Default (no effort)` SHALL represent absence of effort rather than a fabricated effort value
#### Scenario: Claude selection is bounded by per-model catalog entries
- **WHEN** the adapter-owned catalog contains model entries with model-specific effort arrays or no effort array
- **THEN** every displayed model and concrete effort and every returned Claude setting SHALL be derived from the selected catalog entry, with no effort accepted for a model-only entry and no effort borrowed from another model
#### Scenario: Missing Claude settings catalog produces no settings
- **WHEN** the Claude settings catalog is unavailable or contains no valid model entries
- **THEN** the menu SHALL return status `failed` with a diagnostic naming the unavailable catalog and customization SHALL configure no target on that path
#### Scenario: OpenCode does not use the Claude frame
- **WHEN** OpenCode customization reaches settings selection
- **THEN** the flow SHALL use the dependent provider, model, and optional variant screens and SHALL not present the Claude model and effort screens or use the Claude static catalog
#### Scenario: Back from effort reopens model selection
- **WHEN** the user presses left-arrow or Esc on the Claude effort screen
- **THEN** the selector SHALL reopen model selection without persisting settings, and a subsequent model choice SHALL determine a fresh set of effort options
#### Scenario: Back from model returns to target selection
- **WHEN** the user presses left-arrow or Esc on the Claude model screen
- **THEN** the selector SHALL return `BACK` to its caller without persisting settings so target selection can reopen
#### Scenario: Invalid screen choices produce no settings
- **WHEN** either Claude screen returns a choice absent from its displayed catalog-derived options
- **THEN** the selector SHALL return no usable settings and SHALL NOT configure any target

### Requirement: Cyclic post-setup customization passes

After a customization pass has selected settings and invoked the local-override operation once for every selected target, without any operation reporting a persistence failure, the post-setup flow SHALL return to the `Post-setup customization:` menu instead of terminating. A customization pass is the completed path from choosing `Customize models` through a confirmed target set, one settings-selection result, and one operation attempt for every selected target; navigating back before those operations does not complete a pass. `completed` is the per-pass outcome used for this successful re-entry transition, not the final `runPostSetupMenu` result after the user later selects `Exit`. A per-target skipped result is non-fatal: it means that target was attempted but no override was written, and the pass may still re-enter the menu. Before re-entering that menu, the flow SHALL reset the adapter, harness, scope, selected targets, settings, pass outcome, and pass diagnostics to their initial empty state; each newly rendered single-select navigator SHALL start with cursor index 0 and no selected items, and the target checklist SHALL start with cursor index 0 and all enumerated targets selected, so the next pass re-creates all pass-specific choices. Only a pass with no persistence failure SHALL create this re-entry transition; cancellation SHALL terminate the loop with a normal cancelled outcome, a null or invalid settings result SHALL terminate the loop with a reported `failed` outcome, and persistence failure SHALL terminate the loop with a persistence-failed outcome. Selecting `Exit` at the menu SHALL return the final normal cancelled outcome after zero or more successful passes; prior pass outcomes SHALL not be aggregated into a failure.

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

When a persistence-failed pass also contains skipped targets, their names SHALL intentionally remain omitted from the `persistence-failed` record because the ordered diagnostics already convey those skips; this preserves the existing outcome asymmetry. The customization flow SHALL retain these observable outcomes: `completed` for a pass whose selected-target operations have no persistence failure, including passes with skipped targets, with skipped-target names and diagnostics when applicable; `skipped` with reason `cancelled` or `non-tty` for normal cancellation or no TTY; `failed` with a diagnostic for a null or invalid settings result, closed terminal input, or a later customization step failure; and `persistence-failed` with failure diagnostics when any selected-target operation fails to persist. A successful pass record SHALL contain `status: completed`, `skippedAgents: string[]`, and `diagnostics: string[]`; a persistence-failed pass record SHALL contain `status: persistence-failed`, `failedAgents: string[]`, and `diagnostics: string[]`; a terminal skipped result SHALL contain `status: skipped` and one of the stated reasons; a failed customization result SHALL contain `status: failed` and its diagnostic. The diagnostics array SHALL retain confirmed target operation order. Each selected target SHALL contribute at most one diagnostic string: persisted targets contribute none, skipped targets contribute `Skipped <name>: installed source is unavailable.`, and failed targets contribute the operation's returned diagnostic string. The local-override operation SHALL classify its result as `persisted`, `skipped`, or `persistence-failed` with a diagnostic string for the latter; an unexpected exception in the menu flow SHALL be caught by `runPostSetupMenu` and SHALL return status `failed` with its diagnostic through the failed-customization path, which setup SHALL map to `post-setup-failure`, with a non-zero process exit code and no requirement to attempt later targets or render a per-pass diagnostic list. When one selected-target operation reports a persistence failure, the remaining selected-target operations SHALL still be attempted once, after which the pass SHALL report `persistence-failed` and SHALL NOT re-enter the menu. `runPostSetupMenu` SHALL print each materialization pass's produced diagnostic string exactly once at the end of that pass, in selected-target operation order, using the existing `Post-setup customization: <diagnostic>` presentation; `bin/setup.js` SHALL not duplicate those diagnostics.

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

#### Scenario: Null or invalid settings report failure instead of a normal exit

- **WHEN** a settings selector returns no usable settings because the selector returned null or an invalid setting, or terminal input closed while waiting
- **THEN** the menu SHALL return status `failed` with a diagnostic naming the cause and setup SHALL terminate with a non-zero exit code

### Requirement: Retire-docs belongs to the utility target family

Model customization SHALL derive `sai-retire-docs` as a utility target from the projected command inventory.

#### Scenario: Utility target is discoverable

- **WHEN** the customization menu builds its utility checklist
- **THEN** it SHALL expose `utility:sai-retire-docs` as a selectable target

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
- **THEN** the menu SHALL return status `failed` with a diagnostic naming the unavailable source and setup SHALL terminate with a non-zero exit code, distinct from voluntary cancellation which SHALL remain a normal exit 0

### Requirement: Opt-in empty-confirm protection
The navigator SHALL expose an opt-in guard for multi-select confirmation with no marked items, defaulting to disabled when the option is omitted. When enabled, Enter SHALL refuse confirmation and keep the checklist open; when disabled, the navigator SHALL preserve its existing empty-confirm behavior. The sole enabling call SHALL be the model-customization target checklist in `runPostSetupMenu`; the installer's first screen is inside `main()` in `bin/install-flow.js` at its `promptChecklist` call and SHALL omit the option, preserving its existing empty-confirm branch. Regression coverage SHALL statically assert these two production `promptChecklist` call sites and the enabled/omitted option at each call site.

#### Scenario: Model checklist refuses an empty confirmation
- **WHEN** targets are available, the user deselects every target, and presses Enter in the model-customization checklist
- **THEN** the checklist SHALL remain open without returning a confirmed empty selection

#### Scenario: Installer first screen keeps its empty-confirm exit
- **WHEN** the installer first screen has no selected item and the user presses Enter
- **THEN** the installer SHALL preserve its existing `Nothing selected. Exiting.` branch and exit behavior

### Requirement: Visible selection-screen back affordance

Every model-customization harness, scope, target, and settings selection screen SHALL render a key legend that announces left-arrow/Esc back navigation and q/Ctrl-C cancellation. Single-select screens SHALL use the default legend `Up/Down move · Space/Enter confirm · ←/Esc back · q/Ctrl-C cancel`; the multi-select target screen SHALL use the legend `Up/Down move · Space toggle · Ctrl+A toggle all · Enter confirm · ←/Esc back · q/Ctrl-C cancel`. The post-setup menu SHALL call through the `promptSelect` path with an explicit no-footer override and SHALL not announce back navigation because back at that first screen only redraws the menu. `promptSelect` SHALL unconditionally forward the default single-select legend to `runNavigator` whenever no footer override is supplied. The twelve production `promptChoice` invocations are the post-setup menu, harness selector, scope selector, save confirm, save overwrite, load selector, load confirm, Claude model selector, Claude effort selector, and OpenCode provider, model, and variant selectors; `promptChoice` SHALL default to `promptSelect` at the Claude adapter, OpenCode adapter, and post-setup menu binding sites. The installer first screen uses `promptChecklist`, not `promptSelect`, and SHALL retain its existing footer behavior.

#### Scenario: Single-select screens announce back
- **WHEN** the harness, scope, Claude model, Claude effort, or any OpenCode provider, model, or variant screen is rendered
- **THEN** its footer SHALL announce left-arrow/Esc back, q/Ctrl-C cancellation, and Space confirmation

#### Scenario: The checklist announces back and toggle behavior
- **WHEN** the model-customization target checklist is rendered
- **THEN** its footer SHALL announce left-arrow/Esc back, q/Ctrl-C cancellation, Space toggling, and Ctrl+A toggle-all behavior without changing its existing multi-select legend semantics

#### Scenario: The first menu does not announce back
- **WHEN** the post-setup customization menu is rendered
- **THEN** its footer SHALL not claim that left-arrow/Esc leaves the menu

#### Scenario: Eleven selectors retain legends and bindings
- **WHEN** the post-setup, harness, scope, save, load, Claude model and effort, and OpenCode selector screens render across the twelve production choice invocations
- **THEN** each single-select screen SHALL announce back navigation while the menu retains its no-footer override and default bindings

### Requirement: Persistent local override
For every traversed target, the selected harness adapter MUST invoke a local-override operation after settings selection, passing the collected settings for that target — the selected model and optional effort for Claude Code, and the selected model with optional variant for opencode. The operation MUST materialize the result as the target's project-local file and MUST report the result as persistent only after that file has been written successfully. Worker overrides MUST write under `.claude/agents/<worker>.md` and `.opencode/agents/<worker>.md` and MUST apply the project-local source, preservation, path, and failure rules defined by the `project-local-agent-overrides` capability. Command overrides MUST write under `.claude/commands/<command>.md` and `.opencode/commands/<command>.md`; when the project-local destination is absent, the operation MUST use the same-named installed global command as its source and MUST NOT substitute a repository-bundled command source or write the override into the global command directory. Existing project-local files MUST be patched in place while preserving their body and non-tunable frontmatter. Missing installed sources SHALL be reported as skipped while remaining targets continue, and invalid frontmatter SHALL report a persistence failure without aborting other targets. When a selected target's frontmatter lacks a tunable key that the settings selected, the operation SHALL add that key with the selected value. When a selected Claude model is supplied by an injected catalog without an effort list, the operation SHALL remove any existing top-level `effort` line; when the built-in `haiku` selection supplies an explicit effort, the operation SHALL persist that effort. A legacy model-only Haiku setting loaded from an existing configuration SHALL preserve the omitted effort.
#### Scenario: Selected Claude Code worker override is persisted
- **WHEN** Claude Code settings have been selected for a traversed worker, with or without an effort value
- **THEN** the local-override operation SHALL write the selected worker under `.claude/agents/<worker>.md` with the selected `model` and, only when selected, `effort`, and SHALL report a persistent result only after the write succeeds
#### Scenario: Selected opencode worker override is persisted
- **WHEN** opencode settings have been selected for a traversed worker
- **THEN** the local-override operation SHALL write the selected worker under `.opencode/agents/<worker>.md` with the selected model and optional variant, and SHALL report a persistent result only after the write succeeds
#### Scenario: Selected Claude Code command override is persisted
- **WHEN** Claude Code settings have been selected for a traversed command, with or without an effort value
- **THEN** the local-override operation SHALL write the selected command under `.claude/commands/<command>.md` with the selected `model` and, only when selected, `effort`, and SHALL report a persistent result only after the write succeeds
#### Scenario: Selected opencode command override is persisted
- **WHEN** opencode settings have been selected for a traversed command
- **THEN** the local-override operation SHALL write the selected command under `.opencode/commands/<command>.md` with the selected model and optional variant, and SHALL report a persistent result only after the write succeeds
#### Scenario: Command without tunable keys gains the selected ones
- **WHEN** a selected command's frontmatter declares no `model` line or lacks a selected effort or variant line
- **THEN** the operation SHALL add the missing keys with the selected values
#### Scenario: Existing project-local command is patched in place
- **WHEN** a project-local command override exists from an earlier run and the user selects different settings
- **THEN** the operation SHALL read and patch that file, updating only the selected tunable lines and preserving the earlier body and non-tunable frontmatter
#### Scenario: Out-of-catalog command model is normalized
- **WHEN** a selected Claude Code command declares a `model` value absent from the settings catalog and the user confirms a catalog option
- **THEN** the operation SHALL replace the declared model with the selected catalog value and SHALL report the override as persisted
#### Scenario: Haiku removes an existing effort line
- **WHEN** a selected target uses an injected Claude catalog entry without an effort list and its frontmatter has an existing top-level `effort` line
- **THEN** the operation SHALL remove that top-level `effort` line while preserving all non-tunable content
#### Scenario: Explicit Haiku effort is retained
- **WHEN** a selected target has an existing top-level `effort` line and the user confirms built-in `haiku` with `high`
- **THEN** the operation SHALL persist `model: haiku` and `effort: high` while preserving all non-tunable content
#### Scenario: Legacy model-only Haiku remains model-only
- **WHEN** an existing model-only Haiku preset is loaded into a target
- **THEN** the resulting override SHALL retain `model: haiku` without an `effort` line
#### Scenario: Missing installed command source is a soft per-target failure
- **WHEN** a selected command has no project-local destination and its installed global source is unavailable
- **THEN** the operation SHALL report that command as skipped with a diagnostic, SHALL NOT create its project-local destination, and SHALL continue processing the remaining targets
#### Scenario: Invalid frontmatter block fails without aborting other targets
- **WHEN** a selected target's source file has no valid frontmatter block
- **THEN** the operation SHALL report a persistence failure with a diagnostic for that target and SHALL continue processing the remaining targets

### Requirement: Navigable target-selection checklist
The empty-enumeration notice SHALL read `No customization targets are available for the selected scope.` After scope selection and before per-target configuration, the flow SHALL present a navigable multi-select checklist listing every target of the chosen family — or every family in `All` scope — derived from the canonical manifest projections and Worker Matrix metadata in `sai/install-manifest.json` for the chosen harness, with every target selected by default when at least one target exists. The command family SHALL enumerate only active `sai-*` wrappers and SHALL NOT produce a `command:budget` target after the standalone wrapper is removed; independently derived worker and agent families MAY still contain budget targets. Up/down arrows SHALL move the `>` cursor, space SHALL toggle the highlighted target's selection, and Enter SHALL confirm the selection only when at least one target is marked. Rows SHALL retain stable family-prefixed identities (`worker:`, `agent:`, `command:`, or `utility:`) as their confirmed selection values while their display labels render as aligned checklist table columns under a two-line English header; display labels SHALL remain separate from the confirmed stable values. The header SHALL render between the question and the option rows starting under the six-character option prefix, carrying the column titles above a U+2500 dash separator row sized to the same widths as the row columns, and its lines SHALL be non-selectable decoration excluded from cursor movement and toggling while included in redraw bookkeeping. In single-family scopes the checklist SHALL keep alphabetical target order with no separators. In All scope the checklist SHALL use the logical pipeline order with phase separators instead of family-alphabetical command blocks: alphabetical agents first, then the phased middle block in four fixed phases, then alphabetical utilities after a blank. Stepping back from the target checklist MUST re-open the scope screen. The flow SHALL run per-target configuration exactly for the selected targets in checklist order, and SHALL preserve that order for diagnostics. If the adapter enumerates no targets, it SHALL print the empty-enumeration notice before building any header or labels and return to the scope screen without opening a zero-row checklist. Phase 4 SHALL order `sai-backfill`, `sai-archive`, `sai-merge`, and `sai-commit`, with the `sai-commit` orchestrator block ordered directly after the `sai-merge` block and before the utilities separator as ORCHESTRATOR `sai-commit` followed by WORKER `sai-commit-worker`. `COMMAND_WORKER_ORDER` SHALL pair `sai-commit` with `sai-commit-worker`.
#### Scenario: Target checklist renders its table header above the options
- **WHEN** the model-customization target checklist is rendered with available targets
- **THEN** a two-line TYPE/TARGET/CONTEXT/DIFFICULTY/SETTING header SHALL appear between the question and the first option row, indented over the option prefix, with dash separators matching the row column widths
#### Scenario: Checklist defaults to all targets selected
- **WHEN** the user enters the target-selection checklist for a harness and scope
- **THEN** every target of that scope SHALL be pre-selected when at least one target exists
#### Scenario: User narrows the customization subset
- **WHEN** the user deselects one or more targets and confirms with Enter
- **THEN** per-target configuration SHALL run only for the targets remaining selected
#### Scenario: All mode omits the removed command
- **WHEN** the OpenCode All-scope checklist is rendered after the budget wrapper removal
- **THEN** the checklist contains no `command:budget` row while retaining any independently enumerated `agent:budget` row.
#### Scenario: All mode groups rows by family
- **WHEN** the user enters the All checklist for a harness
- **THEN** family-grouped alphabetical command blocks SHALL be superseded; stable family-prefixed identities SHALL be retained as selection values while All order SHALL follow logical pipeline phases with separators
#### Scenario: Empty selection remains on the checklist
- **WHEN** the user deselects every target and presses Enter
- **THEN** the navigator SHALL refuse confirmation, the checklist SHALL remain open, and no settings or target configuration SHALL run until the user marks a target or navigates back or cancels
#### Scenario: Empty target enumeration returns to scope
- **WHEN** the selected adapter enumerates no targets for the chosen scope
- **THEN** the flow SHALL print the notice once and return to the scope screen without opening a checklist or rendering a header
#### Scenario: All mode uses logical pipeline order
- **WHEN** the user enters the All checklist for a harness
- **THEN** the system SHALL present targets in logical pipeline order with phase separators while keeping stable prefixed values
#### Scenario: Single-family scope stays alphabetical
- **WHEN** the user selects Workers, Agents, Orchestrators, or Utilities
- **THEN** the system SHALL present exactly that family in alphabetical order with no separators
#### Scenario: All tail orders merge block then commit block before utilities
- **WHEN** the user enters the All checklist for a harness
- **THEN** the system SHALL present the sai-merge block, then the sai-commit orchestrator-plus-worker block, then the separator with utilities sai-pr, sai-retire-docs, sai-status, and sai-worktree

### Requirement: Navigable cancellation aborts customization

When the user presses `q` or Ctrl-C at any navigable surface — the post-setup menu, the harness picker, the customization scope screen, the target-selection checklist, either Claude Code model or effort screen, or any OpenCode provider, model, or variant screen — the flow SHALL cancel the current customization run without configuring any target from its current uncompleted selection or presenting any further navigable surface. It SHALL complete normally without hard-exiting the process (the configurator's non-exit contract, in contrast to the installer's caller-owned exit policy). Overrides written by earlier successful passes SHALL remain unchanged.

#### Scenario: Cancel from the post-setup menu
- **WHEN** the user presses `q` or Ctrl-C at the post-setup menu
- **THEN** customization SHALL be cancelled with no target configured from the current selection and the flow SHALL complete normally while preserving earlier successful passes

#### Scenario: Cancel from the harness picker
- **WHEN** the user presses `q` or Ctrl-C at the harness picker
- **THEN** customization SHALL be cancelled with no target configured from the current selection and the flow SHALL complete normally while preserving earlier successful passes

#### Scenario: Cancel from the scope screen or target-selection checklist
- **WHEN** the user presses `q` or Ctrl-C at the customization scope screen or at the target-selection checklist
- **THEN** customization SHALL be cancelled with no target configured from the current selection and the flow SHALL complete normally while preserving earlier successful passes

#### Scenario: Cancel during settings selection
- **WHEN** the user presses `q` or Ctrl-C at either Claude Code model or effort screen or at any OpenCode provider, model, or variant screen, or the settings selector returns no selection
- **THEN** customization SHALL be cancelled with no target configured from the current selection, no additional screen presented, and the flow SHALL complete normally while preserving earlier successful passes

### Requirement: Capability rename and archival
The `agent-customization-menu` capability SHALL be retired: its main spec SHALL move from `openspec/specs/agent-customization-menu/spec.md` to `openspec/specs/_archived/agent-customization-menu/spec.md` with its historical content preserved, and `model-customization-menu` SHALL be the active capability home for the restated requirements. The active spec tree SHALL NOT retain a capability named `agent-customization-menu`, and no content under `openspec/specs/_archived/` other than this move SHALL be created, modified, or removed. Descriptive references to the retired name inside other active specs SHALL remain unchanged and do not constitute a retained capability.

#### Scenario: Retired spec lands in the archive
- **WHEN** the change is implemented
- **THEN** `openspec/specs/agent-customization-menu/spec.md` no longer exists under the active spec tree and its historical content is preserved at `openspec/specs/_archived/agent-customization-menu/spec.md`

#### Scenario: Active home is the renamed capability
- **WHEN** the change is implemented
- **THEN** the restated requirements are active under `openspec/specs/model-customization-menu/spec.md` and under no other capability

### Requirement: Utility first-customization source root
The `materializeLocalOverride` operation SHALL resolve a `utility` target without a project-local destination to the global commands directory on both harnesses, and SHALL persist the selected settings there.

#### Scenario: Utility without local override persists from global commands
- **WHEN** a utility target without a project-local override is customized with selected settings
- **THEN** the operation SHALL write the project-local override under the harness commands directory with the selected model and tuning value and report persisted

### Requirement: Utility existing-override preservation without agent fallback
The operation SHALL patch an existing project-local utility override in place preserving body and non-tunable frontmatter, and SHALL NOT fall back to a same-named file in the global agents directory.

#### Scenario: Existing utility override is patched and decoy source is ignored
- **WHEN** a utility target has an existing project-local override or only a same-named global agents file exists
- **THEN** the operation SHALL update the local file when present and SHALL report skipped missing-source without creating a file when only the agents decoy exists

### Requirement: Missing-source and family source-root preservation
The operation SHALL still return skipped missing-source with its diagnostic and create no file when the global commands source is genuinely absent, and SHALL leave worker, agent, and command source roots unchanged.

#### Scenario: Absent source skips and other families keep their roots
- **WHEN** a utility source is genuinely absent or a worker, agent, or command target is customized
- **THEN** the utility SHALL report skipped missing-source without breaking the loop and the other families SHALL persist from their existing source roots

### Requirement: Reset to default models menu option
The post-setup flow SHALL present Reset to default models as a menu action in Post-setup customization alongside Customize models and Exit, setting mode reset and routing harness selection to the reset-targets screen with no scope screen and no settings selection.
#### Scenario: User enters reset from the post-setup menu
- **WHEN** the user selects Reset to default models at the post-setup menu
- **THEN** the flow SHALL route harness selection to the reset-targets screen without presenting scope or settings screens

### Requirement: Reset target checklist with factory settings
The reset-targets screen SHALL enumerate All targets via enumerateTargets plus buildChecklistTargets, filter to targets with an existing local override, and render the SETTING column with factorySetting plus the existing header, legend, and preventEmptyConfirm true, handling empty sets, BACK, cancellation, and non-TTY as defined.
#### Scenario: Reset checklist shows factory values for existing overrides
- **WHEN** the reset-targets screen renders with existing local overrides for the selected harness
- **THEN** each row SHALL display the factory model plus effort/variant setting with plain-text unavailable fallback and no ANSI wrappers

### Requirement: Tunable-only factory restore
The reset operation SHALL read factory tunables from the installed global source and patch only model plus effort/variant into the existing project-local file via patchFrontmatter plus atomicReplace, preserving remaining local content and reporting persisted, skipped, or persistence-failed with Post-setup customization diagnostics.
#### Scenario: Selected reset targets are restored from factory sources
- **WHEN** confirmed reset targets are processed for the selected harness
- **THEN** each target SHALL have only its tunable keys overwritten from the global source while non-tunable local content is preserved

### Requirement: Reset pass outcome and menu re-entry
A reset pass with zero persistence-failed results SHALL return to Post-setup customization while a pass with failures SHALL terminate without re-entry, with empty sets returning to harness selection, per-target skips continuing the pass, and Exit returning the final skipped/cancelled outcome.
#### Scenario: Successful reset returns to the post-setup menu
- **WHEN** a reset pass completes with no persistence failure
- **THEN** the flow SHALL re-enter the Post-setup customization menu instead of terminating

### Requirement: Closed menu input reports failure

The post-setup menu SHALL treat closed terminal input as a failure, not as a voluntary exit. When a wrapped choice resolves `INPUT_CLOSED` or a checklist resolves `input-closed`, the menu SHALL raise and report `Terminal input closed while waiting for a menu selection`, SHALL write the diagnostic through the failed-customization path, and SHALL return status `failed`.

#### Scenario: Closed input during the menu returns a reported failure

- **WHEN** terminal input closes while a post-setup menu selection is pending
- **THEN** the menu SHALL return status `failed` with a terminal-input-closed diagnostic and SHALL log that diagnostic

### Requirement: Bulk toggle model target checklists
The model-customization flow SHALL expose `Ctrl+A` on both the active customization target checklist and the reset target checklist for OpenCode and Claude Code. The first selectable checkbox SHALL be the reference; pressing `Ctrl+A` SHALL set every selectable checkbox to the opposite of that reference state, leave separator rows unchanged, keep the cursor position, redraw the checklist, and not confirm it. The visible legend SHALL include `Ctrl+A toggle all`.

#### Scenario: Mixed customization selection uses the first checkbox
- **WHEN** the user presses `Ctrl+A` in a model-customization target checklist whose first selectable checkbox is unchecked and whose other selectable rows have a mixed selection
- **THEN** every selectable target SHALL become checked, separator rows SHALL remain unchanged, and the checklist SHALL remain open

#### Scenario: A checked first checkbox clears reset targets
- **WHEN** the user presses `Ctrl+A` in a reset-target checklist whose first selectable checkbox is checked
- **THEN** every selectable target SHALL become unchecked and Enter SHALL remain blocked by the empty-selection guard until a target is selected

#### Scenario: Bulk toggle remains limited to model target checklists
- **WHEN** the user presses `Ctrl+A` in an ordinary installer checklist or a single-choice menu
- **THEN** the navigator SHALL not apply toggle-all behavior or change the selected result

### Requirement: Legacy model-only Haiku settings remain valid
The Claude Code adapter MUST distinguish selectable settings from legacy accepted settings. Existing saved or restored settings containing `model: haiku` without an `effort` field MUST remain valid, MUST preserve the omitted effort when loaded or reset, and MUST NOT be rewritten as `medium` or another effort. New menu selections of the built-in Haiku entry MUST use an explicit supported effort.
#### Scenario: Existing model-only Haiku configuration loads
- **WHEN** a saved Claude configuration or preset contains `{ model: 'haiku' }` without `effort`
- **THEN** the adapter MUST accept and materialize the model-only setting without adding an effort value
#### Scenario: Factory reset preserves model-only Haiku
- **WHEN** the installed factory source contains `model: haiku` without `effort` and a customized target is reset
- **THEN** reset MUST restore the factory content without inventing an effort or rewriting it as `medium`
#### Scenario: New Haiku selection requires effort
- **WHEN** the Claude Code selector presents the built-in `haiku` entry for a new customization pass
- **THEN** it MUST offer only `low`, `medium`, `high`, `xhigh`, and `max`
