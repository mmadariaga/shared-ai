# claude-model-routing Specification

## Purpose

TBD - this spec was authored as a change delta and never merged into the main tree, so its requirements were invisible to validate, list, and archive. Summarize the capability here.

## Requirements

### Requirement: Claude SAI wrappers SHALL declare the updated model and effort metadata

The affected Claude command wrappers SHALL use the model and effort assignments implemented in the command frontmatter.

#### Scenario: Claude wrapper metadata is loaded
- **WHEN** the affected Claude SAI wrapper frontmatter is read
- **THEN** `sai-3-implement`, `sai-4-review`, `sai-build`, `sai-deep-review`, `sai-explore`, `sai-merge`, and `sai-retire-docs` use `opus`; `sai-1-spec`, `sai-2-design`, `sai-6-security`, `sai-7-performance`, `sai-8-accessibility`, `sai-archive`, `sai-backfill`, and `sai-commit` use `sonnet`; and `sai-status` and `sai-worktree` use `haiku`

#### Scenario: Claude effort metadata is loaded
- **WHEN** a Claude wrapper with explicit effort metadata is read
- **THEN** `sai-1-spec`, `sai-2-design`, `sai-6-security`, `sai-7-performance`, `sai-8-accessibility`, `sai-archive`, `sai-backfill`, and `sai-commit` use `high`; `sai-3-implement`, `sai-4-review`, `sai-build`, `sai-deep-review`, `sai-explore`, `sai-merge`, `sai-retire-docs`, `sai-status`, and `sai-worktree` use `medium`
