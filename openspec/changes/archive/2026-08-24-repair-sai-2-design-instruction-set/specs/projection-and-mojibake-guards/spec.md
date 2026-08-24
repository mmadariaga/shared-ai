## ADDED Requirements

### Requirement: Projection and mojibake guards SHALL detect source drift
The regression suite SHALL verify both Claude Code and opencode manifest projections and SHALL reject replacement-character mojibake in SAI Markdown.
#### Scenario: projection-and-mojibake-guards-run
- **WHEN** the projection and Markdown integrity guards run
- **THEN** stale manifest content or replacement-character corruption causes a test failure.
