## MODIFIED Requirements

### Requirement: opencode SAI commands SHALL use qwen3.7-plus

All opencode SAI command wrappers that previously declared `model: opencode-go/qwen3.6-plus` MUST declare `model: opencode-go/qwen3.7-plus` in their YAML frontmatter. `sai-1-spec.md` MUST also use `qwen3.7-plus` (previously `kimi-k2.6`).

#### Scenario: sai-explore uses qwen3.7-plus
- **WHEN** `commands/opencode/sai-explore.md` is read
- **THEN** its frontmatter contains `model: opencode-go/qwen3.7-plus`

#### Scenario: sai-1-spec uses qwen3.7-plus
- **WHEN** `commands/opencode/sai-1-spec.md` is read
- **THEN** its frontmatter contains `model: opencode-go/qwen3.7-plus`

#### Scenario: sai-5-review uses qwen3.7-plus
- **WHEN** `commands/opencode/sai-5-review.md` is read
- **THEN** its frontmatter contains `model: opencode-go/qwen3.7-plus`

#### Scenario: sai-6-security uses qwen3.7-plus
- **WHEN** `commands/opencode/sai-6-security.md` is read
- **THEN** its frontmatter contains `model: opencode-go/qwen3.7-plus`

#### Scenario: sai-7-performance uses qwen3.7-plus
- **WHEN** `commands/opencode/sai-7-performance.md` is read
- **THEN** its frontmatter contains `model: opencode-go/qwen3.7-plus`

#### Scenario: sai-8-accessibility uses qwen3.7-plus
- **WHEN** `commands/opencode/sai-8-accessibility.md` is read
- **THEN** its frontmatter contains `model: opencode-go/qwen3.7-plus`

#### Scenario: sai-backfill uses qwen3.7-plus
- **WHEN** `commands/opencode/sai-backfill.md` is read
- **THEN** its frontmatter contains `model: opencode-go/qwen3.7-plus`
