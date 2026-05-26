## ADDED Requirements

### Requirement: context-isolation-in-explore-instruction
The Context Isolation block (no write commands, crystallization protocol, inline proposal refusal) SHALL reside in the instruction file loaded by both sai-explore wrappers, not inline in either wrapper body.

#### Scenario: block absent from claude explore wrapper
- **WHEN** `claude/commands/sai-explore.md` is read
- **THEN** no "You are in explore mode" paragraph or "Context Isolation" heading appears in the wrapper body

#### Scenario: block absent from opencode explore wrapper
- **WHEN** `opencode/commands/sai-explore.md` is read
- **THEN** no "You are in explore mode" paragraph appears in the wrapper body

#### Scenario: block present in explore instruction file
- **WHEN** the instruction file loaded by both sai-explore wrappers is read
- **THEN** the full Context Isolation text (including the crystallization block template and inline proposal refusal) is present

### Requirement: completion-check-in-archive-instruction
The Completion Check block (inspect `implementation.md` for unchecked items before archiving) SHALL reside in the instruction file loaded by both sai-archive wrappers, not inline in either wrapper body.

#### Scenario: block absent from claude archive wrapper
- **WHEN** `claude/commands/sai-archive.md` is read
- **THEN** no "Before running the archive skill" text appears in the wrapper body

#### Scenario: block absent from opencode archive wrapper
- **WHEN** `opencode/commands/sai-archive.md` is read
- **THEN** no "Before running the archive skill" text appears in the wrapper body

#### Scenario: block present in archive instruction file
- **WHEN** the instruction file loaded by both sai-archive wrappers is read
- **THEN** it contains the `- [ ]` scan logic and the STOP message for incomplete tasks

### Requirement: path-resolution-in-pr-instruction
The path resolution sentence (`Resolve all artifact paths under openspec/changes/{change-name}/`, treating proposal.md + design.md + specs/**/*.md as spec.md equivalent and implementation.md as plan.md equivalent) SHALL reside in `instructions/sai/pr.md`, not inline in either sai-pr wrapper.

#### Scenario: path resolution absent from claude pr wrapper
- **WHEN** `claude/commands/sai-pr.md` is read
- **THEN** no "Resolve all artifact paths" sentence appears inline in the wrapper body

#### Scenario: path resolution present in pr.md
- **WHEN** `instructions/sai/pr.md` is read
- **THEN** it contains the full openspec artifact-path resolution mapping

### Requirement: no-handoff-for-nonnumbered
Non-numbered instruction files (the files backing sai-explore, sai-archive, sai-commit, and sai-pr) SHALL NOT receive a STOP+print handoff block as part of this deduplication.

#### Scenario: no handoff in commit instruction
- **WHEN** `instructions/sai/commit.md` is read
- **THEN** it contains no STOP+print handoff block of the form used in sai-1 through sai-8

#### Scenario: no handoff in pr instruction
- **WHEN** `instructions/sai/pr.md` is read
- **THEN** it contains no "when ready" STOP+print pointing to a next sai step
