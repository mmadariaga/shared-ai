## ADDED Requirements

### Requirement: ai-* commands verify openspec prerequisites before executing
Commands that depend on the OpenSpec CLI (`ai-explore`, `ai-1-spec`, `ai-2-implement`, `ai-3-apply`, `ai-archive`) SHALL check that (1) the `openspec` binary is available and (2) the project has been initialized (`openspec/` directory exists) before proceeding.

#### Scenario: openspec binary missing
- **WHEN** user invokes an openspec-dependent ai-* command
- **WHEN** `openspec` binary is not found in PATH
- **THEN** command halts immediately with message: "openspec CLI not found. Install it first: [install instructions]"
- **THEN** no artifacts are created or modified

#### Scenario: project not initialized
- **WHEN** user invokes an openspec-dependent ai-* command
- **WHEN** `openspec` binary is available but `openspec/` directory does not exist in project root
- **THEN** command halts with message: "OpenSpec not initialized in this project. Run: openspec init"
- **THEN** no artifacts are created or modified

#### Scenario: prerequisites met — proceeds normally
- **WHEN** `openspec` binary is available
- **WHEN** `openspec/` directory exists
- **THEN** command proceeds with its normal workflow

### Requirement: commands that do NOT depend on OpenSpec skip the check
`ai-4-review`, `ai-5-security`, `ai-6-performance`, `ai-7-accessibility`, `ai-commit`, `ai-pr` SHALL NOT perform the openspec prerequisite check — they only read artifact files by path.

#### Scenario: ai-commit works without openspec
- **WHEN** user invokes `ai-commit` in a project without openspec
- **THEN** command executes normally, reading only git state
