# explore-agent-search-root Specification

## Purpose
TBD.

## Requirements

### Requirement: Filesystem research SHALL start at the harness project root

The budget-explorer agent SHALL treat the harness working directory as the project root for the invocation and SHALL use that root as the default and first scope for every unqualified or speculative filesystem search, discovery, and read. The root includes the active worktree when the harness starts in a worktree. A concrete external path explicitly supplied in the task is a directed-access exception governed by the directed-access capability. Speculative patterns SHALL remain confined to the root; exhausting or finding no result in the root SHALL NOT authorize self-widening. This requirement governs filesystem research only: contract Fetch loading is boot behavior, and web lookup is outside this filesystem scope.

#### Scenario: Default research starts in the project root

- **WHEN** a task does not name a filesystem path
- **THEN** the agent begins its search from the harness project root
- **AND** its speculative search and discovery candidates remain inside that root

#### Scenario: A worktree is the harness project root

- **WHEN** the harness working directory is an active worktree
- **THEN** the worktree directory is the agent's project root for filesystem research
- **AND** the agent does not broaden the initial search to the parent repository or sibling worktrees

#### Scenario: A named external path is a directed exception

- **WHEN** the task supplies a concrete external path with a concrete relevant purpose
- **THEN** the agent may use that directed path without first performing an unrelated speculative sweep from the project root
- **AND** any further discovery remains subject to the directed-access and escalation requirements

#### Scenario: Root search is exhausted

- **WHEN** the agent has searched the project root without finding the requested candidate
- **THEN** it reports the requested candidate as not found
- **AND** when it has a concrete external candidate with a legible purpose that is not already directed by the task, it returns that candidate as an escalation rather than accessing it
- **AND** root exhaustion alone never authorizes external access

#### Scenario: Fetch boot is not filesystem research

- **WHEN** the agent loads its mounted policy or binding contract through Fetch before research
- **THEN** that boot read is not treated as a filesystem search scope decision
- **AND** the root-first rule applies when filesystem research begins

#### Scenario: Web lookup is outside this scope

- **WHEN** the task would require web lookup rather than filesystem research
- **THEN** this capability does not authorize or require that lookup
- **AND** filesystem-scope rules are not used to treat web results as local filesystem candidates
