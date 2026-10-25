# managed-definition-customizations Specification

## Purpose
Keep managed commands and agents updateable while preserving native tuning and explicitly delimited user instructions across installation, diagnostics, and guarded uninstall.

## Requirements

### Requirement: Managed definitions expose an exact user customization boundary

Every command wrapper, Generic Agent source, and routed-worker template for Claude Code and opencode SHALL carry the standalone comment `<!-- User customizations below this line -->`. The first standalone occurrence SHALL separate managed content from the user-owned suffix; an inline mention SHALL NOT start a suffix. Installation SHALL preserve the entire existing suffix literally, including its initial line ending, blank lines, trailing spaces, later marker text, and absent final newline. Managed content SHALL be refreshed from the current projection while preserving harness-specific tunables. Legacy active files without the marker SHALL retain only tunables; other edits SHALL be replaced without backup. Splitting and suffix preservation SHALL be centralized in `bin/managed-customizations.js`.

#### Scenario: Suffix survives managed refresh
- **WHEN** a managed command or agent has obsolete instructions and a delimited user suffix
- **THEN** installation replaces managed instructions while preserving every byte after the first standalone marker

#### Scenario: Legacy unmarked definition is replaced
- **WHEN** an active definition has obsolete instructions but no standalone marker
- **THEN** refresh retains only tuning and writes the current managed definition and marker without backing up old instructions

#### Scenario: Inline marker is not a boundary
- **WHEN** a definition mentions the comment only within a line of prose
- **THEN** that mention does not preserve the old body as user-owned suffix text

#### Scenario: Repeated refresh is stable
- **WHEN** a definition has already been refreshed and its suffix includes CRLF, blank lines, a later marker, or no final newline
- **THEN** reinstallation preserves that exact suffix again

### Requirement: Refresh preserves harness-native tuning

Current-name refresh SHALL preserve model and effort for Claude Code and model with optional variant for opencode. Opencode commands SHALL use model#variant notation; agents SHALL keep separate model and optional variant fields. Legacy commands with separate model and variant SHALL be normalized without losing their selection. Agent refresh SHALL preserve structured model blocks and intentional optional-tunable absence using the existing top-level structural anchor. It SHALL NOT transfer settings from retired definitions.

#### Scenario: Claude settings survive
- **WHEN** a Claude Code managed definition has custom model and effort
- **THEN** refresh retains those settings while updating managed content

#### Scenario: Command variant is normalized
- **WHEN** an opencode command has separate model and variant fields
- **THEN** refresh preserves their values as model#variant and removes the separate command variant field

#### Scenario: Optional agent tuning remains absent
- **WHEN** an existing agent omits optional effort or variant
- **THEN** refresh retains the omission rather than inserting the shipped value

### Requirement: Doctor and uninstall respect different customization boundaries

Doctor SHALL compare managed commands and existing local commands and agents to manifest-projected content, ignoring tuning and the explicit user suffix. Stale managed content SHALL be an error with installer or named-project setup remediation. Guarded uninstall SHALL ignore tunable differences but retain custom instruction suffixes and other body differences. Exact retired-path installer cleanup SHALL NOT weaken guarded uninstall. Global opencode configuration agent-map entries SHALL remain outside installer ownership.

#### Scenario: Customization is not managed drift
- **WHEN** a definition differs only in tuning and its explicit user suffix
- **THEN** doctor accepts the managed content as current

#### Scenario: Stale local content is diagnosed
- **WHEN** an existing local managed definition has an obsolete managed body
- **THEN** doctor reports an error naming it with project refresh remediation

#### Scenario: Tuned command is removable
- **WHEN** a current managed command differs from source only in tuning
- **THEN** guarded uninstall recognizes it as removable

#### Scenario: Custom instructions survive uninstall
- **WHEN** a current command or agent has custom suffix instructions or other body differences
- **THEN** guarded uninstall retains that definition

#### Scenario: Global configuration ownership remains unchanged
- **WHEN** installation or uninstall encounters global opencode agent-map entries
- **THEN** this change leaves those entries outside installer ownership
