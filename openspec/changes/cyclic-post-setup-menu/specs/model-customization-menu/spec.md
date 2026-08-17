## ADDED Requirements

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
When a persistence-failed pass also contains skipped targets, their names SHALL intentionally remain omitted from the `persistence-failed` record because the ordered diagnostics already convey those skips; this preserves the existing outcome asymmetry.
The customization flow SHALL retain these observable outcomes: `completed` for a pass whose selected-target operations have no persistence failure, including passes with skipped targets, with skipped-target names and diagnostics when applicable; `skipped` with reason `cancelled`, `settings-unavailable`, or `non-tty` for normal cancellation, unavailable settings, or no TTY; and `persistence-failed` with failure diagnostics when any selected-target operation fails to persist. A successful pass record SHALL contain `status: completed`, `skippedAgents: string[]`, and `diagnostics: string[]`; a persistence-failed pass record SHALL contain `status: persistence-failed`, `failedAgents: string[]`, and `diagnostics: string[]`; a terminal skipped result SHALL contain `status: skipped` and one of the stated reasons. The diagnostics array SHALL retain confirmed target operation order. Each selected target SHALL contribute at most one diagnostic string: persisted targets contribute none, skipped targets contribute `Skipped <name>: installed source is unavailable.`, and failed targets contribute the operation's returned diagnostic string. The local-override operation SHALL classify its result as `persisted`, `skipped`, or `persistence-failed` with a diagnostic string for the latter; an unexpected exception SHALL stop the current flow and propagate through the existing setup catch as `post-setup-failure`, with a non-zero process exit code and no requirement to attempt later targets or render a per-pass diagnostic list. When one selected-target operation reports a persistence failure, the remaining selected-target operations SHALL still be attempted once, after which the pass SHALL report `persistence-failed` and SHALL NOT re-enter the menu. `runPostSetupMenu` SHALL print each materialization pass's produced diagnostic string exactly once at the end of that pass, in selected-target operation order, by rendering it with the existing `Post-setup customization: <diagnostic>` presentation; a pass with no diagnostics SHALL emit none. Setup orchestration SHALL only map the final outcome to the process exit code and SHALL not print those diagnostics a second time. After the menu exits, setup SHALL return process exit code 0 for completed successful passes, cancellation, settings unavailability, and non-TTY operation, including `Exit` before any pass, and SHALL return a non-zero process exit code for persistence failure. Earlier successful passes SHALL remain persisted when a later pass cancels or fails; the cycle SHALL provide no rollback or transactional semantics across passes.

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

## MODIFIED Requirements

### Requirement: Shared settings selection
After the target-selection checklist confirms a non-empty subset and before any local override is created, the flow SHALL invoke the selected harness's settings selector exactly once for the whole confirmed subset in that customization pass. A settings-screen Back result SHALL return to the target checklist without materializing; q/Ctrl-C cancellation SHALL end the flow with reason `cancelled`; and an empty catalog, no usable catalog entries, command/query failure, malformed catalog, invalid selected model, or invalid selected optional value SHALL end the flow with reason `settings-unavailable`. For Claude, a non-empty model plus an absent effort is valid when that model has no effort selector, while an effort is valid only when offered by the selected catalog entry. For OpenCode, a non-empty provider/model identity plus an absent variant is valid, while a variant is valid only when returned for that model. The collected settings choices — a model and an optional effort choice for Claude Code, and a discovered model with an optional variant for OpenCode — SHALL be passed to the per-target local-override operation once for every selected target. A per-target skipped result means the operation was attempted but its source was unavailable; it SHALL not be treated as a settings-selector failure or prevent later targets from being attempted. In `Both` scope, the selector SHALL run once and the same settings SHALL be passed to every marked target across both families, with no per-family differentiation within a pass. Because the model-customization checklist rejects empty confirmation, the settings selector SHALL never be invoked for an empty selection.

#### Scenario: Settings selector runs exactly once per customization pass
- **WHEN** the target-selection checklist confirms a non-empty subset
- **THEN** the flow SHALL invoke the settings selector exactly once for that customization pass

#### Scenario: Local overrides run exactly once per selected target
- **WHEN** the settings selector has returned the shared settings choices for the confirmed subset
- **THEN** the local-override operation SHALL be attempted exactly once per selected target, including targets that ultimately report a non-fatal skip

#### Scenario: Same settings applied to every selected target
- **WHEN** the settings selector returns its settings choices for a confirmed subset of two or more targets
- **THEN** every selected target's local override SHALL carry those identical settings choices, including the absence of `effort` when the chosen Claude model has no effort selector

#### Scenario: Both scope applies one settings pass across both families
- **WHEN** the confirmed subset in `Both` scope contains workers and commands and the settings selector returns its choices
- **THEN** every marked worker and command SHALL receive those identical settings choices in the single pass, with no per-family differentiation

#### Scenario: Empty confirmation never reaches settings
- **WHEN** the user attempts to confirm an empty model-customization checklist
- **THEN** the checklist SHALL remain open and the settings selector SHALL NOT be invoked

### Requirement: Navigable target-selection checklist
The empty-enumeration notice SHALL read `No customization targets are available for the selected scope.`
After scope selection and before per-target configuration, the flow SHALL present a navigable multi-select checklist listing every target of the chosen family — or of both families in `Both` scope — derived from the canonical manifest projections in `sai/install-manifest.json` for the chosen harness, with every target selected by default when at least one target exists. Up/down arrows SHALL move the `>` cursor, space SHALL toggle the highlighted target's selection, and Enter SHALL confirm the selection only when at least one target is marked. In a single-family scope, rows SHALL show bare target names in alphabetical order. In `Both` scope, rows SHALL carry a type prefix showing each target's kind — `worker` for a worker and `command` for a command — immediately before its bare name (`worker: <name>` / `command: <name>`), SHALL be grouped by family — all worker rows before all command rows, each family in alphabetical order by name — and the confirmed selection SHALL carry the type-prefixed values so that a worker and a command sharing a name remain distinct targets. The flow SHALL run per-target configuration exactly for the selected targets in checklist order, and SHALL preserve that order for diagnostics. If the adapter enumerates no targets, it SHALL show a notice and return to the scope screen instead of presenting a zero-row checklist.

#### Scenario: Checklist defaults to all targets selected
- **WHEN** the user enters the target-selection checklist for a harness and scope with one or more targets
- **THEN** every target of that scope SHALL be pre-selected

#### Scenario: User narrows the customization subset
- **WHEN** the user deselects one or more targets and confirms with Enter while at least one target remains selected
- **THEN** per-target configuration SHALL run only for the targets remaining selected

#### Scenario: Both mode keeps same-named targets distinct
- **WHEN** the user enters the `Both` checklist for a harness whose worker and command sets both contain the same bare target name
- **THEN** the checklist SHALL present `worker: <name>` and `command: <name>` as two distinct rows, each independently selectable, and confirmation SHALL return both as separate type-prefixed targets

#### Scenario: Both mode groups rows by family
- **WHEN** the user enters the `Both` checklist for a harness
- **THEN** every worker row SHALL precede every command row, and within each family the rows SHALL appear in alphabetical order by bare name

#### Scenario: Empty selection remains on the checklist
- **WHEN** the user deselects every target and presses Enter
- **THEN** the navigator SHALL refuse confirmation, the checklist SHALL remain open, and no settings or target configuration SHALL run until the user marks a target or navigates back or cancels

#### Scenario: Empty target enumeration returns to scope
- **WHEN** the selected adapter enumerates no targets for the chosen scope
- **THEN** the flow SHALL show a notice and return to the scope screen without rendering a zero-row checklist or waiting for an Enter that cannot confirm

## REMOVED Requirements

<!-- No requirements are removed. -->

## RENAMED Requirements

<!-- No requirements are renamed. -->
