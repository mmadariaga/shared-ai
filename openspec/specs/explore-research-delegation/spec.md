# explore-research-delegation Specification

## Purpose
TBD - created by archiving change mandate-explorer-research-delegation. Update Purpose after archive.

## Requirements

### Requirement: Delegated discovery research
All discovery research in sai-explore SHALL be delegated to the explore subagent with a stated goal plus output contract; the main session SHALL reason and synthesize and SHALL NOT research code directly.

#### Scenario: Principal needs code knowledge
- **WHEN** the principal needs a source-code read, search, or external doc lookup
- **THEN** it delegates that lookup to the explore subagent and synthesizes the returned summary

### Requirement: Principal direct-read scope
The principal SHALL read directly only `openspec/` artifacts, instruction and policy files from its own fetch route, and stage-machine state.

#### Scenario: Principal gathers context
- **WHEN** the principal loads exploration context
- **THEN** it reads only openspec artifacts, its own fetch-route files, and stage-machine state directly

### Requirement: Principal tool discipline
The principal SHALL NOT use WebFetch, WebSearch, Glob, Grep, or Read for routine research; direct use SHALL remain a punctual exception for verification or when the explorer is unavailable.

#### Scenario: Punctual verification need
- **WHEN** punctual verification requires a direct check or the explorer is unavailable
- **THEN** the principal uses a minimal Glob, Grep, or Read and re-delegates as soon as possible

### Requirement: Delegation line in body
`sai/commands/explore/body.md` SHALL carry the normative delegation line plus load order with no probe flag, no literal, and no reprint.

#### Scenario: Session starts exploration
- **WHEN** the main session passes prerequisite checks
- **THEN** it follows the delegation line and delegates discovery without running any probe
