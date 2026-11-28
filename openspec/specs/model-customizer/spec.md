# model-customizer Specification

## Purpose
TBD - created by archiving change fix-opencode-model-variant-frontmatter. Update Purpose after archive.

## Requirements

### Requirement: Migrating frontmatter writer

The customization writer MUST accept an earlier combined `model#variant` value for an OpenCode agent and MUST write the selected agent's bare `model` and optional separate `variant` lines. It MUST remove residual top-level variant lines before writing the selected variant, so the output contains at most one such line. OpenCode command customization MUST continue to write the combined model-with-variant form. Claude Code customization MUST retain its existing model and effort format.

#### Scenario: Writer migrates legacy file

- **WHEN** an OpenCode agent with an earlier combined model value is selected for customization with a model and variant
- **THEN** its selected local file holds a bare model line and exactly one separate variant line, with no variant suffix in the model

#### Scenario: Command writer retains its format

- **WHEN** an OpenCode command is selected for customization with a model and variant
- **THEN** its model line retains the combined model-with-variant form rather than gaining a separate variant line

### Requirement: Migrating frontmatter reader

The customization settings reader MUST interpret both earlier combined `model#variant` values and separate `model` and `variant` lines as a logical model and variant selection. It MUST preserve the selected values when reporting the effective setting.

#### Scenario: Reader accepts both shapes

- **WHEN** the customizer reads an OpenCode agent with either a combined model value or separate model and variant fields
- **THEN** it resolves the intended model and variant values for the effective setting

### Requirement: Bare model for variant-less selection

An OpenCode agent customization that selects no variant MUST write a bare model line without a suffix and MUST remove any previous top-level variant line. OpenCode commands without a variant MUST retain their existing bare-model behavior.

#### Scenario: Variant-less write stays bare

- **WHEN** a model without a variant is persisted to an OpenCode agent or command markdown file
- **THEN** the file holds a bare model line with no suffix and no variant line

#### Scenario: Variant-less agent write removes an earlier variant

- **WHEN** an OpenCode agent with an existing variant is customized with a model and no selected variant
- **THEN** its selected local file contains the new bare model and no top-level variant line

### Requirement: Tunable identity across shapes

Doctor and tunable-seed comparison SHALL treat the single-line and legacy separated shapes as the same tunable, ignoring the physical difference when deciding body identity.

#### Scenario: Doctor ignores tunable shape

- **WHEN** an installed file differs from its source only in tunable lines across either shape
- **THEN** the comparison reports an exact-compatible tunable-only difference

### Requirement: OpenCode passthrough option for agent-file rows

In the Claude Code harness of the "Customize models" menu, the model selection SHALL offer `OpenCode passthrough` as its first option when at least one selected row is an agent file (an AGENT or WORKER row). It SHALL NOT offer the option when every selected row is an ORCHESTRATOR or UTILITY row. In a selection that mixes agent-file rows and other rows, choosing the option SHALL apply only to the agent-file rows; the other rows SHALL keep their current setting and a warning SHALL name them. The Claude Code adapter MUST refuse to route a target that is not an agent file.

#### Scenario: Option offered for agent rows only

- **WHEN** the user selects only ORCHESTRATOR or UTILITY rows in the Claude Code harness
- **THEN** the model selection does not offer `OpenCode passthrough`

#### Scenario: Option listed first for an agent row

- **WHEN** the selection in the Claude Code harness includes at least one AGENT or WORKER row
- **THEN** the model selection lists `OpenCode passthrough` before the Claude models

#### Scenario: Mixed selection routes only agent rows

- **WHEN** the user chooses `OpenCode passthrough` for a selection that mixes agent rows and command rows
- **THEN** only the agent rows receive the `harness: opencode` line and a warning names the command rows that keep their setting

### Requirement: OpenCode passthrough writes only the routing line

Choosing `OpenCode passthrough` SHALL write `harness: opencode` in the target's project-local Claude Code agent file and SHALL leave its `model` and `effort` lines unchanged, as the fallback model of the runtime. It SHALL NOT edit OpenCode configuration. After the apply, setup SHALL check the `opencode` binary and the same-named OpenCode agent once for all written targets, through the check exported by `sai/tools/opencode-dispatch.js`; when a piece is missing, the line SHALL stay written and a warning SHALL name the agent and the missing piece.

#### Scenario: Passthrough keeps the fallback model

- **WHEN** the user chooses `OpenCode passthrough` for an agent row whose agent file has `model` and `effort` lines
- **THEN** the project-local agent file gains `harness: opencode` and keeps the same `model` and `effort` lines

#### Scenario: Missing opencode warns without blocking

- **WHEN** the user chooses `OpenCode passthrough` and the `opencode` binary or the same-named OpenCode agent is missing
- **THEN** the `harness: opencode` line is written and a warning names the agent and the missing piece

### Requirement: Claude model choice and reset remove the routing line

Choosing a Claude model on a routed agent row SHALL write its `model` and `effort` lines and SHALL remove the `harness:` line. "Reset to default models" SHALL remove the `harness:` line of a Claude Code agent file, because the factory definition carries none.

#### Scenario: Claude model removes the routing

- **WHEN** the user chooses a Claude model and effort for an agent row whose file carries `harness: opencode`
- **THEN** the file holds the chosen `model` and `effort` and no `harness:` line

#### Scenario: Reset removes the routing

- **WHEN** the user runs "Reset to default models" on a Claude Code agent row whose file carries `harness: opencode`
- **THEN** the file returns to the factory settings with no `harness:` line

### Requirement: Passthrough row display

On a routed agent row of the Claude Code harness, the SETTING column SHALL show `-> opencode: <model> (<variant>)`, read when the menu draws from the same-named OpenCode agent file (the project file first, then the OpenCode global root). When that file cannot be read, the column SHALL show `-> opencode: (unresolved)`.

#### Scenario: Routed row shows the OpenCode model

- **WHEN** a Claude Code agent row is routed and the same-named OpenCode agent file declares a model and variant
- **THEN** the SETTING column shows `-> opencode:` followed by that model and variant

#### Scenario: Unreadable OpenCode agent shows unresolved

- **WHEN** a Claude Code agent row is routed and no same-named OpenCode agent file can be read
- **THEN** the SETTING column shows `-> opencode: (unresolved)`

### Requirement: Claude Code passthrough option for opencode worker rows

In the opencode harness of the "Customize models" menu, the provider selection SHALL offer `Claude Code passthrough` as its first option when at least one selected row is a WORKER file. It SHALL NOT offer the option when every selected row is an AGENT, ORCHESTRATOR, or UTILITY row. In a selection that mixes worker files and other rows, choosing the option SHALL apply only to the worker files; the other rows SHALL keep their current setting and a warning SHALL name them. The opencode adapter SHALL refuse to route a target that is not a worker file. Choosing the option SHALL write `harness: claude` in the target's project-local opencode agent file and SHALL leave its `model` and `variant` lines unchanged, as inert values while the worker runs through Claude Code. After the apply, setup SHALL check the `claude` command, its signed-in session, and the same-named Claude Code agent once for all written targets, through the check exported by `sai/tools/claude-dispatch.js`; when a piece is missing, the line SHALL stay written and a warning SHALL name the worker and the missing piece.

#### Scenario: Option offered for worker rows only

- **WHEN** the user selects only AGENT, ORCHESTRATOR, or UTILITY rows in the opencode harness
- **THEN** the provider selection does not offer `Claude Code passthrough`

#### Scenario: Option listed first for a worker row

- **WHEN** the selection in the opencode harness includes at least one WORKER row
- **THEN** the provider selection lists `Claude Code passthrough` before the discovered providers

#### Scenario: Mixed selection routes only worker rows

- **WHEN** the user chooses `Claude Code passthrough` for a selection that mixes worker files and agent rows
- **THEN** only the worker files receive the `harness: claude` line and a warning names the rows that keep their setting

#### Scenario: Passthrough keeps the opencode tuning

- **WHEN** the user chooses `Claude Code passthrough` for a worker file whose opencode agent file has `model` and `variant` lines
- **THEN** the project-local agent file gains `harness: claude` and keeps the same `model` and `variant` lines

#### Scenario: Missing Claude Code warns without blocking

- **WHEN** the user chooses `Claude Code passthrough` and the `claude` command, its signed-in session, or the same-named Claude Code agent file is missing
- **THEN** the `harness: claude` line is written and a warning names the worker and the missing piece

### Requirement: OpenCode model choice, reset, and preset manage the routing line

Choosing an opencode model and optional variant on a routed opencode worker SHALL write those lines and SHALL remove the `harness:` line. "Reset to default models" SHALL remove the `harness:` line of an opencode worker file, because the factory definition carries none. "Save preset" SHALL record for each opencode worker whether it is routed (`"harness": "claude"`, or `null` when it is not), and "Load preset" SHALL write or remove the line from that value; an entry of an older preset without the value SHALL leave the line as it is.

#### Scenario: OpenCode model removes the routing

- **WHEN** the user chooses an opencode model and variant for a worker file whose file carries `harness: claude`
- **THEN** the file holds the chosen `model` and `variant` and no `harness:` line

#### Scenario: Reset removes the routing

- **WHEN** the user runs "Reset to default models" on an opencode worker file whose file carries `harness: claude`
- **THEN** the file returns to the factory settings with no `harness:` line

#### Scenario: Save records the route state

- **WHEN** the user saves a preset while an opencode worker is routed or not routed
- **THEN** the preset records `"harness": "claude"` for the routed worker and `null` for the unrouted one

#### Scenario: Load writes or removes the route

- **WHEN** the user loads a preset whose opencode worker entry carries `"harness": "claude"` or `null`
- **THEN** the worker's project-local file gains or loses the `harness:` line accordingly

#### Scenario: An older preset keeps the route

- **WHEN** the user loads a preset whose opencode worker entry carries no `harness` value
- **THEN** the worker's current `harness:` line stays as it is

### Requirement: Claude passthrough row display

On a routed opencode worker row, the SETTING column SHALL show `-> claude: anthropic/<model> (<effort>)`, read from the same-named Claude Code agent file (the project file first, then the Claude Code global root). When that file cannot be read, the column SHALL show `-> claude: (unresolved)`.

#### Scenario: Routed opencode row shows the Claude Code model

- **WHEN** an opencode worker row is routed and the same-named Claude Code agent file declares a model and effort
- **THEN** the SETTING column shows `-> claude:` followed by that model and effort

#### Scenario: Unreadable Claude Code agent shows unresolved

- **WHEN** an opencode worker row is routed and no same-named Claude Code agent file can be read
- **THEN** the SETTING column shows `-> claude: (unresolved)`

### Requirement: Claude passthrough apply states the effective model

After a Claude Code passthrough apply persists at least one opencode worker, setup SHALL print one line per routed worker stating that it runs through Claude Code, that its opencode model and variant are inert, and that the model and effort of its Claude Code agent file apply.

#### Scenario: Apply prints the effective model notice

- **WHEN** a Claude Code passthrough apply persists one or more opencode workers
- **THEN** setup prints one line per routed worker naming the worker, the inert opencode tuning, and the effective Claude Code model and effort

### Requirement: OpenCode harness screen offers the inverse route

The opencode harness screen of the "Customize models" menu SHALL NOT offer `OpenCode passthrough`. It SHALL offer `Claude Code passthrough` for selected worker rows, SHALL read the `harness: claude` line of an opencode worker file to display the route, and SHALL write or remove that line only for eligible worker rows.

#### Scenario: OpenCode screen offers only the inverse route

- **WHEN** the opencode harness screen renders its provider selection for a worker selection
- **THEN** it offers `Claude Code passthrough` and never `OpenCode passthrough`

#### Scenario: OpenCode screen reads the routing line

- **WHEN** an opencode worker file carries `harness: claude`
- **THEN** the SETTING column shows the `-> claude:` form for that worker

#### Scenario: Non-worker rows carry no routing line

- **WHEN** the selection contains AGENT, ORCHESTRATOR, or UTILITY rows
- **THEN** no `harness: claude` line is written for them
