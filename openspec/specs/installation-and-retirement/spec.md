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

Installation SHALL remove exact manifest-declared retired sai-pr wrappers, cards, template, and pr.js tool, including edited copies, without transferring their tuning or instructions. Retirement SHALL support commands-class destinations and SHALL NOT delete unrelated user pr.md documents. Routing, model customization, presets, documentation, and status navigation SHALL no longer advertise sai-pr; completed status navigation SHALL point to /to-pr. Doctor SHALL remain read-only and uninstall SHALL retain its historical ownership guard.

#### Scenario: Managed legacy installation
- **WHEN** installation encounters a recognized managed sai-pr copy
- **THEN** migration removes that retired copy while installing to-pr.

#### Scenario: User documents and overrides exist
- **WHEN** retirement encounters an unrelated user pr.md and a modified legacy override at an exact retired path
- **THEN** installation preserves the user document but deletes the declared retired override without transferring its content

#### Scenario: All review and audit requirements are satisfied
- **WHEN** status navigation reaches the publication recommendation
- **THEN** the next action is `/to-pr` rather than `/sai-pr`.

### Requirement: Audit rename migration preserves role-specific tunables before cleanup

For Claude Code and opencode, audit renaming SHALL NOT clone legacy command or worker definitions or transfer their tunables or instructions. Installation SHALL delete exact declared retired paths regardless of content. Current-name destinations SHALL retain their own tuning and explicit customization suffix during managed refresh; absent global definitions SHALL receive shipped role defaults. Claude Code SHALL preserve current model and effort; opencode SHALL preserve command model#variant and agent model with optional variant. Preset-key compatibility SHALL remain separate from definition retirement.

#### Scenario: Fresh installation has no legacy files
- **WHEN** installation runs with no old or new audit files
- **THEN** it projects the new command and worker names with their shipped role defaults

#### Scenario: Upgrade carries custom role models
- **WHEN** legacy audit definitions have custom tuning and their renamed global destinations are absent
- **THEN** installation deletes retired definitions and seeds current-name destinations from shipped defaults without old-name settings transfer

#### Scenario: Renamed destination already has configuration
- **WHEN** both a legacy audit file and its renamed destination exist
- **THEN** installation preserves the destination's own model tunables rather than replacing them with the legacy values

### Requirement: Audit retirement uses managed body identity across lifecycle tools

Audit retirement declarations SHALL retain historical exact hashes, managed body hashes, and permitted tuning keys for read-only recognition and guarded uninstall. Doctor SHALL distinguish recognized copies from customized bodies, recommending reinstallation without settings or instruction transfer for either. Installation SHALL instead delete every exact declared retired regular file or file symlink without a content-identity gate or settings preparation. Guarded uninstall SHALL retain its recognition checks and preserve customized retired bodies.

#### Scenario: Only model tunables differ from a managed copy
- **WHEN** a retired audit file differs from declared managed content only in permitted tuning
- **THEN** uninstall recognizes its historical identity, while installation deletes the exact retired file without transferring its tuning

#### Scenario: Customized legacy body remains pending
- **WHEN** a retired audit file has customized instructions
- **THEN** doctor recommends installer removal without migration; installation deletes the exact file while guarded uninstall retains its customized body
