# claude-routed-coordinator-panel-scope Specification

## Purpose
TBD: Define the tool boundaries required by Claude routed coordinators and their panel rendering.

## Requirements

### Requirement: Routed Claude coordinator allowlists include panel tools

The Claude Code wrappers for routed spec, design, implementation, review, security, performance, and accessibility coordinators SHALL declare the four panel task tools `TaskCreate`, `TaskUpdate`, `TaskGet`, and `TaskList` in `allowed-tools`, rendered from the wrapper's capability profile. The spec, design, security, performance, and accessibility coordinators SHALL NOT receive `Edit` or `Write`; the implementation and review coordinators receive them through the `implement-command` profile.

#### Scenario: Routed wrappers can perform the required panel render

- **WHEN** a routed Claude wrapper's `allowed-tools` frontmatter is inspected
- **THEN** it contains all four panel task tools, and a spec, design, security, performance, or accessibility wrapper excludes `Edit` and `Write`.
