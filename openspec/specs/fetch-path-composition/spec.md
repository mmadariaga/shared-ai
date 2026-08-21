# fetch-path-composition Specification

## Purpose
TBD: define how fetch instructions compose paths inside and outside the project.

## Requirements

### Requirement: Fetch skills write in-project paths relative to the working directory and use out-of-project paths exactly as supplied
Both the Claude Code and opencode fetch skills SHALL encode a path-composition rule in the existing `## Active harness and roots` section. The rule SHALL be inherited by every agent that loads fetch on both harnesses. It SHALL govern how a path is written and SHALL NOT govern where an agent may go.

Inside the project, agents SHALL write paths relative to the working directory and SHALL NOT compose an absolute path from the project-root string. Outside the project, agents SHALL use the path exactly as supplied and SHALL NOT derive it by string manipulation.

The rule SHALL carry the supporting observation inline, stated as an observation rather than a proven mechanism: composed absolute paths have dropped a path segment, while relative paths and literal absolute paths resolved correctly in every observed run. The rule SHALL NOT include an expiry or removal condition and SHALL NOT be framed as a workaround.

The opencode fetch skill SHALL additionally carry a severity note that a mis-composed path becomes a permission prompt that never renders at subagent depth >= 2 and hangs the session, linking https://github.com/anomalyco/opencode/issues/13715. The Claude Code fetch skill SHALL NOT carry that note. The link SHALL appear only as a note on why the rule is load-bearing on opencode, never as the justification for the rule's existence.

#### Scenario: in-project path is relative
- **WHEN** an agent that loaded fetch targets a file or directory inside the project
- **THEN** the path is written relative to the working directory
- **AND** no absolute path is composed from the project-root string

#### Scenario: out-of-project path is used literally
- **WHEN** an agent that loaded fetch is given a concrete path outside the project
- **THEN** that path is used exactly as supplied
- **AND** the path is not derived by string manipulation

#### Scenario: both harness skills state the same composition rule
- **WHEN** `skills/claude/fetch/SKILL.md` and `skills/opencode/fetch/SKILL.md` are read
- **THEN** both state the in-project relative and out-of-project literal cases in `## Active harness and roots`
- **AND** both state that every agent that loads fetch inherits the rule on both harnesses
- **AND** only the opencode skill carries the #13715 load-bearing note

#### Scenario: composition does not change filesystem scope
- **WHEN** the path-composition rule is applied
- **THEN** it does not authorize, deny, or otherwise change where an agent may go
- **AND** filesystem-scope ownership remains with `sai/policies/explore-agent.md`
