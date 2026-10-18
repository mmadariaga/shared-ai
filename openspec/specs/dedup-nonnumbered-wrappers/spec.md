# dedup-nonnumbered-wrappers Specification

## Purpose

TBD - this spec was authored as a change delta and never merged into the main tree, so its requirements were invisible to validate, list, and archive. Summarize the capability here.

## Requirements

### Requirement: context-isolation-in-explore-instruction
The Context Isolation block (no write commands, crystallization protocol) SHALL reside in the instruction file loaded by both sai-explore wrappers, not inline in either wrapper body.

#### Scenario: block absent from claude explore wrapper
- **WHEN** `commands/claude/sai-explore.md` is read
- **THEN** no "You are in explore mode" paragraph or "Context Isolation" heading appears in the wrapper body

#### Scenario: block absent from opencode explore wrapper
- **WHEN** `commands/opencode/sai-explore.md` is read
- **THEN** no "You are in explore mode" paragraph appears in the wrapper body

#### Scenario: block present in explore instruction file
- **WHEN** the instruction file loaded by both sai-explore wrappers is read
- **THEN** the full Context Isolation text (including the crystallization block template) is present and no inline proposal refusal path remains

### Requirement: no-handoff-for-nonnumbered
Non-numbered instruction files (the files backing sai-explore, sai-archive, sai-commit, and sai-pr) SHALL NOT receive a STOP+print handoff block as part of this deduplication.

#### Scenario: no handoff in commit instruction
- **WHEN** `sai/commands/commit/instructions.md` is read
- **THEN** it contains no STOP+print handoff block of the form used in sai-1 through sai-8

#### Scenario: no handoff in pr instruction
- **WHEN** `sai/commands/pr/instructions.md` is read
- **THEN** it contains no "when ready" STOP+print pointing to a next sai step
