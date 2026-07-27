## MODIFIED Requirements

### Requirement: Claude SAI wrappers SHALL declare the updated model and effort metadata

The affected Claude command wrappers SHALL use the model and effort assignments implemented in the command frontmatter.

#### Scenario: Claude wrapper metadata is loaded
- **WHEN** the affected Claude SAI wrapper frontmatter is read
- **THEN** `sai-1-spec`, `sai-3-implement`, `sai-5-review`, `sai-6-security`, `sai-7-performance`, and `sai-8-accessibility` use `opus`; `sai-4-apply` uses `sonnet`; `sai-archive`, `sai-commit`, `sai-pr`, and `sai-status` use `haiku`; and `sai-backfill` and `sai-explore` use `sonnet`

#### Scenario: Claude effort metadata is loaded
- **WHEN** a Claude wrapper with explicit effort metadata is read
- **THEN** `sai-1-spec`, `sai-3-implement`, `sai-5-review`, `sai-7-performance`, `sai-8-accessibility`, and `sai-backfill` use `medium`; `sai-4-apply` uses `low`; `sai-6-security` uses `xhigh`; and `sai-explore` uses `medium`
