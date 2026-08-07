# budget-subagent-file-reading Specification

## Purpose
Governs how the budget-subagent reads file contents, including tool bindings and the bounded-read guardrails it applies by reference.

## Requirements

### Requirement: The budget-subagent SHALL use `read/readFile` for reading file contents

The tool binding for file reading was updated from `read/fileContents` to `read/readFile` to match the Copilot tool registry.

#### Scenario: File content reading
- **WHEN** the budget-subagent needs to read the contents of a file
- **THEN** it SHALL invoke the `read/readFile` tool

### Requirement: The budget-subagent SHALL apply the bounded-read guardrails defined in budget-explorer-file-reading

The budget-subagent SHALL apply the bounded-read guardrails defined in `openspec/specs/budget-explorer-file-reading/spec.md` to every file Read it issues. The budget-subagent SHALL NOT duplicate the guardrail definitions in this spec; the canonical home is `openspec/specs/budget-explorer-file-reading/spec.md`. Any future change to the guardrails SHALL be made there and SHALL take effect for the budget-subagent by reference.

#### Scenario: The budget-subagent applies the guardrails

- **WHEN** the budget-subagent invokes any Read on a file path
- **THEN** the bounded-read guardrails from `openspec/specs/budget-explorer-file-reading/spec.md` SHALL apply
- **AND** this spec SHALL NOT carry a separate copy of the guardrail text
