# sai-implement-branch-prompt Specification

## Purpose
Keep branch selection a single, plan-level prompt: `/sai-3-implement` bakes it into `implementation.md`, and `/sai-4-apply` presents it.

## Requirements
### Requirement: sai-3-implement delegates branch selection to the plan-level prompt
`/sai-3-implement` SHALL NOT ask the user for a branch name. The generated `implementation.md` SHALL carry the branch-selection prompt in its `## Prerequisites` section, as defined by the `sai-apply-branch-prompt` capability, with `{feature-name}` resolved to the change name (kebab-case) as the suggested branch. The prompt runs once per pipeline, at `/sai-4-apply` time.

Branch naming is a code-time concern: the prompt SHALL NOT be placed in `/sai-1-spec` or `/sai-2-design`.

#### Scenario: implement generates the plan without a branch question
- **WHEN** the user runs `/sai-3-implement my-change`
- **THEN** no branch-name question is presented during the implement run
- **AND** the `## Prerequisites` section of `implementation.md` suggests the branch `my-change`

#### Scenario: branch selection happens once, at apply time
- **WHEN** the user runs `/sai-3-implement my-change` and then `/sai-4-apply my-change`
- **THEN** the user is asked about branch selection exactly once, by the plan-level prompt during `/sai-4-apply`

#### Scenario: branch prompt is absent from sai-1-spec and sai-2-design
- **WHEN** the `/sai-1-spec` or `/sai-2-design` wrapper and its command cards are read
- **THEN** they contain no branch-name prompt
