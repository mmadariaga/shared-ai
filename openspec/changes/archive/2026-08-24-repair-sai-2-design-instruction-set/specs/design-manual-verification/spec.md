## MODIFIED Requirements

### Requirement: design.md ends with a Manual Verification section
The active design step authority at `sai/commands/design/steps/design.md` SHALL require `openspec/changes/{name}/design.md` to close with a `## Manual Verification` section, listing the checks that are cheap to perform by hand and expensive to encode as automated tests.

The section SHALL be the closing section of `design.md`. When a change genuinely warrants no manual check, the section SHALL still be emitted with an explicit `None` and a one-line reason, so a reader can distinguish "nothing to check" from "not considered".

#### Scenario: Manual Verification closes design.md
- **WHEN** `sai-2-design` generates `design.md`
- **THEN** `## Manual Verification` is present as the file's closing section

#### Scenario: change with no manual check
- **WHEN** a change warrants no manual verification
- **THEN** `## Manual Verification` is emitted with `None` and a one-line reason
- **AND** the section is NOT omitted

#### Scenario: manual-verification-uses-live-authority
- **WHEN** the design worker completes `design.md`
- **THEN** the file ends with the Manual Verification section required by the active step contract.

