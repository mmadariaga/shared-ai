# claude-explore-allowlist Specification

## Purpose
TBD - created by archiving change shared-tool-execution-permissions. Update Purpose after archive.
## Requirements
### Requirement: Explore Minimal Grant

The `sai-explore` Claude wrapper SHALL permit exactly three `node` tools in both roots (prereqs, research probe, stage store) and no other `node` invocation.

#### Scenario: Explore runs mandated tools
- **WHEN** explore runs prereqs, the research probe, or the stage store CLI
- **THEN** execution proceeds with no interactive permission prompt

