# explore-agent-directed-access Specification

## Purpose
TBD.

## Requirements

### Requirement: Out-of-root filesystem access SHALL be directed and purpose-bound

The budget-explorer agent MAY access a filesystem path outside the harness project root only when the path is concrete and named with a concrete task-relevant purpose. A qualifying path is one supplied in the task or one that is a public or well-known location of a tool relevant to the task, where the agent can name the tool, explain why that tool is relevant, and identify the specific artifact sought at that location before access. For every such directed access, the agent SHALL record those three evidence elements — tool, task relevance, and specific artifact — in its bounded summary. A location qualifies by this evidence, not merely because it is a conventional place to look. This is a criterion for directed access, not a closed destination allowlist: any destination may qualify when the named-path and concrete-purpose conditions are met. Speculative sweeping, broad patterns, and root exhaustion SHALL NOT qualify as directed access.

The bounded summary is the required output surface for this evidence; internal reasoning that is not recorded there does not satisfy the obligation.

#### Scenario: A task-supplied external path is directed

- **WHEN** the task names a concrete path outside the project root and explains why it is relevant
- **THEN** the agent may access that path for the named purpose
- **AND** it does not perform an unrelated sweep around that path

#### Scenario: A relevant tool location is directed

- **WHEN** the task requires inspecting a public or well-known external location of a relevant tool
- **THEN** the agent names the relevant tool, its task relationship, and the specific artifact sought before accessing the concrete location
- **AND** the agent may access that location for that tool-related purpose
- **AND** the structured response's bounded summary records the tool, task relationship, and specific artifact as the evidence for access
- **AND** the rule does not require the location to appear in a closed allowlist

#### Scenario: A well-known but ungrounded location is not directed

- **WHEN** an external location is well-known or conventional but the agent cannot state which relevant tool requires it or which specific artifact it seeks there
- **THEN** the agent does not access the location
- **AND** it handles the need under the scope-escalation requirement

#### Scenario: A discovered external pattern is not directed

- **WHEN** the agent finds or imagines an out-of-root glob, wildcard, directory sweep, or other pattern that was not named as a concrete task path
- **THEN** it does not execute that pattern
- **AND** it handles any remaining need under the scope-escalation requirement

#### Scenario: An irrelevant external path is not directed

- **WHEN** an external path is concrete but its purpose is not independently relevant to the task
- **THEN** the agent does not access it
- **AND** it does not treat concreteness alone as authorization
