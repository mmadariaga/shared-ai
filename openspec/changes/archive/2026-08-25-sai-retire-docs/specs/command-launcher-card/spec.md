## MODIFIED Requirements

### Requirement: Retire-docs has a shared harness-neutral bootstrap

The utility SHALL provide one intentionally empty, harness-neutral `command-bootstrap.md` card that both wrappers can select without duplicating command-specific behavior.

#### Scenario: Both harnesses project the same bootstrap

- **WHEN** Claude Code or opencode installs the retire-docs command surface
- **THEN** both harnesses SHALL receive the same empty command bootstrap card

### Requirement: The bootstrap is included in recursive projections

The retire-docs bootstrap SHALL be included in launcher inventory, installation, doctor, and recursive projection assertions for both harnesses.

#### Scenario: Installation includes the bootstrap

- **WHEN** the installer projects utility command cards
- **THEN** the retire-docs bootstrap SHALL be present at the expected harness-specific destination
