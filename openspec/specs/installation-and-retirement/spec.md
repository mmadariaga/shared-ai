# installation-and-retirement Specification

## Purpose
Install the universal publication workflow for both supported harnesses and retire managed legacy sai-pr surfaces while preserving user documents and overrides.

## Requirements

### Requirement: Install universal to-pr for both harnesses

The installer SHALL project the universal to-pr skill, description format, provider registry, provider instructions, common tool, provider adapters, and invocation wrapper for both Claude Code and OpenCode. Invocation wrappers SHALL load the active harness's project-local skill before its user-global skill. The skill SHALL remain usable without OpenSpec.

#### Scenario: Install either supported harness
- **WHEN** installation runs for Claude Code or OpenCode
- **THEN** the harness receives the to-pr wrapper, skill, references, and common and provider tools.

### Requirement: Retire managed sai-pr without deleting user documents

Installation SHALL retire recognized managed sai-pr wrappers, command cards, template, and pr.js tool through manifest migration. Retirement SHALL support commands-class destinations, preserve modified overrides, and SHALL NOT delete existing user pr.md documents. Current command routing, model customization, presets, documentation, and status navigation SHALL no longer advertise sai-pr; completed status navigation SHALL point to `/to-pr`.

#### Scenario: Managed legacy installation
- **WHEN** installation encounters a recognized managed sai-pr copy
- **THEN** migration removes that retired copy while installing to-pr.

#### Scenario: User documents and overrides exist
- **WHEN** retirement encounters an existing user pr.md or a modified legacy override
- **THEN** it preserves those files.

#### Scenario: All review and audit requirements are satisfied
- **WHEN** status navigation reaches the publication recommendation
- **THEN** the next action is `/to-pr` rather than `/sai-pr`.

### Requirement: Audit rename migration preserves role-specific tunables before cleanup

For both Claude Code and opencode, installation SHALL prepare renamed audit commands and workers before cleaning up retired names. If the renamed destination is absent and the legacy file exists, preparation SHALL seed the destination from that file with its audit name replaced. If the destination already exists, its own configuration SHALL take precedence. Current managed command content SHALL preserve the destination's model tunables; workers SHALL retain the existing tunable-seed lifecycle. Claude Code SHALL preserve model and effort; opencode SHALL preserve command model/variant notation and worker model plus optional variant.

#### Scenario: Fresh installation has no legacy files
- **WHEN** installation runs with no old or new audit files
- **THEN** it projects the new command and worker names with their shipped role defaults

#### Scenario: Upgrade carries custom role models
- **WHEN** legacy audit commands and workers have custom model tunables and the corresponding renamed destinations are absent
- **THEN** installation transfers each audit's tunables to that same audit's new name before removing any recognized retired copy

#### Scenario: Renamed destination already has configuration
- **WHEN** both a legacy audit file and its renamed destination exist
- **THEN** installation preserves the destination's own model tunables rather than replacing them with the legacy values

### Requirement: Audit retirement uses managed body identity across lifecycle tools

Installation cleanup, doctor inventory, and uninstallation SHALL share retirement recognition. They SHALL recognize an exact managed hash or a declared managed body hash after stripping only the declared model, effort, or variant tunable lines. Installation and uninstallation SHALL remove recognized legacy audit commands and workers. A legacy file with customized instructions or non-tunable content SHALL remain on disk rather than being deleted or treated as completely migrated. Retirement declarations SHALL validate and project the body hashes and permitted tunable keys.

#### Scenario: Only model tunables differ from a managed copy
- **WHEN** a retired audit file differs from a declared managed body only in its permitted tunable lines
- **THEN** installation cleanup and uninstallation both recognize it as removable after installation's settings preparation

#### Scenario: Customized legacy body remains pending
- **WHEN** a retired audit file contains user-owned instruction changes
- **THEN** installation preserves it and reports its exact path as pending resolution, and uninstallation preserves it as an override
