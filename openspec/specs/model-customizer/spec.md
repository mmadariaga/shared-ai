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

### Requirement: OpenCode harness screen ignores the routing line

The OpenCode harness screen of the "Customize models" menu SHALL NOT offer `OpenCode passthrough` and SHALL neither read nor write the `harness:` line.

#### Scenario: OpenCode screen unchanged

- **WHEN** the user customizes rows in the OpenCode harness
- **THEN** no `OpenCode passthrough` option is offered and no `harness:` line is read or written
