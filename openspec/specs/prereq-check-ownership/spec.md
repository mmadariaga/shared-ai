# prereq-check-ownership Specification

## Purpose
TBD - created by archiving change prereqs-explore-only. Update Purpose after archive.

## Requirements

### Requirement: Explore is the only command that runs the prerequisite check

`/sai-explore`, `/sai-4-review`, and `/sai-3-implement` SHALL be the only command surfaces that load `sai/policies/prereqs-check.md` or run `sai/tools/prereqs.js`. Every other command, coordinator, and worker card SHALL NOT fetch a prerequisite check, run the tool, or restate the three remediation literals. A project that never runs `/sai-explore`, `/sai-4-review`, or `/sai-3-implement` and lacks the CLI or `schema: sai-workflow` SHALL receive OpenSpec's native error or default templates, with no substitute notice.

#### Scenario: Non-explore cards run no prerequisite check
- **WHEN** the `pr` and `status` bodies, the archive and backfill cards, and the design, implement, review, security, performance, accessibility, and spec worker cards are read
- **THEN** none fetches `prereqs-check.md` or `prereqs.md` or invokes `prereqs.js`

#### Scenario: Explore keeps the check
- **WHEN** `sai/commands/explore/body.md` is read
- **THEN** it still runs the inline prerequisite preflight

#### Scenario: Review and implement coordinators keep the check

- **WHEN** `sai/commands/review/coordinator.md` or `sai/commands/implement/coordinator.md` is read
- **THEN** it fetches `sai/policies/prereqs-check.md` and runs its check in Start before any other step

### Requirement: Path table remains available without the check

`sai/policies/prereqs-paths.md` SHALL remain the artifact path table, and a card that needs the table SHALL fetch it directly under an "Artifact paths" heading. The composing entry `sai/policies/prereqs.md` SHALL NOT exist in the repository and SHALL be recorded as a retirement for both harness projections in `sai/install-manifest.json`.

#### Scenario: Card fetches the path table directly
- **WHEN** the archive coordinator, backfill coordinator, `pr` body, `status` body, or review worker needing artifact paths is read
- **THEN** it fetches `@sai/policies/prereqs-paths.md` and not `@sai/policies/prereqs.md`

#### Scenario: prereqs.md is retired
- **WHEN** the repository and install manifest are inspected
- **THEN** `sai/policies/prereqs.md` is absent and a `retired-policies-prereqs` retirement covers both the claude and opencode harnesses

### Requirement: Status allowlist and tool permissions drop prereqs.js

The `allowed-tools` of `commands/claude/sai-status.md` SHALL NOT permit `node .claude/sai/tools/prereqs.js` or `node ~/.claude/sai/tools/prereqs.js`, and `sai/policies/tool-execution-permissions.md` § Status SHALL list exactly two node tools.

#### Scenario: Status allowlist has no prereqs.js
- **WHEN** `commands/claude/sai-status.md` frontmatter is read
- **THEN** it contains the `change-picker.js` and `status.js` node entries and no `prereqs.js` entry

#### Scenario: Permissions policy counts two tools
- **WHEN** `sai/policies/tool-execution-permissions.md` § Status is read
- **THEN** it states exactly two `node` tools and does not list `prereqs.js`
