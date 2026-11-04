# fetch-path-composition Specification

## Purpose
Define how agents that load a fetch skill write paths inside and outside the project.

## Requirements

### Requirement: Tool resolution states the path-composition rule and fetch skills use the tool's path

`sai/policies/tool-resolution.md` SHALL state the path-composition rule for Claude Code and opencode alike: inside the project, write paths relative to the working directory; outside it, use a path exactly as a tool returned it, with backslashes turned into forward slashes and nothing else. It SHALL carry the supporting observation as an observation, not a proven mechanism: a worker in a worktree produced a path without its repository folder, while relative paths and paths a tool returned resolved correctly. The rule SHALL govern how a path is written and SHALL NOT govern where an agent may go; filesystem-scope ownership remains with `sai/policies/explore-agent.md`.

Neither fetch skill SHALL carry a `### Path composition` section. Both SHALL use the fetch tool's header path as given and SHALL NOT compose a path themselves, and both SHALL run the global fetch tool with the reported base directory's backslashes turned into forward slashes and nothing else. Neither SHALL carry the #13715 hang note or issue link.

#### Scenario: the policy states the rule
- **WHEN** `sai/policies/tool-resolution.md` is read
- **THEN** it states the in-project relative case and the out-of-project tool-returned case with the slash-conversion exception, and the dropped-segment observation

#### Scenario: fetch skills carry no composition section
- **WHEN** `skills/claude/fetch/SKILL.md` and `skills/opencode/fetch/SKILL.md` are read
- **THEN** neither has a `### Path composition` section
- **AND** both tell the agent to use the fetch tool's header path as given and never compose a path

#### Scenario: tool-returned path keeps only the slash conversion
- **WHEN** an agent runs an out-of-project path that a tool or the harness returned with backslashes
- **THEN** it may turn those backslashes into forward slashes and changes nothing else in the path

#### Scenario: composition stays out of filesystem scope
- **WHEN** the path-composition rule is applied
- **THEN** it does not authorize, deny, or otherwise change where an agent may go
- **AND** filesystem-scope ownership remains with `sai/policies/explore-agent.md`
