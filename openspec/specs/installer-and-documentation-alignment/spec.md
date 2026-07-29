# Installer And Documentation Alignment Specification

## Purpose
Define installer, verification, test, and documentation alignment for the routed phase architecture.

## Requirements

### Requirement: Installation and verification stop referencing a coordinator profile

The installer's managed opencode agent projection, the canonical config sample, the config-merge reporting it drives, and the doctor harness-inventory check derived from that projection SHALL contain no SAI coordinator agent entry. Doctor SHALL neither expect, report, nor remediate a missing or incompatible coordinator profile.

#### Scenario: doctor inventory omits the coordinator

- **WHEN** doctor enumerates managed opencode agents
- **THEN** the reported set SHALL contain only the managed worker agents and SHALL contain no coordinator entry

#### Scenario: install summary omits the coordinator

- **WHEN** the opencode install flow reports which agent keys it added or reused
- **THEN** it SHALL NOT name a coordinator key

### Requirement: Pre-existing user coordinator entries are left alone

Uninstall and installation SHALL NOT delete or rewrite a `sai-coordinator` entry that already exists in a user's opencode configuration, consistent with the existing config-merge exclusion that leaves opencode configuration files untouched on uninstall. No wrapper SHALL select such an entry. The entry SHALL NOT be claimed to be unconditionally inert: if the user selects it as their active primary agent, its permissions govern the invocation like any other primary agent, per the invoking-agent prerequisite in `opencode-coordinator-runtime`. The documentation SHALL tell users they may delete the leftover entry.

#### Scenario: leftover entry is not removed

- **WHEN** a user who installed a previous version runs install or uninstall after this change
- **THEN** any existing `sai-coordinator` entry in their opencode configuration SHALL be preserved as-is and SHALL NOT block installation

#### Scenario: no wrapper selects the leftover entry

- **WHEN** an opencode SAI phase command runs while a leftover `sai-coordinator` entry exists and a different primary agent is active
- **THEN** the command SHALL use its wrapper-declared model and variant and SHALL NOT activate that entry

#### Scenario: leftover entry selected as the active primary agent

- **WHEN** the user selects a leftover `sai-coordinator` entry as the active primary agent
- **THEN** its permissions SHALL govern the invocation, and the documentation SHALL state that its stale worker allowlist may deny newer numbered workers and that deleting the entry is the remedy

### Requirement: Tests reflect the shipped runtime

The repository tests covering routed design and implementation coordination, opencode installation, harness bindings, and doctor output SHALL assert the wrapper-declared coordinator runtime and the absence of a coordinator agent profile, and SHALL assert that `/sai-2-design` has no continuation branch. No test SHALL assert the presence of a coordinator agent entry or a same-prompt design-to-implementation transition.

#### Scenario: coordinator-profile assertions are gone

- **WHEN** the test suite is run after this change
- **THEN** no test SHALL assert that a coordinator agent entry exists in the opencode configuration or installer projection

#### Scenario: continuation assertions are gone

- **WHEN** the test suite is run after this change
- **THEN** no test SHALL assert a Stop-versus-Continue-now choice or an implementation dispatch originating from `/sai-2-design`

### Requirement: Documentation describes the current architecture

`README.md`, `INSTALL.opencode.md`, and `AGENTS.md` SHALL describe the opencode coordinator runtime as wrapper-declared rather than profile-based, SHALL list only the managed worker agents, SHALL state the invoking-primary-agent prerequisite (native `question` plus `task` dispatch to the numbered workers) and its remediation, SHALL tell users they may delete a leftover `sai-coordinator` entry, and SHALL describe `/sai-2-design` as ending at design completion with `/sai-3-implement` requiring a separate invocation. The ADRs that recorded the superseded decisions SHALL be marked superseded rather than deleted, and the ADR index SHALL be updated accordingly.

#### Scenario: model routing table is corrected

- **WHEN** the README model-routing table row for design (2) is read
- **THEN** it SHALL describe the opencode coordinator runtime as declared by the wrapper and SHALL NOT name a shared coordinator agent profile

#### Scenario: opencode install doc is corrected

- **WHEN** `INSTALL.opencode.md` is read
- **THEN** its managed-agent narrative and its inline configuration samples SHALL contain no coordinator agent entry

#### Scenario: superseded ADRs are marked, not removed

- **WHEN** the ADRs recording the shared coordinator profile and the design-to-implementation lifecycle continuation are read
- **THEN** each SHALL carry a superseded status pointing at this change, and `docs/adr/0000-INDEX.md` SHALL reflect that status
