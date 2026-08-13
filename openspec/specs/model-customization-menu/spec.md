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
After harness selection and before any target checklist, the flow MUST present a navigable single-select scope screen offering exactly `Workers`, `Commands`, and `Both`. Selecting `Workers` or `Commands` MUST confine the target checklist to that family; selecting `Both` MUST present the combined checklist. Stepping back from the scope screen MUST re-open the harness selector, and stepping back from the target checklist MUST re-open the scope screen.

#### Scenario: User chooses a single family
- **WHEN** the user selects `Workers` or `Commands` at the scope screen
- **THEN** the flow MUST present a target checklist of exactly that family's targets with bare names

#### Scenario: User chooses Both
- **WHEN** the user selects `Both` at the scope screen
- **THEN** the flow MUST present the combined worker and command checklist with family-qualified rows

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
The OpenCode adapter MUST derive its complete harness-specific worker set from the canonical agents-class projections in `sai/install-manifest.json` and its complete command set from the canonical commands-class projections in the same manifest, and MUST present every resulting target — including the `budget`, `explore`, and `executor` workers and the `budget` command — in the target-selection checklist. Command enumeration MUST read the package sources declared by the manifest's commands-class projections (the harness command source directory and the declared `include` pattern) rather than the installed global command directory. It MUST invoke the dependent OpenCode settings selection and local override creation as specified by the Shared settings selection requirement. For the current repository state, that derived set contains exactly 10 workers and exactly 16 commands; these counts are fixture assertions of the current repository state, not hardcoded enumerations.

#### Scenario: OpenCode customization traverses the selected registry subset
- **WHEN** OpenCode customization is selected and the checklist is confirmed
- **THEN** the adapter MUST process exactly the selected targets from the 10 distinct workers and 16 distinct commands derived from the canonical manifest projections, with no early stop or representative-target shortcut

### Requirement: Complete Claude Code traversal
The Claude Code adapter MUST derive its complete harness-specific worker set from the canonical agents-class projections in `sai/install-manifest.json` and its complete command set from the canonical commands-class projections in the same manifest, and MUST present every resulting target in the target-selection checklist. Command enumeration MUST read the package sources declared by the manifest's commands-class projections rather than the installed global command directory. It MUST invoke Claude Code settings selection and local override creation as specified by the Shared settings selection requirement. For the current repository state, that derived set contains exactly 7 workers and exactly 16 commands; these counts are fixture assertions of the current repository state, not hardcoded enumerations.

#### Scenario: Claude Code customization traverses the selected registry subset
- **WHEN** Claude Code customization is selected and the checklist is confirmed
- **THEN** the adapter MUST process exactly the selected targets from the 7 distinct workers and 16 distinct commands derived from the canonical manifest projections, with no early stop or representative-target shortcut

### Requirement: Shared settings selection
After the target-selection checklist confirms a non-empty subset and before any local override is created, the flow SHALL invoke the selected harness's settings selector exactly once for the whole confirmed subset. The collected settings choices — a model and an optional effort choice for Claude Code, and a discovered model with an optional variant for OpenCode — SHALL be applied to every selected target through the per-target local-override operation. In `Both` scope, the selector SHALL run once and the same settings SHALL be applied to every marked target across both families, with no per-family differentiation within a pass. When the checklist confirms an empty subset, the settings selector SHALL NOT be invoked and customization SHALL complete without configuring any target.

#### Scenario: Settings selector runs exactly once per customization run
- **WHEN** the target-selection checklist confirms a non-empty subset
- **THEN** the flow SHALL invoke the settings selector exactly once for the whole subset

#### Scenario: Local overrides run exactly once per selected target
- **WHEN** the settings selector has returned the shared settings choices for the confirmed subset
- **THEN** the local-override operation SHALL run exactly once per selected target

#### Scenario: Same settings applied to every selected target
- **WHEN** the settings selector returns its settings choices for a confirmed subset of two or more targets
- **THEN** every selected target's local override SHALL carry those identical settings choices, including the absence of `effort` when the chosen Claude model has no effort selector

#### Scenario: Both scope applies one settings pass across both families
- **WHEN** the confirmed subset in `Both` scope contains workers and commands and the settings selector returns its choices
- **THEN** every marked worker and command SHALL receive those identical settings choices in the single pass, with no per-family differentiation

#### Scenario: Empty subset skips the settings selector
- **WHEN** the target-selection checklist confirms an empty subset
- **THEN** the settings selector SHALL NOT be invoked

#### Scenario: Empty subset completes without configuring targets
- **WHEN** the target-selection checklist confirms an empty subset
- **THEN** customization SHALL complete without configuring any target

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
After scope selection and before per-target configuration, the flow SHALL present a navigable multi-select checklist listing every target of the chosen family — or of both families in `Both` scope — derived from the canonical manifest projections in `sai/install-manifest.json` for the chosen harness, with every target selected by default. Up/down arrows SHALL move the `>` cursor, space SHALL toggle the highlighted target's selection, and Enter SHALL confirm the selection. In a single-family scope, rows SHALL show bare target names. In `Both` scope, rows SHALL carry a type prefix showing each target's kind — `worker` for a worker and `command` for a command — immediately before its bare name (`worker: <name>` / `command: <name>`), SHALL be grouped by family — all worker rows before all command rows, each family in alphabetical order by name — and the confirmed selection SHALL carry the type-prefixed values so that a worker and a command sharing a name remain distinct targets. The flow SHALL run per-target configuration exactly for the selected targets; an empty selection SHALL complete customization without configuring any target.

#### Scenario: Checklist defaults to all targets selected
- **WHEN** the user enters the target-selection checklist for a harness and scope
- **THEN** every target of that scope SHALL be pre-selected

#### Scenario: User narrows the customization subset
- **WHEN** the user deselects one or more targets and confirms with Enter
- **THEN** per-target configuration SHALL run only for the targets remaining selected

#### Scenario: Both mode keeps same-named targets distinct
- **WHEN** the user enters the `Both` checklist for the OpenCode harness, whose worker and command sets both contain a target named `budget`
- **THEN** the checklist SHALL present `worker: budget` and `command: budget` as two distinct rows, each independently selectable, and confirmation SHALL return both as separate type-prefixed targets

#### Scenario: Both mode groups rows by family
- **WHEN** the user enters the `Both` checklist for a harness
- **THEN** every worker row SHALL precede every command row, and within each family the rows SHALL appear in alphabetical order by bare name

#### Scenario: Empty selection completes without configuring targets
- **WHEN** the user deselects every target and confirms with Enter
- **THEN** customization SHALL complete without configuring any target

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
