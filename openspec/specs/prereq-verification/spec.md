## ADDED Requirements

### Requirement: openspec binary verification command

The `sai/instructions/prereqs.md` file SHALL include an explicit verification command for checking the openspec binary availability. The instruction SHALL state: "To verify, run: `openspec --version`".

This command SHALL work identically across PowerShell and bash shells, avoiding platform-specific commands like `where` or `which`.

#### Scenario: verification command present in prereqs
- **WHEN** `sai/instructions/prereqs.md` is read
- **THEN** it contains the text `openspec --version` as the verification command for the openspec binary check

#### Scenario: platform-agnostic verification
- **WHEN** the prerequisite check is executed in either PowerShell or bash
- **THEN** `openspec --version` succeeds if the binary is available, fails if not, with no platform-specific command required

## MODIFIED Requirements

## REMOVED Requirements
