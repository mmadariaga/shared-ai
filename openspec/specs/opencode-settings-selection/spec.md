# opencode-settings-selection Specification

## Purpose
_TBD: purpose not yet written._

## Requirements

### Requirement: Dependent provider-to-model-to-variant selection
For an OpenCode customization run with a non-empty confirmed agent subset, the OpenCode settings selector SHALL present exactly two mandatory dependent navigable single-select screens in this order: provider, then model scoped to the selected provider. The selector SHALL present one conditional variant screen after the model screen, only when the selected model exposes variants. The provider screen SHALL be offered only for the OpenCode harness; the Claude Code harness SHALL keep its own placeholder model/effort selection and SHALL NOT present a provider screen.

#### Scenario: full dependent flow resolves provider, model, and variant
- **WHEN** the user runs OpenCode customization and the selected model exposes variants
- **THEN** the selector presents the provider screen, then the model screen scoped to that provider, then the variant screen, in that order

#### Scenario: provider screen is OpenCode-specific
- **WHEN** the user runs Claude Code customization
- **THEN** no provider screen is presented and the Claude placeholder model/effort selection is used unchanged

#### Scenario: variant screen is skipped for a model without variants
- **WHEN** the selected model exposes no variants
- **THEN** the selector presents exactly the two mandatory provider and model screens and completes without a variant screen

### Requirement: Variant screen default sentinel
The variant screen SHALL offer exactly one no-variant option plus the discovered variants of the selected model. The no-variant option SHALL be represented internally by a sentinel distinct from every possible variant string and SHALL be labeled `Default (no variant)`; selecting it SHALL omit the variant from the returned settings. The screen SHALL present unique display labels backed by a display-to-value mapping, derived by a general collision-free scheme: the no-variant option uses the pinned `Default (no variant)` display label, each discovered variant initially displays as its exact identifier, and whenever a proposed display label is already used by another option, the scheme SHALL iterate — for example by repeatedly appending a disambiguating suffix, or by assigning stable numeric prefixes to every option — until every option has a distinct label. No two options SHALL ever share a display label, whatever the discovered variant identifiers, and the mapping SHALL always resolve each display label back to its exact variant identifier or to the no-variant sentinel. A discovered variant whose identifier is literally `Default`, `default`, or `Default (no variant)` SHALL remain a separate selectable option, SHALL NOT be conflated with the no-variant sentinel, and SHALL carry its exact identifier as the `variant` value.

#### Scenario: no-variant option omits the variant key
- **WHEN** the user selects the `Default (no variant)` option on the variant screen
- **THEN** the returned settings carry `model` and no `variant` key

#### Scenario: a discovered variant named Default stays selectable
- **WHEN** the selected model's discovered variants include an identifier literally spelled `Default` or `default`
- **THEN** that identifier is offered as a separate selectable option alongside `Default (no variant)` and selecting it carries that exact identifier as the `variant` value

#### Scenario: a discovered variant named Default (no variant) stays distinguishable
- **WHEN** the selected model's discovered variants include an identifier literally spelled `Default (no variant)`
- **THEN** the collision-free scheme gives that identifier a distinct display label next to the no-variant `Default (no variant)` label, and selecting it carries that exact identifier as the `variant` value

#### Scenario: display labels stay unique under identifier collisions
- **WHEN** the discovered variants include identifiers such as `Default (no variant)` and `Default (no variant) (variant)`, so that a single fixed suffix would collide with another real identifier
- **THEN** the collision-free scheme yields a distinct display label for every option, no two options share a display label, and the display-to-value mapping resolves each label to its exact identifier or to the no-variant sentinel

#### Scenario: no-variant sentinel never collides with a variant string
- **WHEN** the variant screen is rendered for a model whose discovered variants are arbitrary strings
- **THEN** the internal sentinel for the no-variant option is distinct from every discovered variant identifier, so no variant value can be mistaken for the sentinel

### Requirement: In-memory shared settings shape
The OpenCode settings selector SHALL return nullable shared settings carrying exactly the canonical opencode tunable keys: `model` with the selected model's full `provider/model-id` identity, and, when a variant other than the no-variant sentinel was selected, `variant` with the selected variant identifier. The settings SHALL NOT carry a separate provider key, SHALL NOT write any file, and SHALL NOT modify or create any agent file; when the user cancels or discovery fails, the selector SHALL return no settings (`null`). The selector SHALL NOT construct overrides: the final per-agent persistent materialization, carrying the selected agent identity and the conditional `variant` key, SHALL be performed exclusively by the per-agent local-override operation defined in `agent-customization-menu` and governed by `project-local-agent-overrides`.

#### Scenario: model value carries the full provider/model-id identity
- **WHEN** the user selects model `glm-5.2` under provider `opencode-go`
- **THEN** the returned settings' `model` value is exactly `opencode-go/glm-5.2`, the fully qualified identity the opencode agent frontmatter requires

#### Scenario: no separate provider key is included
- **WHEN** the user completes an OpenCode customization run for a model under provider `opencode-go`
- **THEN** the returned settings carry the `model` key with the full `opencode-go/...` identity and no separate `provider` key

#### Scenario: settings carry model only when variant is default
- **WHEN** the user selects a model and chooses the no-variant option
- **THEN** the returned settings carry `model` and no `variant` key

#### Scenario: settings carry model and variant when a variant is chosen
- **WHEN** the user selects a model and then chooses a named variant
- **THEN** the returned settings carry both the `model` key and the `variant` key with the chosen values

#### Scenario: the final materialization is built by the per-agent local-override operation
- **WHEN** the selector returns shared settings for a confirmed subset
- **THEN** the per-agent local-override operation SHALL materialize each selected agent with its identity, `model`, and conditional `variant` according to the project-local override capability

#### Scenario: selection completes without filesystem changes
- **WHEN** the selector returns the shared settings for a confirmed subset
- **THEN** no file is created, modified, or deleted and agent bodies and frontmatter are unchanged

### Requirement: Select-once and apply-to-all for the confirmed subset
The OpenCode settings selector SHALL run exactly once for the whole confirmed agent subset: the provider, model, and optional variant screens SHALL be presented once per customization run, and the resulting shared settings SHALL be applied to every selected agent through the per-agent local-override operation. An empty confirmed subset SHALL NOT invoke the selector.

#### Scenario: one dependent flow per customization run
- **WHEN** the agent-selection checklist confirms a non-empty subset of OpenCode agents
- **THEN** the provider, model, and optional variant screens are presented exactly once for the whole subset

#### Scenario: same settings applied to every selected agent
- **WHEN** the selector returns shared settings for a confirmed subset of two or more agents
- **THEN** every selected agent's final override carries the identical model and variant values

#### Scenario: empty subset skips the selector
- **WHEN** the agent-selection checklist confirms an empty subset
- **THEN** the OpenCode settings selector is not invoked and customization completes without configuring any agent

### Requirement: Cancellation and failure abort without settings or overrides
When the user presses `q` or Ctrl-C at any OpenCode screen, the settings selector returns no selection, or model or variant discovery fails, the OpenCode customization SHALL cancel: no agent SHALL be configured, no settings SHALL be produced, and therefore no override SHALL be produced. The run SHALL complete normally without hard-exiting the process, and SHALL NOT fall back to placeholder options.

#### Scenario: cancel at the provider screen aborts the run
- **WHEN** the user presses `q` or Ctrl-C at the provider screen
- **THEN** customization is cancelled with no agent configured and the flow completes normally

#### Scenario: cancel at the variant screen aborts the run
- **WHEN** the user presses `q` or Ctrl-C at the variant screen
- **THEN** customization is cancelled with no agent configured and the flow completes normally

#### Scenario: discovery failure produces no invalid settings or override
- **WHEN** model or variant discovery fails during the dependent flow
- **THEN** customization is cancelled with no placeholder fallback, no invalid or partial settings produced, and no override produced
