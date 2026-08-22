## ADDED Requirements

### Requirement: Checklist rows show effective model settings
The target checklist SHALL display each target's family-prefixed identity followed by a subdued effective setting in `provider/model (effort)` form. Claude Code SHALL use `model` and `effort`; OpenCode SHALL use `model` and `variant`, with the variant rendered in the parenthesized tuning position.

#### Scenario: OpenCode annotation uses variant
- **WHEN** an OpenCode target has `model: opencode-go/glm-5.2` and `variant: high`
- **THEN** its row SHALL include `opencode-go/glm-5.2 (high)` after the family-prefixed identity

#### Scenario: Claude annotation uses effort
- **WHEN** a Claude target has `model: sonnet` and `effort: medium`
- **THEN** its row SHALL include the provider-qualified model and `medium` in the parenthesized tuning position

### Requirement: Effective settings honor local precedence safely
The annotation reader SHALL read a valid project-local override before the installed or global source. Missing or malformed frontmatter SHALL produce an unavailable annotation without preventing the target from being selected.

#### Scenario: Local override wins
- **WHEN** both local and installed sources exist with different valid settings
- **THEN** the checklist SHALL display the local setting

#### Scenario: Missing or malformed source is safe
- **WHEN** neither source has valid model frontmatter
- **THEN** the checklist SHALL display an unavailable annotation and SHALL continue to accept the stable target identity
