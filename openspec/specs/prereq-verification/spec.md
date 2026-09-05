# prereq-verification Specification

## Purpose

TBD: the openspec binary verification command that `sai/policies/prereqs-check.md` specifies.
## Requirements
### Requirement: openspec binary verification command

The `sai/policies/prereqs-check.md` file SHALL delegate the openspec binary availability check to `sai/tools/prereqs.js` and SHALL NOT instruct the reading agent to run a verification command itself. The file SHALL retain `openspec --version` as the by-hand verification command named in the `cli` entry of its `failed_check` remediation mapping, stated as: "To verify by hand, run: `openspec --version`".

That command SHALL work identically across PowerShell and bash shells, avoiding platform-specific commands like `where` or `which`. The tool SHALL likewise probe the binary with `openspec --version` and MUST NOT use `where`, `which`, or any other platform-specific location mechanism.

#### Scenario: verification command present in prereqs check artifact
- **WHEN** `sai/policies/prereqs-check.md` is read
- **THEN** it contains the text `openspec --version` in the `cli` remediation mapping as the by-hand verification command for the openspec binary check

#### Scenario: platform-agnostic verification
- **WHEN** `sai/policies/prereqs-check.md` is read
- **THEN** the verification command it names is `openspec --version`, which invokes no platform-specific mechanism such as `where` or `which`

#### Scenario: the reading agent does not run the check itself
- **WHEN** `sai/policies/prereqs-check.md` is read
- **THEN** it directs the agent to run `node <tool-path> check --json --cwd <project-root>` and print the literal matching the returned `failed_check`, rather than to perform the binary availability check in prose

