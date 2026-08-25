# Progress Plan Declaration Specification

## MODIFIED Requirements

### Requirement: Merge adaptive TODO remains separate from worker progress

A merge adapter without a worker progress plan MAY render a coordinator-owned adaptive TODO whose route becomes known after merge outcome. The adaptive TODO MAY include contextual analysis and SHALL not be transported in the worker envelope or alter worker continuation semantics.

#### Scenario: Contextual route does not become worker progress

- **WHEN** a conflicted `/sai-merge` invocation reaches contextual analysis
- **THEN** the coordinator renders the adaptive TODO independently while the worker continues using the existing lifecycle payload and continuation contract
