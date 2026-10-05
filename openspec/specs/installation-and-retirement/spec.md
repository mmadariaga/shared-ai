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
