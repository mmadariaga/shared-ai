# budget-subagent-file-discovery Specification

## Purpose
Governs how the budget-subagent performs directory discovery, including tool bindings and bounded-read guardrails on discovery results.

## Requirements

### Requirement: The budget-subagent SHALL use `search/listDirectory` for directory listing

The tool binding for directory listing was updated from `read/directory` to `search/listDirectory` to match the Copilot tool registry.

#### Scenario: Directory listing request
- **WHEN** the budget-subagent needs to list files in a directory
- **THEN** it SHALL invoke the `search/listDirectory` tool

### Requirement: The budget-subagent SHALL apply bounded-read guardrails before any discovery Read

The budget-subagent agent SHALL apply the bounded-read guardrails defined in `openspec/specs/budget-explorer-file-reading/spec.md` before invoking any Read that follows a discovery result. A discovery routine that returns unbounded output is equivalent to a Read of the same data and is subject to the same guardrails. The guardrails are framed as risk-reduction hygiene pending diagnosis of the actual hang trigger observed in this session; the canonical home of the guardrails is `openspec/specs/budget-explorer-file-reading/spec.md`.

#### Scenario: A discovery that surfaces a transcript path is followed by Grep, not Read

- **WHEN** the budget-subagent's discovery returns a path matching `**/transcript*`, `**/*.output`, or `**/*.jsonl`
- **THEN** the budget-subagent SHALL NOT Read the surfaced path directly
- **AND** SHALL switch to a bounded Grep with `head_limit`, or escalate to the main agent

#### Scenario: A discovery that surfaces a binary file is followed by metadata inspection, not Read

- **WHEN** the budget-subagent's discovery returns a path and the file-type detector reports the file as binary
- **THEN** the budget-subagent SHALL NOT Read the surfaced path
- **AND** SHALL fall back to a metadata-only inspection or escalate to the main agent
