## MODIFIED Requirements

### Requirement: Copilot SAI prompts SHALL declare the updated model metadata

The affected Copilot command prompt files SHALL use the model assignments implemented in their frontmatter.

#### Scenario: Copilot prompt metadata is loaded
- **WHEN** the affected Copilot SAI prompt frontmatter is read
- **THEN** `sai-1-spec` and `sai-3-implement` use `GPT-5.6 Terra (copilot)`; `sai-4-apply`, `sai-backfill`, and `sai-explore` use `GPT-5.6 Luna (copilot)`; and `sai-6-security` uses `Claude Opus 4.8 (copilot)`
