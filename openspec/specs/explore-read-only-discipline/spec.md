# explore-read-only-discipline Specification

## Purpose
Keeps `/sai-explore` read-only across its step library: exploration writes nothing, and writes happen only inside an explicitly selected route.

## Requirements

### Requirement: Shared exploration stages carry a read-only reminder

The common exploration guidance SHALL include a read-only reminder near the beginning of `sai/commands/explore/steps/common.md` beginning with `Exploration is read-only:` and stating that sai-explore must not create, modify, or delete repository files or implement code. It SHALL identify `sai/commands/explore/instructions.md` as the normative no-file-writes rule and preserve its separate user-invoked to-backlog exception: only temporary preparation, receipt, and publication operations after explicit publication confirmation, with temporary preparation and receipts outside the repository. This exception SHALL NOT permit repository writes or bypass publication confirmation.

#### Scenario: Reminder present during exploration

- **WHEN** an agent reads the shared exploration-stage guidance
- **THEN** the guidance states that exploration creates, modifies, or deletes no repository files and implements no code, while identifying the separately invoked explicitly publication-confirmed outside-repository to-backlog exception.

### Requirement: Crystallization emission does not authorize writes

The shared exploration guidance SHALL state that emitting a Ready to Propose block selects no route and authorizes no writes. Repository writes SHALL require a route the user explicitly selects and that route's contract. The separate outside-repository to-backlog exception SHALL require user invocation and explicit publication confirmation independently of proposal emission; it SHALL NOT authorize repository writes.

#### Scenario: Proposal emission without route selection

- **WHEN** a Ready to Propose block has been emitted but no route has been explicitly selected
- **THEN** the guidance states that proposal emission authorizes no writes and repository writes remain unauthorized until a selected route and its contract authorize them; the separate outside-repository to-backlog exception requires its own user invocation and explicit publication confirmation.

### Requirement: Scoped confirmed backlog capture exception

During `/sai-explore`, a user-invoked to-backlog capture SHALL be a separate scoped exception to the repository read-only boundary only after the skill's explicit publication confirmation. On Linux this exception SHALL permit the concrete installed `scripts/prepare-temp.js` invocation and the capture's receipt/publication operations, with private temporary preparation and receipt retention outside the repository. It SHALL NOT authorize repository edits or omission of publication confirmation. Claude Code SHALL use its installed skill and command grants; OpenCode SHALL use its installed skill with the active primary agent's applicable command requirements. Preparation failure SHALL stop publication, and recovery SHALL retain the original receipt.

#### Scenario: Confirmed capture during exploration

- **WHEN** the user invokes to-backlog during exploration and explicitly confirms its publication proposal on Linux
- **THEN** the scoped exception permits concrete temporary preparation and receipt/publication operations outside the repository without permitting repository edits.

#### Scenario: Unconfirmed capture

- **WHEN** the user invokes to-backlog during exploration but has not explicitly confirmed its publication proposal
- **THEN** the scoped exception does not authorize preparation or publication.

#### Scenario: Capture preparation fails

- **WHEN** the concrete preparation operation fails during a confirmed capture
- **THEN** publication stops without relaxing the repository read-only boundary or selecting an insecure temporary fallback.
