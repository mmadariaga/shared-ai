# per-command-tool-scoping Specification

## Purpose

Scope tool access for command wrappers: which tools each surface may grant, from read-only Explore to the writing goal-driven coordinators.

## Requirements

### Requirement: Routed coordinator scope follows the coordinator contract

The seven routed planning, implementation, review, and audit command wrappers (Spec, Design, Implement, Review, Security, Performance, and Accessibility) SHALL receive the canonical profile-derived pre-approvals their goal-driven coordinator contracts require. Because these coordinators write their own artifacts and reports, run the mechanical checks, and execute their local commits themselves, their profiles (`implement-command` and the profiles that extend it, and `audit-command` and the profiles that extend it, in `sai/install-manifest.json`) SHALL grant native write and unrestricted shell access together with read, search, skill, interaction, dispatch, panel, and messaging access, and SHALL delegate only to the workers and helpers their contracts name. Command access SHALL be checked independently of worker access. Explore SHALL receive its own profile-derived research and scoped execution pre-approvals, including contracted CodeGraph access. Claude allowed-tools SHALL be described as pre-approval rather than an enforced exclusion of unlisted tools. Opencode SHALL retain its active primary agent without a command-local permission field.

#### Scenario: All seven routed coordinators receive their contracted tools
- **WHEN** Claude wrappers for Spec, Design, Implement, Review, Security, Performance, and Accessibility are inspected after projection
- **THEN** each declares its contracted profile-derived scope and command access check without a separate research-availability probe duty

#### Scenario: Write and shell access follow the profile
- **WHEN** any of these seven wrappers' allowed-tools lists is inspected after projection
- **THEN** it contains Edit, Write, and an unrestricted shell pre-approval, because its profile declares `write: true` and `shell: ["*"]`
- **AND** its delegation pre-approvals name only the workers and helpers listed in its profile's `delegate`

#### Scenario: Existing read-scoped commands do not change
- **WHEN** capability projection is applied
- **THEN** Explore and Status preserve their existing command operations with generated pre-approvals and opencode still declares no command permission field

### Requirement: Read-only scoping preserves sai-explore's non-writing operations

Required access SHALL preserve delegation, artifact and instruction reads, OpenSpec CLI reads, option-pickers, skills, and research-subagent dispatch on Claude Code and opencode. Discovery SHALL remain delegated to the explorer; granting direct CodeGraph access SHALL NOT itself assign principal discovery or availability-probe duties. Profile grant scope SHALL remain distinct from operation authorization, and broader wildcard coverage SHALL NOT authorize off-contract operations. The interactive command SHALL NOT be replaced with a read-only child to obtain apparent enforcement.

#### Scenario: Non-writing paths survive the restriction
- **WHEN** Explore runs with its required effective access on a supported harness
- **THEN** it can delegate discovery, read instructions and artifacts, run OpenSpec reads, and present pickers while retaining its contract-owned non-writing boundary without claiming unlisted tools are unavailable

### Requirement: Claude Code sai-explore is scoped via allowed-tools with a transfer-directory write

The Claude Explore wrapper SHALL project canonical pre-approvals covering reading, searching, interaction, skills, web research, CodeGraph, delegation, scoped shell operations for openspec, git, and Node tools under both installed SAI roots, and the native file-write tools that the `explore-command` profile's write grant projects for the block and verdicts files of a `Ready to Propose` registration, amendment, or check. It SHALL exclude bare unrestricted shell pre-approvals. Its non-writing boundary for repository files SHALL remain contract-owned: the write grant serves only the private `transfer.js` directory under the SAI temp root, and allowed-tools pre-approves selected operations but does not deny all unlisted tools or override inherited native permission restrictions.

#### Scenario: Write is limited to the transfer-directory block write
- **WHEN** projected Explore frontmatter is inspected
- **THEN** allowed-tools is present with `Write` for the transfer-directory block write and without bare unrestricted shell entries, contracted CodeGraph access is included, and the Explore instructions confine every write to the private transfer directory outside the repository

#### Scenario: openspec CLI reads keep working under the scoped shell
- **WHEN** Explore through its OpenSpec skill runs openspec list --json with effective native access
- **THEN** the projected openspec shell pre-approval covers the call without a research-availability probe prerequisite

#### Scenario: Required read tools are positively present
- **WHEN** projected Explore frontmatter is inspected
- **THEN** its pre-approvals include Read, Glob, Grep, and scoped openspec and git shell access
