# model-customizer-scope Specification

## Purpose
TBD - created by archiving change reorder-model-customizer. Update Purpose after archive.
## Requirements
### Requirement: Scope screen offers All first with Orchestrators label
The scope screen SHALL present exactly All, Workers, Agents, Orchestrators, Utilities in that order, and the Orchestrators choice SHALL resolve to the command family while Workers, Agents, and Utilities resolve to their matching families with stable family-prefixed identities preserved.

#### Scenario: User opens the scope screen
- **WHEN** the user reaches the customization scope screen
- **THEN** All appears first and choosing Orchestrators presents exactly the command targets with stable command identities

### Requirement: Individual scopes stay alphabetical with stable values
The implementation SHALL keep individual family scopes in alphabetical target order with unchanged stable values, so only the All position and the visible Commands-to-Orchestrators rename change the scope screen.

#### Scenario: User picks a single-family scope
- **WHEN** the user selects Workers, Agents, Orchestrators, or Utilities
- **THEN** the checklist contains exactly that family in alphabetical order with stable worker, agent, command, or utility values

