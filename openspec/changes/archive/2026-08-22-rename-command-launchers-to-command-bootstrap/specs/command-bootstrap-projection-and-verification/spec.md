## MODIFIED Requirements

### Requirement: command bootstrap projection
The shared command projection SHALL include each active `command-bootstrap.md` source for both Claude Code and opencode installations and SHALL exclude retired active `launcher.md` cards.

#### Scenario: harness inventories are projected
- **WHEN** either harness installation inventory is generated
- **THEN** it contains the renamed command bootstrap cards and does not require the retired launcher cards

### Requirement: rename coverage is verified
The command-card, wrapper, layout, doctor, and installation tests SHALL assert the command-bootstrap name and the explicit empty-bootstrap handoff.

#### Scenario: verification suites inspect the renamed contract
- **WHEN** the affected test suites are executed
- **THEN** they validate renamed cards, mirrored wrapper paths, projection contents, and the non-missing handoff for empty bootstraps
