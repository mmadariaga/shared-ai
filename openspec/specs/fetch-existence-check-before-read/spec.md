# fetch-existence-check-before-read Specification

## Purpose
TBD

## Requirements

### Requirement: Skills path resolution unchanged

`Fetch @skills/<name>/SKILL.md` SHALL continue to invoke the `skill` tool with skill name `<name>`, except when that skill is already loaded through the skill tool in this conversation and its content is still in the agent's own context, in which case the agent SHALL follow the loaded skill with no second skill-tool call, as the `fetch-loaded-copy-reuse` capability defines. The existence-check-before-read behavior SHALL NOT apply to skills paths.

#### Scenario: skills path triggers skill tool
- **WHEN** `Fetch @skills/budget/SKILL.md` is encountered and the `budget` skill is not already loaded in the agent's context
- **THEN** the `skill` tool is invoked with name `budget`, no glob/LS check is performed

#### Scenario: skills path already loaded
- **WHEN** `Fetch @skills/budget/SKILL.md` is encountered and the agent already loaded the `budget` skill through the skill tool in this conversation, with its content still in context
- **THEN** the agent follows the loaded skill, with no second skill-tool call and no glob/LS check
