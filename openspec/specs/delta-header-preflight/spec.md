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

The repository SHALL provide a deterministic script at `sai/tools/check-delta-headers.js` that decides every ADDED, MODIFIED, and REMOVED header by verbatim existence, never by inference. It SHALL preserve the existing delta-dir, specs-dir, root, and json options and skip RENAMED sections. For each correctly classified MODIFIED requirement, it SHALL compare the existing scenario names in the matching capability and requirement against the draft. Existing names MUST remain in that requirement unless an applicable exact removal or rename exception is supplied. New scenarios and changes to scenario order or body text SHALL be permitted. The script SHALL exit 0 only when both header classification and scenario preservation pass, exit 1 with concrete header or scenario violations, and exit 2 for usage, IO, invalid exception metadata, or a comparison that cannot complete.

#### Scenario: ADDED duplicate fails the check
- **WHEN** an ADDED heading already exists verbatim in the matching main spec
- **THEN** the script reports an ADDED_DUPLICATE violation and exits 1

#### Scenario: REMOVED without a match fails the check
- **WHEN** a REMOVED heading has no verbatim match in the matching main spec
- **THEN** the script reports a REMOVED_MISSING violation and exits 1

#### Scenario: New capability without a main spec requires ADDED
- **WHEN** a capability has no matching main spec file
- **THEN** every requirement of that capability passes only under the ADDED section

#### Scenario: Changed order and content preserve scenario identities
- **WHEN** a MODIFIED requirement retains all existing scenario names but changes their order or text or adds new scenarios
- **THEN** scenario preservation passes without requiring exceptions

#### Scenario: Missing scenario is identified concretely
- **WHEN** a MODIFIED requirement omits an existing scenario without an applicable exception
- **THEN** the script exits 1 and identifies the capability, requirement, and missing scenario as MODIFIED_SCENARIO_MISSING

#### Scenario: Moving a scenario does not conceal omission
- **WHEN** an existing scenario is absent from its original MODIFIED requirement but appears under another requirement or capability
- **THEN** the script reports the omission from the original requirement

#### Scenario: Comparison cannot be completed
- **WHEN** a compared specification is unreadable or has invalid encoding, ambiguous requirement or scenario headings, duplicate scenario names, absent or unparseable scenario headings in a compared requirement, or an unterminated fenced block
- **THEN** the script exits 2 without declaring scenario preservation successful

#### Scenario: Fenced examples are not structural evidence
- **WHEN** a fenced code example contains requirement or scenario headings
- **THEN** those example headings do not count as real requirements or preserved scenarios

### Requirement: Backfill coordinator runs mandatory pre-write delta-header preflight

The backfill coordinator SHALL run the deterministic header and scenario-preservation script as a mandatory pre-write check before writing anything, directly on the worker's verified transfer files under `<transfer-dir>/specs`, with the confirmed change name and no staging copy. It SHALL independently approve each proposed scenario exception against explicit accepted scope before supplying its temporary metadata to the checker. Exit 0 permits validated writes; exit 1 SHALL write nothing into the change directory and continue the same worker with the verbatim report and applicable classification or preservation rule; exit 2 SHALL write nothing and report the incomplete check or tooling failure verbatim. Corrected drafts SHALL pass the same check again.

#### Scenario: Clean preflight proceeds to writes
- **WHEN** the draft specs in the transfer directory exit the header script with 0
- **THEN** the coordinator proceeds to validated writes

#### Scenario: Misclassified headers return to the same worker
- **WHEN** the draft specs in the transfer directory exit the header script with 1
- **THEN** the coordinator writes nothing and continues the same worker with the verbatim report and cited headers

#### Scenario: Missing scenario prevents materialization
- **WHEN** the checker reports unapproved scenario loss in temporary drafts
- **THEN** the coordinator returns the report to the same worker and writes no change artifact before corrected drafts pass

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

### Requirement: Scenario exceptions are exact and locally applicable

The checker SHALL accept `--scenario-exceptions <temporary-json-file>` containing a JSON array. Each exception MUST identify exact `capability`, `requirement`, `original_name`, and `operation` values, with operation `remove` or `rename`; a rename MUST also identify `new_name`. No other fields SHALL be accepted. A rename MUST have a different new name present in the same draft requirement. Exceptions SHALL apply only to the named missing original scenario, never to another loss. Duplicate or malformed exceptions SHALL exit 2; unused exceptions SHALL produce SCENARIO_EXCEPTION_UNUSED violations and exit 1. Without exceptions, every existing name SHALL be preserved.

#### Scenario: Exact removal is allowed
- **WHEN** a valid removal exception names the capability, MODIFIED requirement, and existing scenario omitted from its draft
- **THEN** that omission is permitted without permitting any other missing scenario

#### Scenario: Exact rename requires its target locally
- **WHEN** a valid rename exception identifies the missing original scenario and its new name is present in that same requirement
- **THEN** the named rename is permitted

#### Scenario: Rename target in another requirement is insufficient
- **WHEN** an exception's new name appears only under a different requirement or capability
- **THEN** the original requirement's missing scenario is still a violation

#### Scenario: Unused exception fails
- **WHEN** an exception does not match an actual omission or rename in the identified requirement
- **THEN** the checker exits 1 with SCENARIO_EXCEPTION_UNUSED

#### Scenario: Invalid exception metadata cannot bypass comparison
- **WHEN** exception metadata is unreadable, malformed, duplicated, has unsupported fields or operations, or declares a rename without a distinct new name
- **THEN** the checker exits 2 rather than skipping comparison or granting a broad bypass
