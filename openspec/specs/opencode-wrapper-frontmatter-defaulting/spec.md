## MODIFIED Requirements

### Requirement: Opencode wrappers SHALL omit explicit default variant declarations

When a wrapper uses the platform's default variant behavior, the frontmatter MUST omit `variant: default` to avoid redundant configuration.

#### Scenario: wrappers rely on implicit default variant
- **WHEN** `commands/opencode/sai-4-apply.md` and `commands/opencode/sai-pr.md` are defined with standard model configuration
- **THEN** their frontmatter includes `model` and omits `variant: default`
