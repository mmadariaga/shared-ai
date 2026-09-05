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
The repository SHALL provide a deterministic script at sai/tools/check-delta-headers.js that decides every ADDED, MODIFIED, and REMOVED header by verbatim set diff, never by inference. The script SHALL support delta-dir, specs-dir, root, and json options, skip RENAMED sections, and exit 0 when all headers are correctly classified, exit 1 when misclassified headers are found with a per-header report, and exit 2 on usage or IO error.

#### Scenario: ADDED duplicate fails the check
- **WHEN** an ADDED heading already exists verbatim in the matching main spec
- **THEN** the script reports an ADDED_DUPLICATE violation and exits 1

#### Scenario: REMOVED without a match fails the check
- **WHEN** a REMOVED heading has no verbatim match in the matching main spec
- **THEN** the script reports a REMOVED_MISSING violation and exits 1

#### Scenario: New capability without a main spec requires ADDED
- **WHEN** a capability has no matching main spec file
- **THEN** every requirement of that capability passes only under the ADDED section

### Requirement: Backfill coordinator runs mandatory pre-write delta-header preflight
The backfill coordinator SHALL run the deterministic header script as a mandatory pre-write preflight before writing anything, staging each draft capability spec byte-for-byte under a fresh OS-temp directory preserving specs layout and running the script with the confirmed change name. Exit 0 proceeds to writes; exit 1 writes nothing into the change directory and continues the same worker with the verbatim script report plus cited headers and the existence rule; exit 2 writes nothing and stops as a tooling failure with the verbatim error.

#### Scenario: Clean preflight proceeds to writes
- **WHEN** the staged drafts exit the header script with 0
- **THEN** the coordinator proceeds to validated writes

#### Scenario: Misclassified headers return to the same worker
- **WHEN** the staged drafts exit the header script with 1
- **THEN** the coordinator writes nothing and continues the same worker with the verbatim report and cited headers

### Requirement: Header tooling stays out of install and projection surfaces
The change SHALL add only the new script under sai/tools plus the backfill and archive cards, and SHALL NOT modify the install manifest, harness projections, or installer scripts.

#### Scenario: Install surfaces untouched
- **WHEN** the staged diff is inspected for installer or projection changes
- **THEN** only the new tool script plus backfill and archive card edits are present

