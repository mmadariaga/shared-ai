# tool-preference-ladder Specification

## Purpose

TBD: fixed conditional research-tool preference order (codegraph, git grep, direct disk tools) for the explorer subagent defined in `sai/policies/explore-agent.md`.

## Requirements

### Requirement: Fixed research-tool preference order

When researching the project, the explorer SHALL prefer research tools in a fixed order: codegraph first, git grep second, and direct disk tools last. When `codegraph_*` MCP tools are present in the session, structural questions — where something is defined, what calls it, what a change would affect — SHALL go to codegraph before any text search. When shell and git are available, textual searches SHALL run through `git grep` via shell. Glob, Grep, and direct file reads are the final fallback when neither earlier level is available or neither answered the question.

#### Scenario: Structural questions go to codegraph first
- **WHEN** `codegraph_*` MCP tools are present in the session and the explorer faces a structural question about definitions, callers, or change impact
- **THEN** the question goes to codegraph before any text search runs

#### Scenario: Textual searches use git grep
- **WHEN** shell and git are available and the explorer needs a textual search
- **THEN** the search runs through `git grep` via shell instead of direct disk search tools

#### Scenario: Direct disk tools are the last fallback
- **WHEN** neither codegraph nor `git grep` answered the question or neither earlier level is available
- **THEN** the explorer falls back to Glob, Grep, and direct file reads

### Requirement: Conditional skipping of unavailable levels

Each ladder level SHALL be evaluated conditionally and skipped without any attempt when its availability precondition fails: when `codegraph_*` tools are absent from the session the codegraph level is skipped without any attempt, and when shell or git is unavailable `git grep` is skipped and research falls directly to Glob/Grep/Read. The wording of every level SHALL remain presence-based and conditional — never an unconditional instruction to call a tool that may not exist.

#### Scenario: Codegraph absent from the session
- **WHEN** the explorer runs in a session where `codegraph_*` MCP tools are not present
- **THEN** the codegraph level is skipped without any attempt and research proceeds at the git grep level

#### Scenario: Shell or git unavailable
- **WHEN** shell or git is unavailable inside the explorer runtime
- **THEN** `git grep` is skipped and research falls directly to Glob/Grep/Read

### Requirement: The ladder governs only research-tool choice

The tool-preference ladder SHALL govern only the choice of research tools and SHALL NOT modify the directed out-of-root access rules, structured scope escalation, or the per-segment tool-call ceiling defined elsewhere in the policy.

#### Scenario: Out-of-root need discovered while following the ladder
- **WHEN** following the ladder exposes a concrete filesystem need outside the project root
- **THEN** the need is handled exclusively through the existing directed-access and structured-scope-escalation rules, and the ladder authorizes no additional access

#### Scenario: Tool choice does not spend beyond the ceiling
- **WHEN** the explorer selects tools according to the ladder
- **THEN** the selection is bounded by the unchanged per-segment tool-call ceiling of at most 30 calls per execution segment
