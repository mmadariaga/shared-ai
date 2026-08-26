## MODIFIED Requirements

### Requirement: Localize selector presentation without localizing identities

The crystallization language gate SHALL localize the selector question, labels, and descriptions. It MUST keep `plan-unattended`, `build-unattended`, and `manual` machine-readable and non-localized, and MUST preserve English command literals.

#### Scenario: localized route presentation

- **WHEN** crystallization uses a non-English language
- **THEN** selector prose is localized while route identities and command literals remain unchanged.
