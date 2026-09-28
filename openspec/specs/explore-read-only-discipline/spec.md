# explore-read-only-discipline Specification

## Purpose
Keeps `/sai-explore` read-only across its step library: exploration writes nothing, and writes happen only inside an explicitly selected route.

## Requirements

### Requirement: Shared exploration stages carry a read-only reminder
The common exploration guidance SHALL include a read-only reminder near the beginning of sai/commands/explore/steps/common.md stating that sai-explore must not create, modify, or delete files or implement code and that the normative no-file-writes rule remains in sai/commands/explore/instructions.md.

#### Scenario: Reminder present during exploration
- **WHEN** an agent reads the shared exploration-stage guidance
- **THEN** the guidance states that exploration creates, modifies, or deletes no files and implements no code

### Requirement: Crystallization emission does not authorize writes
The shared exploration guidance SHALL state that emitting a Ready to Propose block does not authorize writes and that delegated writes require an explicitly selected route and that route's contract.

#### Scenario: Proposal emission without route selection
- **WHEN** a Ready to Propose block has been emitted but no route has been explicitly selected
- **THEN** the guidance states that writes remain unauthorized until that route and its contract authorize them
