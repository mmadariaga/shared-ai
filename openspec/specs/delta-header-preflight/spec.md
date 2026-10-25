# delta-header-preflight Specification

## Purpose
TBD - created by archiving change fix-backfill-delta-headers. Update Purpose after archive.

## Requirements

### Requirement: Delta headers classified per requirement by verbatim existence
Each requirement SHALL be placed by verbatim existence of its exact Requirement heading in the matching main spec, never by per-file or per-capability guess. A requirement belongs under ADDED if and only if its verbatim heading is absent from openspec/specs/<capability>/spec.md; it belongs under MODIFIED or REMOVED only when that verbatim heading is present. Verbatim is exact: case, spacing, and punctuation are significant. One capability file MAY therefore carry ADDED requirements for new headings together with MODIFIED requirements for existing headings.

#### Scenario: New heading goes under ADDED
- **WHEN** a drafted heading has no verbatim match in the matching main spec
- **THEN** the requirement is placed under the ADDED section

#### Scenario: Existing heading goes under MODIFIED
- **WHEN** a drafted heading matches a main-spec heading verbatim including case and punctuation
- **THEN** the changed requirement is placed under the MODIFIED section

#### Scenario: Near-match with different case is treated as absent
- **WHEN** a drafted heading differs from every main-spec heading only by letter case
- **THEN** the requirement is treated as absent and placed under the ADDED section

### Requirement: Deterministic header check script decides classification

The repository SHALL provide `sai/tools/check-delta-headers.js` to classify ADDED, MODIFIED, and REMOVED requirements by verbatim existence, preserve delta-dir, specs-dir, root, and json options, and skip RENAMED sections. Every correctly classified MODIFIED requirement MUST retain every original scenario name within the matching capability and requirement, without exceptions. Scenario text and order may change and new scenarios may be added. Exit 0 SHALL require correct headers and complete preservation, exit 1 SHALL identify concrete violations, and exit 2 SHALL indicate usage, IO, or incomplete comparison. The retired `--scenario-exceptions` flag SHALL be rejected as an unknown flag.

#### Scenario: ADDED duplicate fails the check
- **WHEN** an ADDED requirement already exists verbatim in the matching main spec
- **THEN** the script exits 1 with ADDED_DUPLICATE

#### Scenario: REMOVED without a match fails the check
- **WHEN** a REMOVED requirement has no matching original heading
- **THEN** the script exits 1 with REMOVED_MISSING

#### Scenario: New capability without a main spec requires ADDED
- **WHEN** a capability has no main spec
- **THEN** its requirements pass only as ADDED

#### Scenario: Changed order and content preserve scenario identities
- **WHEN** all original scenario names remain but bodies, ordering, or added scenarios differ
- **THEN** preservation succeeds

#### Scenario: Missing scenario is identified concretely
- **WHEN** any original scenario name is missing from its MODIFIED requirement
- **THEN** the script exits 1 with MODIFIED_SCENARIO_MISSING identifying the capability, requirement, and scenario without offering an exception

#### Scenario: Moving a scenario does not conceal omission
- **WHEN** a missing scenario appears elsewhere under another requirement or capability
- **THEN** the original MODIFIED requirement still fails

#### Scenario: Comparison cannot be completed
- **WHEN** a specification is unreadable, invalidly encoded, structurally ambiguous, duplicates names, lacks parseable scenarios, or contains an unterminated fence
- **THEN** the script exits 2 without claiming successful preservation

#### Scenario: Fenced examples are not structural evidence
- **WHEN** example headings appear inside fenced code
- **THEN** they do not count as real requirements or preserved scenarios

### Requirement: Backfill coordinator runs mandatory pre-write delta-header preflight

The backfill coordinator SHALL run the shared header and scenario-preservation checker on the complete verified transfer draft specs against current main specs before any repository write. Missing scenarios SHALL fail without exception approval or metadata. Exit 1 SHALL return the verbatim diagnostic to the same worker for correction without writes; exit 2 SHALL report incomplete comparison or tooling failure without writes. Corrected drafts SHALL repeat checking. A passing preflight SHALL NOT alone authorize writes: complete receiver-side OpenSpec CLI validation and accepted-input freshness checking SHALL also pass.

#### Scenario: Clean preflight proceeds to writes
- **WHEN** the temporary draft specs pass header and preservation preflight
- **THEN** the coordinator proceeds to mandatory receiver-side CLI validation, not directly to materialization

#### Scenario: Misclassified headers return to the same worker
- **WHEN** temporary drafts fail header or preservation preflight
- **THEN** the coordinator returns the verbatim report and cited headers to the same worker and writes nothing

#### Scenario: Missing scenario prevents materialization
- **WHEN** the checker reports any missing original scenario in MODIFIED
- **THEN** no draft is materialized until correction and all required checks pass

### Requirement: Header tooling stays out of install and projection surfaces
The change SHALL add only the new script under sai/tools plus the backfill and archive cards, and SHALL NOT modify the install manifest, harness projections, or installer scripts.

#### Scenario: Install surfaces untouched
- **WHEN** the staged diff is inspected for installer or projection changes
- **THEN** only the new tool script plus backfill and archive card edits are present

### Requirement: Header check script defaults its project root to the working directory

The script at `sai/tools/check-delta-headers.js` SHALL use the working directory as its project root when no `--root` option is passed, and SHALL NOT derive that root from its own installed location. An explicit `--root` SHALL take precedence over the working directory. The script SHALL NOT search parent directories for a project root, and its help text SHALL name the working directory as the default root.

#### Scenario: Default root is the working directory

- **WHEN** the script runs without `--root` from a project directory that differs from the script's location
- **THEN** it resolves the change's delta specs and the main specs under that working directory and exits 0 when every header is correctly classified

#### Scenario: Default root resolves main specs for a staged delta directory

- **WHEN** the script runs without `--root` and with `--delta-dir` pointing at a staging copy outside the project
- **THEN** it compares the staged deltas against the main specs under the working directory

#### Scenario: Explicit root wins over the working directory

- **WHEN** the script runs from an unrelated directory with `--root` naming the project
- **THEN** it resolves delta specs and main specs under the named root

#### Scenario: Subdirectory is not searched upward

- **WHEN** the script runs without `--root` from a subdirectory of the project
- **THEN** it exits 2 with its existing delta specs directory not found error

#### Scenario: Help text names the default root

- **WHEN** the script is run with `--help`
- **THEN** the `--root` line states that the default is the working directory
