## ADDED Requirements

### Requirement: The system SHALL support opencode-only model-tier variant wrappers for `sai-3-implement`

Opencode may offer additional wrappers for the same command at different model tiers using `-low` and `-high` suffixes. These variants exist only where the provider ecosystem justifies them and are not mirrored to other harnesses.

#### Scenario: User invokes sai-3-implement-low on opencode

- **WHEN** the user runs `/sai-3-implement-low <name>`
- **THEN** the system SHALL execute the same implementation workflow as `/sai-3-implement` using the cheaper model defined in the wrapper's frontmatter (`opencode-go/minimax-m3`)

#### Scenario: User invokes sai-3-implement-high on opencode

- **WHEN** the user runs `/sai-3-implement-high <name>`
- **THEN** the system SHALL execute the same implementation workflow as `/sai-3-implement` using the higher-reasoning model defined in the wrapper's frontmatter (`opencode-go/glm-5.2`)

#### Scenario: Model variants are not mirrored to other harnesses

- **WHEN** a new model-tier variant wrapper is created for opencode
- **THEN** the mirror discipline exception SHALL apply — the variant is not required to exist in `commands/claude/` or `commands/copilot/`; only the canonical wrapper (`sai-3-implement.md`) stays mirrored
