## ADDED Requirements

### Requirement: openspec binary verification command

The `sai/policies/prereqs-check.md` file SHALL include an explicit verification command for checking the openspec binary availability. The file SHALL state: "To verify, run: `openspec --version`".

This command SHALL work identically across PowerShell and bash shells, avoiding platform-specific commands like `where` or `which`.

#### Scenario: verification command present in prereqs check artifact
- **WHEN** `sai/policies/prereqs-check.md` is read
- **THEN** it contains the text `openspec --version` as the verification command for the openspec binary check

#### Scenario: platform-agnostic verification
- **WHEN** `sai/policies/prereqs-check.md` is read
- **THEN** the verification command it specifies is `openspec --version`, which invokes no platform-specific mechanism such as `where` or `which`

## MODIFIED Requirements

## REMOVED Requirements
