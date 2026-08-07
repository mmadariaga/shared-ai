# budget-executor-file-discovery Specification

## Purpose
TBD - created by archiving change copilot-fixes. Update Purpose after archive.
## Requirements
### Requirement: The budget-executor agent SHALL have access to `search/listDirectory`

`agents/copilot/budget-executor.agent.md` MUST include `search/listDirectory` in its tools list so the executor can list directory contents in addition to running terminal commands.

#### Scenario: Directory listing needed during execution
- **WHEN** the budget-executor agent needs to list files in a directory
- **THEN** it can invoke the `search/listDirectory` tool without falling back to terminal commands

### Requirement: The budget-executor SHALL apply bounded-read guardrails before any discovery Read

The budget-executor agent SHALL apply the bounded-read guardrails defined in `openspec/specs/budget-explorer-file-reading/spec.md` before invoking any Read that follows a discovery result. A discovery routine that returns unbounded output is equivalent to a Read of the same data and is subject to the same guardrails. The bounded-read guardrails apply to discovery paths in addition to the executor's existing execute-only discipline. The guardrails are framed as risk-reduction hygiene pending diagnosis of the actual hang trigger observed in this session; the canonical home of the guardrails is `openspec/specs/budget-explorer-file-reading/spec.md`.

#### Scenario: A discovery that surfaces a transcript path is followed by Grep, not Read

- **WHEN** the budget-executor's discovery returns a path matching `**/transcript*`, `**/*.output`, or `**/*.jsonl`
- **THEN** the budget-executor SHALL NOT Read the surfaced path directly
- **AND** SHALL switch to a bounded Grep with `head_limit`, or escalate to the main agent

#### Scenario: A discovery that surfaces a binary file is followed by metadata inspection, not Read

- **WHEN** the budget-executor's discovery returns a path and the file-type detector reports the file as binary
- **THEN** the budget-executor SHALL NOT Read the surfaced path
- **AND** SHALL fall back to a metadata-only inspection or escalate to the main agent
