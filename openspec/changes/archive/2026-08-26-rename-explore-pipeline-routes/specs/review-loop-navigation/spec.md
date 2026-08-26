## MODIFIED Requirements

### Requirement: Keep review navigation separate from route selection

The post-crystallization review loop SHALL remain a separate user-triggered path, while the crystallization close SHALL use the three-option Plan (unattended), Build (unattended), and Manual selector.

#### Scenario: crystallization does not start review

- **WHEN** a crystallization turn closes
- **THEN** the route selector is emitted without starting or replacing the review loop.
